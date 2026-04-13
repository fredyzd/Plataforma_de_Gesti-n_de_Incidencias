import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  INITIAL_PASSWORD_TOKEN_TTL_MINUTES,
  LOGIN_LOCK_MINUTES,
  LOGIN_MAX_ATTEMPTS,
  REFRESH_TOKEN_TTL_SECONDS,
  RESET_TOKEN_TTL_MINUTES,
} from './auth.constants';
import type {
  InitialPasswordRecord,
  JwtAccessPayload,
  JwtRefreshPayload,
  PasswordResetRecord,
  Role,
  SessionRecord,
  UserRecord,
} from './auth.types';

export interface AuthAuditEvent {
  event: string;
  userId: string | null;
  email: string | null;
  ip: string;
  timestamp: string;
  metadata?: Record<string, string>;
}

@Injectable()
export class AuthService {
  private readonly users = new Map<string, UserRecord>();
  private readonly sessions = new Map<string, SessionRecord>();
  private readonly resetTokens = new Map<string, PasswordResetRecord>();
  private readonly initialPasswordTokens = new Map<string, InitialPasswordRecord>();
  private readonly auditLog: AuthAuditEvent[] = [];

  constructor(private readonly jwtService: JwtService) {
    void this.seedUsers();
  }

  private async seedUsers() {
    const defaultPassword = process.env.AUTH_DEFAULT_PASSWORD ?? 'ChangeMe123!';
    const adminPassword = process.env.AUTH_ADMIN_PASSWORD ?? 'AdminChange123!';
    const agentHash = await bcrypt.hash(defaultPassword, 10);
    const adminHash = await bcrypt.hash(adminPassword, 10);

    const baseUsers: UserRecord[] = [
      {
        id: randomUUID(),
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
        id: randomUUID(),
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
        id: randomUUID(),
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

  private now() {
    return new Date();
  }

  private envTag() {
    return process.env.APP_ENV ?? process.env.NODE_ENV ?? 'qas';
  }

  private addMinutes(date: Date, minutes: number) {
    return new Date(date.getTime() + minutes * 60_000);
  }

  private addSeconds(date: Date, seconds: number) {
    return new Date(date.getTime() + seconds * 1_000);
  }

  private async hash(value: string) {
    return bcrypt.hash(value, 10);
  }

  private recordAuthEvent(
    event: string,
    ip: string,
    email: string | null,
    userId: string | null,
    metadata?: Record<string, string>,
  ) {
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

  private getUserByEmail(email: string) {
    return this.users.get(email.toLowerCase()) ?? null;
  }

  private getCookieSecure() {
    const env = this.envTag().toLowerCase();
    return env === 'production';
  }

  getRefreshCookieOptions() {
    return {
      httpOnly: true,
      secure: this.getCookieSecure(),
      sameSite: 'lax' as const,
      path: '/auth',
      maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
    };
  }

  async login(email: string, password: string, ip: string) {
    const user = this.getUserByEmail(email);
    const now = this.now();

    if (!user || !user.active) {
      this.recordAuthEvent('login_failed', ip, email, null);
      throw new UnauthorizedException('Credenciales inválidas o sesión expirada');
    }

    if (user.lockUntil && user.lockUntil > now) {
      this.recordAuthEvent('login_locked', ip, user.email, user.id);
      throw new HttpException(
        'Cuenta temporalmente bloqueada por intentos fallidos',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      user.failedAttempts += 1;
      if (user.failedAttempts >= LOGIN_MAX_ATTEMPTS) {
        user.lockUntil = this.addMinutes(now, LOGIN_LOCK_MINUTES);
      }

      this.recordAuthEvent('login_failed', ip, user.email, user.id, {
        failedAttempts: String(user.failedAttempts),
      });

      throw new UnauthorizedException('Credenciales inválidas o sesión expirada');
    }

    user.failedAttempts = 0;
    user.lockUntil = null;

    if (user.forcePasswordChange) {
      const tempToken = randomUUID();
      this.initialPasswordTokens.set(tempToken, {
        token: tempToken,
        userId: user.id,
        expiresAt: this.addMinutes(now, INITIAL_PASSWORD_TOKEN_TTL_MINUTES),
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

  private sanitizeUser(user: UserRecord) {
    return {
      id: user.id,
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      role: user.role,
    };
  }

  private async issueSessionTokens(userId: string, email: string, role: Role) {
    const now = this.now();
    const sessionId = randomUUID();
    const tokenId = randomUUID();

    const accessPayload: JwtAccessPayload = {
      sub: userId,
      email,
      role,
      sessionId,
      env: this.envTag(),
    };

    const refreshPayload: JwtRefreshPayload = {
      sub: userId,
      sessionId,
      tokenId,
    };

    const accessToken = await this.jwtService.signAsync(accessPayload, {
      secret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    });

    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
      expiresIn: REFRESH_TOKEN_TTL_SECONDS,
    });

    this.sessions.set(sessionId, {
      sessionId,
      userId,
      refreshTokenHash: await this.hash(refreshToken),
      expiresAt: this.addSeconds(now, REFRESH_TOKEN_TTL_SECONDS),
      revokedAt: null,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    };
  }

  async refresh(refreshToken: string, ip: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Credenciales inválidas o sesión expirada');
    }

    let payload: JwtRefreshPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtRefreshPayload>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
      });
    } catch {
      throw new UnauthorizedException('Credenciales inválidas o sesión expirada');
    }

    const session = this.sessions.get(payload.sessionId);
    if (!session || session.revokedAt || session.expiresAt < this.now()) {
      throw new UnauthorizedException('Credenciales inválidas o sesión expirada');
    }

    const tokenMatches = await bcrypt.compare(refreshToken, session.refreshTokenHash);
    if (!tokenMatches) {
      this.revokeAllSessionsForUser(session.userId);
      this.recordAuthEvent('refresh_reuse_detected', ip, null, session.userId);
      throw new UnauthorizedException('Credenciales inválidas o sesión expirada');
    }

    const user = this.findUserById(session.userId);
    if (!user || !user.active) {
      throw new UnauthorizedException('Credenciales inválidas o sesión expirada');
    }

    const newTokenId = randomUUID();
    const newRefreshPayload: JwtRefreshPayload = {
      sub: user.id,
      sessionId: session.sessionId,
      tokenId: newTokenId,
    };

    const accessPayload: JwtAccessPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      sessionId: session.sessionId,
      env: this.envTag(),
    };

    const newAccessToken = await this.jwtService.signAsync(accessPayload, {
      secret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    });
    const newRefreshToken = await this.jwtService.signAsync(newRefreshPayload, {
      secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
      expiresIn: REFRESH_TOKEN_TTL_SECONDS,
    });

    session.refreshTokenHash = await this.hash(newRefreshToken);
    session.expiresAt = this.addSeconds(this.now(), REFRESH_TOKEN_TTL_SECONDS);

    this.recordAuthEvent('refresh_success', ip, user.email, user.id);
    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    };
  }

  async logout(refreshToken: string | undefined, ip: string) {
    if (refreshToken) {
      try {
        const payload = await this.jwtService.verifyAsync<JwtRefreshPayload>(
          refreshToken,
          {
            secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
          },
        );
        const session = this.sessions.get(payload.sessionId);
        if (session) {
          session.revokedAt = this.now();
          this.recordAuthEvent('logout_success', ip, null, session.userId);
        }
      } catch {
        this.recordAuthEvent('logout_with_invalid_token', ip, null, null);
      }
    }

    return { success: true };
  }

  async forgotPassword(email: string, ip: string) {
    const user = this.getUserByEmail(email);
    if (!user || !user.active) {
      this.recordAuthEvent('forgot_password_requested', ip, email, null);
      return {
        message: 'Si el correo existe, se enviará un enlace de recuperación',
      };
    }

    const rawToken = `${randomUUID()}${randomUUID()}`.replace(/-/g, '');
    const resetRecord: PasswordResetRecord = {
      id: randomUUID(),
      userId: user.id,
      tokenHash: await this.hash(rawToken),
      expiresAt: this.addMinutes(this.now(), RESET_TOKEN_TTL_MINUTES),
      usedAt: null,
    };
    this.resetTokens.set(resetRecord.id, resetRecord);

    this.recordAuthEvent('forgot_password_requested', ip, user.email, user.id);
    const response: Record<string, string> = {
      message: 'Si el correo existe, se enviará un enlace de recuperación',
    };

    if (this.envTag() !== 'production') {
      response.dev_reset_token = rawToken;
    }

    return response;
  }

  async resetPassword(token: string, newPassword: string, ip: string) {
    const now = this.now();
    let foundResetToken: PasswordResetRecord | null = null;

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
      throw new UnauthorizedException('Credenciales inválidas o sesión expirada');
    }

    const user = this.findUserById(foundResetToken.userId);
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas o sesión expirada');
    }

    user.passwordHash = await this.hash(newPassword);
    user.forcePasswordChange = false;
    foundResetToken.usedAt = now;
    this.revokeAllSessionsForUser(user.id);
    this.recordAuthEvent('password_reset_success', ip, user.email, user.id);

    return { success: true };
  }

  async changeInitialPassword(tempToken: string, newPassword: string, ip: string) {
    const tokenRecord = this.initialPasswordTokens.get(tempToken);
    if (
      !tokenRecord ||
      tokenRecord.usedAt ||
      tokenRecord.expiresAt < this.now()
    ) {
      throw new UnauthorizedException('Credenciales inválidas o sesión expirada');
    }

    const user = this.findUserById(tokenRecord.userId);
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas o sesión expirada');
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

  findUserById(userId: string) {
    for (const user of this.users.values()) {
      if (user.id === userId) {
        return user;
      }
    }
    return null;
  }

  revokeAllSessionsForUser(userId: string) {
    for (const session of this.sessions.values()) {
      if (session.userId === userId && !session.revokedAt) {
        session.revokedAt = this.now();
      }
    }
  }

  getAuditLog() {
    return this.auditLog;
  }
}
