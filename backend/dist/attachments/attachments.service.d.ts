import type { AttachmentPublic } from './attachments.types';
interface AuthzUser {
    id: string;
    role: string;
    email?: string;
}
export declare class AttachmentsService {
    private readonly records;
    private readonly storagePath;
    private readonly maxFileSizeBytes;
    constructor();
    private assertCanAccess;
    private sanitizeFilename;
    private computeChecksum;
    private toPublic;
    upload(user: AuthzUser, incidentId: string, incidentReporterId: string, file: Express.Multer.File): AttachmentPublic;
    listByIncident(user: AuthzUser, incidentId: string, incidentReporterId: string): AttachmentPublic[];
    getDownloadStream(user: AuthzUser, incidentId: string, attachmentId: string, incidentReporterId: string): {
        stream: import("fs").ReadStream;
        mimeType: string;
        originalName: string;
        sizeBytes: number;
    };
    delete(user: AuthzUser, incidentId: string, attachmentId: string, incidentReporterId: string): void;
}
export {};
