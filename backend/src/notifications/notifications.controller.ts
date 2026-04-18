import { Body, Controller, ForbiddenException, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtAccessPayload } from '../auth/auth.types';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('log')
  getLog(@CurrentUser() user: JwtAccessPayload) {
    if (user.role !== 'admin' && user.role !== 'supervisor') {
      throw new ForbiddenException('Acceso restringido');
    }
    return this.notificationsService.getLog();
  }

  @Get('config')
  getConfig(@CurrentUser() user: JwtAccessPayload) {
    if (user.role !== 'admin' && user.role !== 'supervisor') {
      throw new ForbiddenException('Acceso restringido');
    }
    return this.notificationsService.getSmtpStatus();
  }

  @Post('test')
  async sendTest(@CurrentUser() user: JwtAccessPayload, @Body() body: { to?: string }) {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Solo administradores pueden enviar emails de prueba');
    }
    const to = body.to ?? user.email;
    await this.notificationsService.sendEmail({
      to,
      subject: '[PGI] Email de prueba',
      event: 'test',
      html: `<h2>Prueba de correo PGI</h2><p>Este es un email de prueba enviado desde la configuración del sistema.</p><hr><small>PGI — ${new Date().toISOString()}</small>`,
    });
    return { ok: true, sentTo: to };
  }
}
