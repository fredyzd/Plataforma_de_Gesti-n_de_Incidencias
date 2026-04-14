import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { JwtAccessPayload } from '../auth/auth.types';
import { IncidentsService } from '../incidents/incidents.service';
import { AttachmentsService } from './attachments.service';
import { memoryStorage } from 'multer';

@Controller('incidents/:incidentId/attachments')
@UseGuards(JwtAuthGuard)
export class AttachmentsController {
  constructor(
    private readonly attachmentsService: AttachmentsService,
    private readonly incidentsService: IncidentsService,
  ) {}

  private authzUser(user: JwtAccessPayload) {
    return { id: user.sub, role: user.role, email: user.email };
  }

  @Get()
  listAttachments(
    @CurrentUser() user: JwtAccessPayload,
    @Param('incidentId') incidentId: string,
  ) {
    const authz = this.authzUser(user);
    const incident = this.incidentsService.getIncidentById(authz, incidentId);
    return this.attachmentsService.listByIncident(
      authz,
      incidentId,
      incident.reporterId,
    );
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  uploadAttachment(
    @CurrentUser() user: JwtAccessPayload,
    @Param('incidentId') incidentId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new NotFoundException('No se recibió ningún archivo');
    }
    const authz = this.authzUser(user);
    const incident = this.incidentsService.getIncidentById(authz, incidentId);
    return this.attachmentsService.upload(
      authz,
      incidentId,
      incident.reporterId,
      file,
    );
  }

  @Get(':attachmentId/download')
  downloadAttachment(
    @CurrentUser() user: JwtAccessPayload,
    @Param('incidentId') incidentId: string,
    @Param('attachmentId') attachmentId: string,
    @Res() res: Response,
  ) {
    const authz = this.authzUser(user);
    const incident = this.incidentsService.getIncidentById(authz, incidentId);
    const { stream, mimeType, originalName, sizeBytes } =
      this.attachmentsService.getDownloadStream(
        authz,
        incidentId,
        attachmentId,
        incident.reporterId,
      );

    const encoded = encodeURIComponent(originalName);
    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encoded}"; filename*=UTF-8''${encoded}`,
    );
    res.setHeader('Content-Length', sizeBytes);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    stream.pipe(res);
  }

  @Delete(':attachmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAttachment(
    @CurrentUser() user: JwtAccessPayload,
    @Param('incidentId') incidentId: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    const authz = this.authzUser(user);
    const incident = this.incidentsService.getIncidentById(authz, incidentId);
    this.attachmentsService.delete(
      authz,
      incidentId,
      attachmentId,
      incident.reporterId,
    );
  }
}
