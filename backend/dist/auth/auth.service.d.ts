import { JwtService } from '@nestjs/jwt';
import type { Role, UserRecord } from './auth.types';
import { NotificationsService } from '../notifications/notifications.service';
export interface AuthAuditEvent {
    event: string;
    userId: string | null;
    email: string | null;
    ip: string;
    timestamp: string;
    metadata?: Record<string, string>;
}
export declare class AuthService {
    private readonly jwtService;
    private readonly notifications;
    private readonly users;
    private readonly sessions;
    private readonly resetTokens;
    private readonly initialPasswordTokens;
    private readonly auditLog;
    constructor(jwtService: JwtService, notifications: NotificationsService);
    private seedUsers;
    private now;
    private envTag;
    private addMinutes;
    private addSeconds;
    private hash;
    private recordAuthEvent;
    private getUserByEmail;
    private getCookieSecure;
    getRefreshCookieOptions(): {
        httpOnly: boolean;
        secure: boolean;
        sameSite: "lax";
        path: string;
        maxAge: number;
    };
    login(email: string, password: string, ip: string): Promise<{
        passwordChangeRequired: boolean;
        tempToken: `${string}-${string}-${string}-${string}-${string}`;
    } | {
        user: {
            id: string;
            email: string;
            first_name: string;
            last_name: string;
            role: Role;
        };
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
        passwordChangeRequired: boolean;
        tempToken?: undefined;
    }>;
    private sanitizeUser;
    private issueSessionTokens;
    refresh(refreshToken: string, ip: string): Promise<{
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
    }>;
    logout(refreshToken: string | undefined, ip: string): Promise<{
        success: boolean;
    }>;
    forgotPassword(email: string, ip: string): Promise<Record<string, string>>;
    resetPassword(token: string, newPassword: string, ip: string): Promise<{
        success: boolean;
    }>;
    changeInitialPassword(tempToken: string, newPassword: string, ip: string): Promise<{
        user: {
            id: string;
            email: string;
            first_name: string;
            last_name: string;
            role: Role;
        };
        accessToken: string;
        refreshToken: string;
        expiresIn: number;
    }>;
    findUserById(userId: string): UserRecord | null;
    revokeAllSessionsForUser(userId: string): void;
    getAuditLog(): AuthAuditEvent[];
}
