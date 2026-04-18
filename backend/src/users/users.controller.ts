import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtAccessPayload } from '../auth/auth.types';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const ADMIN_ROLES = new Set(['admin', 'supervisor']);

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  list(@CurrentUser() actor: JwtAccessPayload) {
    if (!ADMIN_ROLES.has(actor.role)) {
      throw new ForbiddenException('Solo administradores pueden listar usuarios');
    }
    return this.users.listUsers();
  }

  @Post()
  create(@CurrentUser() actor: JwtAccessPayload, @Body() dto: CreateUserDto) {
    if (actor.role !== 'admin') {
      throw new ForbiddenException('Solo administradores pueden crear usuarios');
    }
    return this.users.createUser(dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() actor: JwtAccessPayload,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    if (actor.role !== 'admin') {
      throw new ForbiddenException('Solo administradores pueden editar usuarios');
    }
    return this.users.updateUser(id, dto);
  }

  @Post(':id/reset-password')
  resetPassword(@CurrentUser() actor: JwtAccessPayload, @Param('id') id: string) {
    if (actor.role !== 'admin') {
      throw new ForbiddenException('Solo administradores pueden resetear contraseñas');
    }
    return this.users.resetPassword(id);
  }
}
