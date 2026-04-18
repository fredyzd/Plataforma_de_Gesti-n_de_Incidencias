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
  JwtAccessPayload,
  JwtRefreshPayload,
  Role,
} from './auth.types';
import { NotificationsService } from '../notifications/notifications.service';
import { DatabaseService } from '../database/database.service';

export interface AuthAuditEvent {
  event: string;
  userId: string | null;
  email: string | null;
  ip: string;
  timestamp: string;
  metadata?: Record<string, string>;
}

interface DbUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Role;
  active: boolean;
  password_hash: string;
  force_password_change: boolean;
  failed_attempts: number;
  lock_until: string | null;
}

interface DbSession {
  session_id: string;
  user_id: string;
  refresh_token_hash: string;
  expires_at: string;
  revoked_at: string | null;
}

@Injectable()
export class AuthService {
  private readonly auditLog: AuthAuditEvent[] = [];

  constructor(
    private readonly jwtService: JwtService,
    private readonly notifications: NotificationsService,
    private readonly db: DatabaseService,
  ) {
    void this.seedUsers();
  }

  private async seedUsers() {
    const defaultPassword = process.env.AUTH_DEFAULT_PASSWORD ?? 'ChangeMe123!';
    const adminPassword = process.env.AUTH_ADMIN_PASSWORD ?? 'AdminChange123!';
    const agentHash = await bcrypt.hash(defaultPassword, 10);
    const adminHash = await bcrypt.hash(adminPassword, 10);

    const baseUsers = [
      {
        email: 'agent@pgi.local',
        firstName: 'Agente',
        lastName: 'QAS',
        role: 'agent' as Role,
        active: true,
        passwordHash: agentHash,
        forcePasswordChange: false,
      },
      {
        email: 'reporter@pgi.local',
        firstName: 'Reporter',
        lastName: 'QAS',
        role: 'reporter' as Role,
        active: true,
        passwordHash: agentHash,
        forcePasswordChange: true,
      },
      {
        email: 'admin@pgi.local',
        firstName: 'Admin',
        lastName: 'PGI',
        role: 'admin' as Role,
        active: true,
        passwordHash: adminHash,
        forcePasswordChange: false,
      },
    ];

    for (const user of baseUsers) {
      await this.db.query(
        `
          INSERT INTO users (
            id,
            email,
            password_hash,
            first_name,
            last_name,
            role,
            active,
            force_password_change
          )
          VALUES ($1, $2, $3, $4, $5, $6::user_role, $7, $8)
          ON CONFLICT (email) DO NOTHING
        `,
        [
          randomUUID(),
          user.email.toLowerCase(),
          user.passwordHash,
          user.firstName,
          user.lastName,
          user.role,
          user.active,
          user.forcePasswordChange,
        ],
      );
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

  private sanitizeUser(user: DbUser) {
    return {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
    };
  }

  private async getUserByEmail(email: string): Promise<DbUser | null> {
    const { rows } = await this.db.query<DbUser>(
      `
        SELECT id, email, first_name, last_name, role, active, password_hash,
               force_password_change, failed_attempts, lock_until
        FROM users
        WHERE email = $1
      `,
      [email.toLowerCase()],
    );

    return rows[0] ?? null;
  }

  private async findUserById(userId: string): Promise<DbUser | null> {
    const { rows } = await this.db.query<DbUser>(
      `
        SELECT id, email, first_name, last_name, role, active, password_hash,
               force_password_change, failed_attempts, lock_until
        FROM users
        WHERE id = $1
      `,
      [userId],
    );

    return rows[0] ?? null;
  }

  async login(email: string, password: string, ip: string) {
    const user = await this.getUserByEmail(email);
    const now = this.now();

    if (!user || !user.active) {
      this.recordAuthEvent('login_failed', ip, email, null);
      throw new UnauthorizedException(
        'Credenciales invalidas o sesion expirada',
      );
    }

    if (user.lock_until && new Date(user.lock_until) > now) {
      this.recordAuthEvent('login_locked', ip, user.email, user.id);
      throw new HttpException(
        'Cuenta temporalmente bloqueada por intentos fallidos',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const matches = await bcrypt.compare(password, user.password_hash);
    if (!matches) {
      const failedAttempts = user.failed_attempts + 1;
      const lockUntil =
        failedAttempts >= LOGIN_MAX_ATTEMPTS
          ? this.addMinutes(now, LOGIN_LOCK_MINUTES)
          : null;

      await this.db.query(
        `
          UPDATE users
          SET failed_attempts = $2,
              lock_until = $3,
              updated_at = NOW()
          WHERE id = $1
        `,
        [user.id, failedAttempts, lockUntil?.toISOString() ?? null],
      );

      this.recordAuthEvent('login_failed', ip, user.email, user.id, {
        failedAttempts: String(failedAttempts),
      });

      throw new UnauthorizedException(
        'Credenciales invalidas o sesion expirada',
      );
    }

    await this.db.query(
      `
        UPDATE users
        SET failed_attempts = 0,
            lock_until = NULL,
            last_login = NOW(),
            updated_at = NOW()
        WHERE id = $1
      `,
      [user.id],
    );

    if (user.force_password_change) {
      const tempToken = randomUUID();
      await this.db.query(
        `
          INSERT INTO initial_password_tokens (token, user_id, expires_at, used_at)
          VALUES ($1, $2, $3, NULL)
        `,
        [
          tempToken,
          user.id,
          this.addMinutes(now, INITIAL_PASSWORD_TOKEN_TTL_MINUTES).toISOString(),
        ],
      );

      this.recordAuthEvent(
        'login_password_change_required',
        ip,
        user.email,
        user.id,
      );
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

    await this.db.query(
      `
        INSERT INTO auth_sessions (
          session_id,
          user_id,
          refresh_token_hash,
          expires_at,
          revoked_at
        )
        VALUES ($1, $2, $3, $4, NULL)
      `,
      [
        sessionId,
        userId,
        await this.hash(refreshToken),
        this.addSeconds(now, REFRESH_TOKEN_TTL_SECONDS).toISOString(),
      ],
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    };
  }

  async refresh(refreshToken: string, ip: string) {
    if (!refreshToken) {
      throw new UnauthorizedException(
        'Credenciales invalidas o sesion expirada',
      );
    }

    let payload: JwtRefreshPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtRefreshPayload>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret',
      });
    } catch {
      throw new UnauthorizedException(
        'Credenciales invalidas o sesion expirada',
      );
    }

    const { rows } = await this.db.query<DbSession>(
      `
        SELECT session_id, user_id, refresh_token_hash, expires_at, revoked_at
        FROM auth_sessions
        WHERE session_id = $1
      `,
      [payload.sessionId],
    );

    const session = rows[0];
    if (!session || session.revoked_at || new Date(session.expires_at) < this.now()) {
      throw new UnauthorizedException(
        'Credenciales invalidas o sesion expirada',
      );
    }

    const tokenMatches = await bcrypt.compare(
      refreshToken,
      session.refresh_token_hash,
    );
    if (!tokenMatches) {
      await this.revokeAllSessionsForUser(session.user_id);
      this.recordAuthEvent('refresh_reuse_detected', ip, null, session.user_id);
      throw new UnauthorizedException(
        'Credenciales invalidas o sesion expirada',
      );
    }

    const user = await this.findUserById(session.user_id);
    if (!user || !user.active) {
      throw new UnauthorizedException(
        'Credenciales invalidas o sesion expirada',
      );
    }

    const newTokenId = randomUUID();
    const newRefreshPayload: JwtRefreshPayload = {
      sub: user.id,
      sessionId: session.session_id,
      tokenId: newTokenId,
    };

    const accessPayload: JwtAccessPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      sessionId: session.session_id,
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

    await this.db.query(
      `
        UPDATE auth_sessions
        SET refresh_token_hash = $2,
            expires_at = $3
        WHERE session_id = $1
      `,
      [
        session.session_id,
        await this.hash(newRefreshToken),
        this.addSeconds(this.now(), REFRESH_TOKEN_TTL_SECONDS).toISOString(),
      ],
    );

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
        await this.db.query(
          `
            UPDATE auth_sessions
            SET revoked_at = NOW()
            WHERE session_id = $1 AND revoked_at IS NULL
          `,
          [payload.sessionId],
        );

        const { rows } = await this.db.query<{ user_id: string }>(
          'SELECT user_id FROM auth_sessions WHERE session_id = $1',
          [payload.sessionId],
        );
        this.recordAuthEvent('logout_success', ip, null, rows[0]?.user_id ?? null);
      } catch {
        this.recordAuthEvent('logout_with_invalid_token', ip, null, null);
      }
    }

    return { success: true };
  }

