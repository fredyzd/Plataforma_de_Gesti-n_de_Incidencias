"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcrypt"));
const crypto_1 = require("crypto");
const auth_constants_1 = require("./auth.constants");
let AuthService = class AuthService {
    jwtService;
    users = new Map();
    sessions = new Map();
    resetTokens = new Map();
    initialPasswordTokens = new Map();
    auditLog = [];
    constructor(jwtService) {
        this.jwtService = jwtService;
        void this.seedUsers();
    }
    async seedUsers() {
        const defaultPassword = process.env.AUTH_DEFAULT_PASSWORD ?? 'ChangeMe123!';
        const adminPassword = process.env.AUTH_ADMIN_PASSWORD ?? 'AdminChange123!';
        const agentHash = await bcrypt.hash(defaultPassword, 10);
        const adminHash = await bcrypt.hash(adminPassword, 10);
        const baseUsers = [
            {
                id: (0, crypto_1.randomUUID)(),
                email: 'agent@pgi.local',
                firstName: 'Agente',
                lastName: 'QAS',
                role: 'agent',
                active: true,
                passwordHash: agentHash,
                forcePasswordChange: false,
                failedAttempts: 0,
                lockUntil: null,
            },
            {
                id: (0, crypto_1.randomUUID)(),
                email: 'reporter@pgi.local',
                firstName: 'Reporter',
                lastName: 'QAS',
                role: 'reporter',
                active: true,
                passwordHash: agentHash,
                forcePasswordChange: true,
                failedAttempts: 0,
                lockUntil: null,
            },
            {
                id: (0, crypto_1.randomUUID)(),
                email: 'admin@pgi.local',
                firstName: 'Admin',
                lastName: 'PGI',
                role: 'admin',
                active: true,
                passwordHash: adminHash,
                forcePasswordChange: false,
                failedAttempts: 0,
                lockUntil: null,
            },
        ];
        for (const user of baseUsers) {
            this.users.set(user.email.toLowerCase(), user);
        }
    }
    now() {
        return new Date();
    }
    envTag() {
        return process.env.APP_ENV ?? process.env.NODE_ENV ?? 'qas';
    }
    addMinutes(date, minutes) {
        return new Date(date.getTime() + minutes * 60_000);
    }
    addSeconds(date, seconds) {
        return new Date(date.getTime() + seconds * 1_000);
    }
    async hash(value) {
        return bcrypt.hash(value, 10);
    }
    recordAuthEvent(event, ip, email, userId, metadata) {
        this.auditLog.push({
            event,
            userId,
            email,
            ip,
            timestamp: this.now().toISOString(),
            metadata,
        });
        if (this.auditLog.length > 1000) {
            this.auditLog.shift();
        }
    }
    getUserByEmail(email) {
        return this.users.get(email.toLowerCase()) ?? null;
    }
    getCookieSecure() {
        const env = this.envTag().toLowerCase();
        return env === 'production';
    }
    getRefreshCookieOptions() {
        return {
            httpOnly: true,
            secure: this.getCookieSecure(),
            sameSite: 'lax',
            path: '/auth',
            maxAge: auth_constants_1.REFRESH_TOKEN_TTL_SECONDS * 1000,
        };
    }
    async login(email, password, ip) {
        const user = this.getUserByEmail(email);
        const now = this.now();
        if (!user || !user.active) {
            this.recordAuthEvent('login_failed', ip, email, null);
            throw new common_1.UnauthorizedException('Credenciales inválidas o sesión expirada');
        }
        if (user.lockUntil && user.lockUntil > now) {
            this.recordAuthEvent('login_locked', ip, user.email, user.id);
            throw new common_1.HttpException('Cuenta temporalmente bloqueada por intentos fallidos', common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        const matches = await bcrypt.compare(password, user.passwordHash);
        if (!matches) {
            user.failedAttempts += 1;
            if (user.failedAttempts >= auth_constants_1.LOGIN_MAX_ATTEMPTS) {
                user.lockUntil = this.addMinutes(now, auth_constants_1.LOGIN_LOCK_MINUTES);
            }
            this.recordAuthEvent('login_failed', ip, user.email, user.id, {
                failedAttempts: String(user.failedAttempts),
            });
            throw new common_1.UnauthorizedException('Credenciales inválidas o sesión expirada');
        }
        user.failedAttempts = 0;
        user.lockUntil = null;
        if (user.forcePasswordChange) {
            const tempToken = (0, crypto_1.randomUUID)();
            this.initialPasswordTokens.set(tempToken, {
                token: tempToken,
                userId: user.id,
                expiresAt: this.addMinutes(now, auth_constants_1.INITIAL_PASSWORD_TOKEN_TTL_MINUTES),
                usedAt: null,
            });
            this.recordAuthEvent('login_password_change_required', ip, user.email, user.id);
            return {
                passwordChangeRequired: true,
                tempToken,
            };
        }
        const tokens = await this.issueSessionTokens(user.id, user.email, user.role);
        this.recordAuthEvent('login_success', ip, user.email, user.id);
        return {
            passwordChangeRequired: false,
            ...tokens,
            user: this.sanitizeUser(user),
        };
    }
    sanitizeUser(user) {
        return {
            id: user.id,
            email: user.email,
            first_name: user.firstName,
            last_name: user.lastName,
            role: user.role,
        };
    }
    async issueSessionTokens(userId, email, role) {
        const now = this.now();
        const sessionId = (0, crypto_1.randomUUID)();
        const tokenId = (0, crypto_1.randomUUID)();
        const accessPayload = {
            sub: userId,
            email,
            role,
            sessionId,
            env: this.envTag(),
        };
        const refreshPayload = {
            sub: userId,
            sessionId,
            tokenId,
        };
        const accessToken = await this.jwtService.signAsync(accessPayload, {
            secret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
            expiresIn: auth_constants_1.ACCESS_TOKEN_TTL_SECONDS,
        });
        const refreshToken = await this.jwtService.signAsync(refreshPayload, {
            secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
            expiresIn: auth_constants_1.REFRESH_TOKEN_TTL_SECONDS,
        });
        this.sessions.set(sessionId, {
            sessionId,
            userId,
            refreshTokenHash: await this.hash(refreshToken),
            expiresAt: this.addSeconds(now, auth_constants_1.REFRESH_TOKEN_TTL_SECONDS),
            revokedAt: null,
        });
        return {
            accessToken,
            refreshToken,
            expiresIn: auth_constants_1.ACCESS_TOKEN_TTL_SECONDS,
        };
    }
    async refresh(refreshToken, ip) {
        if (!refreshToken) {
            throw new common_1.UnauthorizedException('Credenciales inválidas o sesión expirada');
        }
        let payload;
        try {
            payload = await this.jwtService.verifyAsync(refreshToken, {
                secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
            });
        }
        catch {
            throw new common_1.UnauthorizedException('Credenciales inválidas o sesión expirada');
        }
        const session = this.sessions.get(payload.sessionId);
        if (!session || session.revokedAt || session.expiresAt < this.now()) {
            throw new common_1.UnauthorizedException('Credenciales inválidas o sesión expirada');
        }
        const tokenMatches = await bcrypt.compare(refreshToken, session.refreshTokenHash);
        if (!tokenMatches) {
            this.revokeAllSessionsForUser(session.userId);
            this.recordAuthEvent('refresh_reuse_detected', ip, null, session.userId);
            throw new common_1.UnauthorizedException('Credenciales inválidas o sesión expirada');
        }
        const user = this.findUserById(session.userId);
        if (!user || !user.active) {
            throw new common_1.UnauthorizedException('Credenciales inválidas o sesión expirada');
        }
        const newTokenId = (0, crypto_1.randomUUID)();
        const newRefreshPayload = {
            sub: user.id,
            sessionId: session.sessionId,
            tokenId: newTokenId,
        };
        const accessPayload = {
            sub: user.id,
            email: user.email,
            role: user.role,
            sessionId: session.sessionId,
            env: this.envTag(),
        };
        const newAccessToken = await this.jwtService.signAsync(accessPayload, {
            secret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
            expiresIn: auth_constants_1.ACCESS_TOKEN_TTL_SECONDS,
        });
        const newRefreshToken = await this.jwtService.signAsync(newRefreshPayload, {
            secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
            expiresIn: auth_constants_1.REFRESH_TOKEN_TTL_SECONDS,
        });
        session.refreshTokenHash = await this.hash(newRefreshToken);
        session.expiresAt = this.addSeconds(this.now(), auth_constants_1.REFRESH_TOKEN_TTL_SECONDS);
        this.recordAuthEvent('refresh_success', ip, user.email, user.id);
        return {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            expiresIn: auth_constants_1.ACCESS_TOKEN_TTL_SECONDS,
        };
    }
    async logout(refreshToken, ip) {
        if (refreshToken) {
            try {
                const payload = await this.jwtService.verifyAsync(refreshToken, {
                    secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
                });
                const session = this.sessions.get(payload.sessionId);
                if (session) {
                    session.revokedAt = this.now();
                    this.recordAuthEvent('logout_success', ip, null, session.userId);
                }
            }
            catch {
                this.recordAuthEvent('logout_with_invalid_token', ip, null, null);
            }
        }
        return { success: true };
    }
    async forgotPassword(email, ip) {
        const user = this.getUserByEmail(email);
        if (!user || !user.active) {
            this.recordAuthEvent('forgot_password_requested', ip, email, null);
            return {
                message: 'Si el correo existe, se enviará un enlace de recuperación',
            };
        }
        const rawToken = `${(0, crypto_1.randomUUID)()}${(0, crypto_1.randomUUID)()}`.replace(/-/g, '');
        const resetRecord = {
            id: (0, crypto_1.randomUUID)(),
            userId: user.id,
            tokenHash: await this.hash(rawToken),
            expiresAt: this.addMinutes(this.now(), auth_constants_1.RESET_TOKEN_TTL_MINUTES),
            usedAt: null,
        };
        this.resetTokens.set(resetRecord.id, resetRecord);
        this.recordAuthEvent('forgot_password_requested', ip, user.email, user.id);
        const response = {
            message: 'Si el correo existe, se enviará un enlace de recuperación',
        };
        if (this.envTag() !== 'production') {
            response.dev_reset_token = rawToken;
        }
        return response;
    }
    async resetPassword(token, newPassword, ip) {
        const now = this.now();
        let foundResetToken = null;
        for (const resetRecord of this.resetTokens.values()) {
            if (resetRecord.usedAt || resetRecord.expiresAt < now) {
                continue;
            }
            const matches = await bcrypt.compare(token, resetRecord.tokenHash);
            if (matches) {
                foundResetToken = resetRecord;
                break;
            }
        }
        if (!foundResetToken) {
            throw new common_1.UnauthorizedException('Credenciales inválidas o sesión expirada');
        }
        const user = this.findUserById(foundResetToken.userId);
        if (!user) {
            throw new common_1.UnauthorizedException('Credenciales inválidas o sesión expirada');
        }
        user.passwordHash = await this.hash(newPassword);
        user.forcePasswordChange = false;
        foundResetToken.usedAt = now;
        this.revokeAllSessionsForUser(user.id);
        this.recordAuthEvent('password_reset_success', ip, user.email, user.id);
        return { success: true };
    }
    async changeInitialPassword(tempToken, newPassword, ip) {
        const tokenRecord = this.initialPasswordTokens.get(tempToken);
        if (!tokenRecord ||
            tokenRecord.usedAt ||
            tokenRecord.expiresAt < this.now()) {
            throw new common_1.UnauthorizedException('Credenciales inválidas o sesión expirada');
        }
        const user = this.findUserById(tokenRecord.userId);
        if (!user) {
            throw new common_1.UnauthorizedException('Credenciales inválidas o sesión expirada');
        }
        tokenRecord.usedAt = this.now();
        user.passwordHash = await this.hash(newPassword);
        user.forcePasswordChange = false;
        this.revokeAllSessionsForUser(user.id);
        const tokens = await this.issueSessionTokens(user.id, user.email, user.role);
        this.recordAuthEvent('initial_password_changed', ip, user.email, user.id);
        return {
            ...tokens,
            user: this.sanitizeUser(user),
        };
    }
    findUserById(userId) {
        for (const user of this.users.values()) {
            if (user.id === userId) {
                return user;
            }
        }
        return null;
    }
    revokeAllSessionsForUser(userId) {
        for (const session of this.sessions.values()) {
            if (session.userId === userId && !session.revokedAt) {
                session.revokedAt = this.now();
            }
        }
    }
    getAuditLog() {
        return this.auditLog;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map