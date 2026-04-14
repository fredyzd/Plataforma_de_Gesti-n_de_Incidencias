import { Controller, ForbiddenException, Get, UseGuards } from '@nestjs/common';
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
}
