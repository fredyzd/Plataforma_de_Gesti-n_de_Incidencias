import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangeInitialPasswordDto } from './dto/change-initial-password.dto';
import type { JwtAccessPayload } from './auth.types';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(body: LoginDto, response: Response, ip: string): Promise<{
        status: string;
        temp_token: `${string}-${string}-${string}-${string}-${string}` | undefined;
        access_token?: undefined;
        expires_in?: undefined;
        user?: undefined;
    } | {
        access_token: string;
        expires_in: number;
        user: {
            id: string;
            email: string;
            first_name: string;
            last_name: string;
            role: import("./auth.types").Role;
        };
        status?: undefined;
        temp_token?: undefined;
    }>;
    refresh(body: RefreshDto, request: Request, response: Response, ip: string): Promise<{
        access_token: string;
        expires_in: number;
    }>;
    logout(body: RefreshDto, request: Request, response: Response, ip: string): Promise<{
        success: boolean;
    }>;
    getMe(user: JwtAccessPayload): {
        id: string;
        email: string;
        role: import("./auth.types").Role;
        session_id: string;
        env: string;
    };
    forgotPassword(body: ForgotPasswordDto, ip: string): Promise<Record<string, string>>;
    resetPassword(body: ResetPasswordDto, ip: string): Promise<{
        success: boolean;
    }>;
    changeInitialPassword(body: ChangeInitialPasswordDto, response: Response, ip: string): Promise<{
        access_token: string;
        expires_in: number;
        user: {
            id: string;
            email: string;
            first_name: string;
            last_name: string;
            role: import("./auth.types").Role;
        };
    }>;
    getAuditLog(user: JwtAccessPayload): import("./auth.service").AuthAuditEvent[] | {
        message: string;
    };
}