  async forgotPassword(email: string, ip: string) {
    const user = await this.getUserByEmail(email);
    if (!user || !user.active) {
      this.recordAuthEvent('forgot_password_requested', ip, email, null);
      return {
        message: 'Si el correo existe, se enviara un enlace de recuperacion',
      };
    }

    const rawToken = `${randomUUID()}${randomUUID()}`.replace(/-/g, '');
    const resetId = randomUUID();

    await this.db.query(
      `
        INSERT INTO password_reset_tokens (
          id,
          user_id,
          token_hash,
          expires_at,
          used_at
        )
        VALUES ($1, $2, $3, $4, NULL)
      `,
      [
        resetId,
        user.id,
        await this.hash(rawToken),
        this.addMinutes(this.now(), RESET_TOKEN_TTL_MINUTES).toISOString(),
      ],
    );

    this.recordAuthEvent('forgot_password_requested', ip, user.email, user.id);

    this.notifications.notifyPasswordReset({
      email: user.email,
      resetToken: rawToken,
      env: this.envTag(),
    });

    const response: Record<string, string> = {
      message: 'Si el correo existe, se enviara un enlace de recuperacion',
    };

    if (this.envTag() !== 'production') {
      response.dev_reset_token = rawToken;
    }

    return response;
  }

  async resetPassword(token: string, newPassword: string, ip: string) {
    const now = this.now();
    const { rows } = await this.db.query<{
      id: string;
      user_id: string;
      token_hash: string;
      expires_at: string;
      used_at: string | null;
    }>(
      `
        SELECT id, user_id, token_hash, expires_at, used_at
        FROM password_reset_tokens
        WHERE used_at IS NULL AND expires_at >= NOW()
        ORDER BY created_at DESC
      `,
    );

    let found: { id: string; user_id: string } | null = null;
    for (const row of rows) {
      const matches = await bcrypt.compare(token, row.token_hash);
      if (matches) {
        found = { id: row.id, user_id: row.user_id };
        break;
      }
    }

    if (!found) {
      throw new UnauthorizedException(
        'Credenciales invalidas o sesion expirada',
      );
    }

    const user = await this.findUserById(found.user_id);
    if (!user) {
      throw new UnauthorizedException(
        'Credenciales invalidas o sesion expirada',
      );
    }

    await this.db.withTransaction(async (query) => {
      await query(
        `
          UPDATE users
          SET password_hash = $2,
              force_password_change = FALSE,
              updated_at = NOW()
          WHERE id = $1
        `,
        [user.id, await this.hash(newPassword)],
      );

      await query(
        `
          UPDATE password_reset_tokens
          SET used_at = $2
          WHERE id = $1
        `,
        [found.id, now.toISOString()],
      );

      await query(
        `
          UPDATE auth_sessions
          SET revoked_at = NOW()
          WHERE user_id = $1 AND revoked_at IS NULL
        `,
        [user.id],
      );
    });

    this.recordAuthEvent('password_reset_success', ip, user.email, user.id);
    return { success: true };
  }

