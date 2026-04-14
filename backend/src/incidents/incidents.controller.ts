import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtAccessPayload } from '../auth/auth.types';
import { IncidentsService } from './incidents.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { ListIncidentsDto } from './dto/list-incidents.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { AssignIncidentDto } from './dto/assign-incident.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import type { AuthzUser } from './incidents.types';

@Controller('incidents')
@UseGuards(JwtAuthGuard)
export class IncidentsController {
  constructor(private readonly incidentsService: IncidentsService) {}

  private toAuthzUser(user: JwtAccessPayload): AuthzUser {
    return { id: user.sub, role: user.role, email: user.email };
  }

  @Get()
  listIncidents(
    @CurrentUser() user: JwtAccessPayload,
    @Query() query: ListIncidentsDto,
  ) {
    return this.incidentsService.listIncidents(this.toAuthzUser(user), query);
  }

  @Post()
  createIncident(
    @CurrentUser() user: JwtAccessPayload,
    @Body() body: CreateIncidentDto,
  ) {
    return this.incidentsService.createIncident(this.toAuthzUser(user), body);
  }

  @Get(':id')
  getIncident(@CurrentUser() user: JwtAccessPayload, @Param('id') id: string) {
    return this.incidentsService.getIncidentById(this.toAuthzUser(user), id);
  }

  @Patch(':id')
  updateIncident(
    @CurrentUser() user: JwtAccessPayload,
    @Param('id') id: string,
    @Body() body: UpdateIncidentDto,
  ) {
    return this.incidentsService.updateIncident(
      this.toAuthzUser(user),
      id,
      body,
    );
  }

  @Post(':id/assign')
  assignIncident(
    @CurrentUser() user: JwtAccessPayload,
    @Param('id') id: string,
    @Body() body: AssignIncidentDto,
  ) {
    return this.incidentsService.assignIncident(
      this.toAuthzUser(user),
      id,
      body,
    );
  }

  @Post(':id/status')
  changeStatus(
    @CurrentUser() user: JwtAccessPayload,
    @Param('id') id: string,
    @Body() body: ChangeStatusDto,
  ) {
    return this.incidentsService.changeStatus(this.toAuthzUser(user), id, body);
  }

  @Get(':id/tracking')
  getTracking(@CurrentUser() user: JwtAccessPayload, @Param('id') id: string) {
    return this.incidentsService.getTracking(this.toAuthzUser(user), id);
  }

  @Get(':id/comments')
  listComments(@CurrentUser() user: JwtAccessPayload, @Param('id') id: string) {
    return this.incidentsService.listComments(this.toAuthzUser(user), id);
  }

  @Post(':id/comments')
  addComment(
    @CurrentUser() user: JwtAccessPayload,
    @Param('id') id: string,
    @Body() body: CreateCommentDto,
  ) {
    return this.incidentsService.addComment(this.toAuthzUser(user), id, body);
  }
}
