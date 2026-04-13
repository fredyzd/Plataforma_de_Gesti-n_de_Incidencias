"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const auth_service_1 = require("./auth.service");
const login_dto_1 = require("./dto/login.dto");
const refresh_dto_1 = require("./dto/refresh.dto");
const forgot_password_dto_1 = require("./dto/forgot-password.dto");
const reset_password_dto_1 = require("./dto/reset-password.dto");
const change_initial_password_dto_1 = require("./dto/change-initial-password.dto");
const jwt_auth_guard_1 = require("./guards/jwt-auth.guard");
const current_user_decorator_1 = require("./decorators/current-user.decorator");
let AuthController = class AuthController {
    authService;
    constructor(authService) {
        this.authService = authService;
    }
    async login(body, response, ip) {
        const result = await this.authService.login(body.email, body.password, ip);
        if ('tempToken' in result) {
            return {
                status: 'PASSWORD_CHANGE_REQUIRED',
                temp_token: result.tempToken,
            };
        }
        response.cookie('refresh_token', result.refreshToken, this.authService.getRefreshCookieOptions());
        return {
            access_token: result.accessToken,
            expires_in: result.expiresIn,
            user: result.user,
        };
    }
    async refresh(body, request, response, ip) {
        const cookieToken = request.cookies?.refresh_token ??
            undefined;
        const token = body.refresh_token ?? cookieToken ?? '';
        const result = await this.authService.refresh(token, ip);
        response.cookie('refresh_token', result.refreshToken, this.authService.getRefreshCookieOptions());
        return {
            access_token: result.accessToken,
            expires_in: result.expiresIn,
        };
    }
    async logout(body, request, response, ip) {
        const cookieToken = request.cookies?.refresh_token ??
            undefined;
        await this.authService.logout(body.refresh_token ?? cookieToken, ip);
        response.clearCookie('refresh_token', {
            ...this.authService.getRefreshCookieOptions(),
            maxAge: 0,
        });
        return { success: true };
    }
    getMe(user) {
        return {
            id: user.sub,
            email: user.email,
            role: user.role,
            session_id: user.sessionId,
            env: user.env,
        };
    }
    async forgotPassword(body, ip) {
        return this.authService.forgotPassword(body.email, ip);
    }
    async resetPassword(body, ip) {
        return this.authService.resetPassword(body.token, body.new_password, ip);
    }
    async changeInitialPassword(body, response, ip) {
        const result = await this.authService.changeInitialPassword(body.temp_token, body.new_password, ip);
        response.cookie('refresh_token', result.refreshToken, this.authService.getRefreshCookieOptions());
        return {
            access_token: result.accessToken,
            expires_in: result.expiresIn,
            user: result.user,
        };
    }
    getAuditLog(user) {
        if (user.role !== 'admin' && user.role !== 'supervisor') {
            return { message: 'Sin permisos para ver auditoría' };
        }
        return this.authService.getAuditLog();
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('login'),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 60000 } }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto, Object, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('refresh'),
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60000 } }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [refresh_dto_1.RefreshDto, Object, Object, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.Post)('logout'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)({ passthrough: true })),
    __param(3, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [refresh_dto_1.RefreshDto, Object, Object, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "getMe", null);
__decorate([
    (0, common_1.Post)('forgot-password'),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 60000 } }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [forgot_password_dto_1.ForgotPasswordDto, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "forgotPassword", null);
__decorate([
    (0, common_1.Post)('reset-password'),
    (0, throttler_1.Throttle)({ default: { limit: 5, ttl: 60000 } }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reset_password_dto_1.ResetPasswordDto, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resetPassword", null);
__decorate([
    (0, common_1.Post)('change-initial-password'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)({ passthrough: true })),
    __param(2, (0, common_1.Ip)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [change_initial_password_dto_1.ChangeInitialPasswordDto, Object, String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "changeInitialPassword", null);
__decorate([
    (0, common_1.Get)('audit-log'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "getAuditLog", null);
exports.AuthController = AuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map