  async changeInitialPassword(
    tempToken: string,
    newPassword: string,
    ip: string,
  ) {
    const { rows } = await this.db.query<{
      token: string;
      user_id: string;
      expires_at: string;
      used_at: string | null;
    }>(
      `
        SELECT token, user_id, expires_at, used_at
        FROM initial_password_tokens
        WHERE token = $1
      `,
      [tempToken],
    );

    const tokenRecord = rows[0];
    if (
      !tokenRecord ||
      tokenRecord.used_at ||
      new Date(tokenRecord.expires_at) < this.now()
    ) {
      throw new UnauthorizedException(
        'Credenciales invalidas o sesion expirada',
      );
    }

    const user = await this.findUserById(tokenRecord.user_id);
    if (!user) {
      throw new UnauthorizedException(
        'Credenciales invalidas o sesion expirada',
      );
    }

    await this.db.withTransaction(async (query) => {
      await query(
        `
          UPDATE initial_password_tokens
          SET used_at = NOW()
          WHERE token = $1
        `,
        [tempToken],
      );

      await query(
        `
          UPDATE users
          SET password_hash = $2,
              force_password_change = FALSE,
              updated_at = NOW()
          WHERE id = $1
        `,
        [user.id, await this.hash(newPassword)],
      );

      await query(
        `
          UPDATE auth_sessions
          SET revoked_at = NOW()
          WHERE user_id = $1 AND revoked_at IS NULL
        `,
        [user.id],
      );
    });

    const refreshedUser = await this.findUserById(user.id);
    const tokens = await this.issueSessionTokens(
      user.id,
      user.email,
      user.role,
    );
    this.recordAuthEvent('initial_password_changed', ip, user.email, user.id);

    return {
      ...tokens,
      user: this.sanitizeUser(refreshedUser ?? user),
    };
  }

