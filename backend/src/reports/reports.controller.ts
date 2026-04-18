import { Controller, ForbiddenException, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtAccessPayload } from '../auth/auth.types';
import { ReportsService } from './reports.service';

const ALLOWED_ROLES = new Set(['agent', 'supervisor', 'admin']);

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  private assertAccess(user: JwtAccessPayload) {
    if (!ALLOWED_ROLES.has(user.role)) {
      throw new ForbiddenException('Acceso restringido a agentes y superiores');
    }
  }

  @Get('summary')
  async getSummary(@CurrentUser() user: JwtAccessPayload) {
    this.assertAccess(user);
    return this.reportsService.getSummary();
  }

  @Get('aging')
  async getAging(@CurrentUser() user: JwtAccessPayload) {
    this.assertAccess(user);
    return this.reportsService.getAging();
  }

  @Get('sla')
  async getSla(@CurrentUser() user: JwtAccessPayload) {
    this.assertAccess(user);
    return this.reportsService.getSlaDetail();
  }
}
