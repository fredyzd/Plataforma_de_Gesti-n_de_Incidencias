import {
  Body,
  Controller,
  Get,
  Ip,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangeInitialPasswordDto } from './dto/change-initial-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { JwtAccessPayload } from './auth.types';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) response: Response,
    @Ip() ip: string,
  ) {
    const result = await this.authService.login(body.email, body.password, ip);

    if ('tempToken' in result) {
      return {
        status: 'PASSWORD_CHANGE_REQUIRED',
        temp_token: result.tempToken,
      };
    }

    response.cookie(
      'refresh_token',
      result.refreshToken,
      this.authService.getRefreshCookieOptions(),
    );

    return {
      access_token: result.accessToken,
      expires_in: result.expiresIn,
      user: result.user,
    };
  }

  @Post('refresh')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async refresh(
    @Body() body: RefreshDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Ip() ip: string,
  ) {
    const cookieToken =
      (request.cookies as Record<string, string> | undefined)?.refresh_token ??
      undefined;
    const token = body.refresh_token ?? cookieToken ?? '';
    const result = await this.authService.refresh(token, ip);

    response.cookie(
      'refresh_token',
      result.refreshToken,
      this.authService.getRefreshCookieOptions(),
    );

    return {
      access_token: result.accessToken,
      expires_in: result.expiresIn,
    };
  }

  @Post('logout')
  async logout(
    @Body() body: RefreshDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Ip() ip: string,
  ) {
    const cookieToken =
      (request.cookies as Record<string, string> | undefined)?.refresh_token ??
      undefined;
    await this.authService.logout(body.refresh_token ?? cookieToken, ip);
    response.clearCookie('refresh_token', {
      ...this.authService.getRefreshCookieOptions(),
      maxAge: 0,
    });
    return { success: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: JwtAccessPayload) {
    return {
      id: user.sub,
      email: user.email,
      role: user.role,
      session_id: user.sessionId,
      env: user.env,
    };
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async forgotPassword(@Body() body: ForgotPasswordDto, @Ip() ip: string) {
    return this.authService.forgotPassword(body.email, ip);
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async resetPassword(@Body() body: ResetPasswordDto, @Ip() ip: string) {
    return this.authService.resetPassword(body.token, body.new_password, ip);
  }

  @Post('change-initial-password')
  async changeInitialPassword(
    @Body() body: ChangeInitialPasswordDto,
    @Res({ passthrough: true }) response: Response,
    @Ip() ip: string,
  ) {
    const result = await this.authService.changeInitialPassword(
      body.temp_token,
      body.new_password,
      ip,
    );

    response.cookie(
      'refresh_token',
      result.refreshToken,
      this.authService.getRefreshCookieOptions(),
    );

    return {
      access_token: result.accessToken,
      expires_in: result.expiresIn,
      user: result.user,
    };
  }

  @Get('audit-log')
  @UseGuards(JwtAuthGuard)
  getAuditLog(@CurrentUser() user: JwtAccessPayload) {
    if (user.role !== 'admin' && user.role !== 'supervisor') {
      return { message: 'Sin permisos para ver auditoría' };
    }

    return this.authService.getAuditLog();
  }
}