  async revokeAllSessionsForUser(userId: string) {
    await this.db.query(
      `
        UPDATE auth_sessions
        SET revoked_at = NOW()
        WHERE user_id = $1 AND revoked_at IS NULL
      `,
      [userId],
    );
  }

  getAuditLog() {
    return this.auditLog;
  }

  async getProfile(userId: string) {
    const { rows } = await this.db.query<{
      id: string; email: string; first_name: string; last_name: string;
      role: string; department: string | null; phone: string | null;
      active: boolean; last_login: string | null; created_at: string;
    }>(
      `SELECT id, email, first_name, last_name, role, department, phone, active, last_login, created_at
       FROM users WHERE id = $1`,
      [userId],
    );
    const row = rows[0];
    if (!row) throw new UnauthorizedException('Usuario no encontrado');
    return {
      id: row.id,
      email: row.email,
      first_name: row.first_name,
      last_name: row.last_name,
      role: row.role,
      department: row.department,
      phone: row.phone,
      active: row.active,
      lastLogin: row.last_login,
      createdAt: row.created_at,
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string, ip: string) {
    if (!newPassword || newPassword.length < 8) {
      throw new HttpException('La nueva contraseña debe tener al menos 8 caracteres', HttpStatus.BAD_REQUEST);
    }

    const user = await this.findUserById(userId);
    if (!user) throw new UnauthorizedException('Usuario no encontrado');

    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) {
      this.recordAuthEvent('change_password_failed', ip, user.email, userId);
      throw new HttpException('Contraseña actual incorrecta', HttpStatus.BAD_REQUEST);
    }

    const newHash = await this.hash(newPassword);
    await this.db.query(
      `UPDATE users SET password_hash = $1, force_password_change = false, updated_at = NOW() WHERE id = $2`,
      [newHash, userId],
    );

    this.recordAuthEvent('change_password_success', ip, user.email, userId);
    return { success: true };
  }
}
