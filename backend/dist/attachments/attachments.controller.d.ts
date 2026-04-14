import type { Response } from 'express';
import type { JwtAccessPayload } from '../auth/auth.types';
import { IncidentsService } from '../incidents/incidents.service';
import { AttachmentsService } from './attachments.service';
export declare class AttachmentsController {
    private readonly attachmentsService;
    private readonly incidentsService;
    constructor(attachmentsService: AttachmentsService, incidentsService: IncidentsService);
    private authzUser;
    listAttachments(user: JwtAccessPayload, incidentId: string): import("./attachments.types").AttachmentPublic[];
    uploadAttachment(user: JwtAccessPayload, incidentId: string, file: Express.Multer.File): import("./attachments.types").AttachmentPublic;
    downloadAttachment(user: JwtAccessPayload, incidentId: string, attachmentId: string, res: Response): void;
    deleteAttachment(user: JwtAccessPayload, incidentId: string, attachmentId: string): void;
}
