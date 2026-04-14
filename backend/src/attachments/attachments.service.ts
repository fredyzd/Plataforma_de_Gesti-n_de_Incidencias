import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import {
  createReadStream,
  existsSync,
  mkdirSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import type { AttachmentPublic, AttachmentRecord } from './attachments.types';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
  'text/csv',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
]);

const AGENT_ROLES = new Set(['agent', 'supervisor', 'admin']);

interface AuthzUser {
  id: string;
  role: string;
  email?: string;
}

@Injectable()
export class AttachmentsService {
  private readonly records = new Map<string, AttachmentRecord>();
  private readonly storagePath: string;
  private readonly maxFileSizeBytes: number;

  constructor() {
    this.storagePath = join(
      process.cwd(),
      process.env.STORAGE_PATH ?? 'storage/attachments',
    );
    const maxMb = Number(process.env.MAX_FILE_SIZE_MB ?? 10);
    this.maxFileSizeBytes = maxMb * 1024 * 1024;

    if (!existsSync(this.storagePath)) {
      mkdirSync(this.storagePath, { recursive: true });
    }
  }

  private assertCanAccess(user: AuthzUser, incidentReporterId: string) {
    if (AGENT_ROLES.has(user.role)) return;
    if (user.id !== incidentReporterId) {
      throw new ForbiddenException(
        'No tienes permisos para acceder a esta incidencia',
      );
    }
  }

  private sanitizeFilename(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9._\-\s]/g, '')
      .replace(/\s+/g, '_')
      .slice(0, 200);
  }

  private computeChecksum(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  private toPublic(record: AttachmentRecord): AttachmentPublic {
    return {
      id: record.id,
      incidentId: record.incidentId,
      uploaderId: record.uploaderId,
      originalName: record.originalName,
      mimeType: record.mimeType,
      sizeBytes: record.sizeBytes,
      checksum: record.checksum,
      createdAt: record.createdAt,
    };
  }

  upload(
    user: AuthzUser,
    incidentId: string,
    incidentReporterId: string,
    file: Express.Multer.File,
  ): AttachmentPublic {
    this.assertCanAccess(user, incidentReporterId);

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de archivo no permitido: ${file.mimetype}`,
      );
    }

    if (file.size > this.maxFileSizeBytes) {
      throw new BadRequestException(
        `El archivo supera el tamaño máximo permitido (${process.env.MAX_FILE_SIZE_MB ?? 10} MB)`,
      );
    }

    const sanitized = this.sanitizeFilename(file.originalname);
    if (!sanitized) {
      throw new BadRequestException('Nombre de archivo inválido');
    }

    const checksum = this.computeChecksum(file.buffer);
    const storedName = randomUUID();
    const filePath = join(this.storagePath, storedName);
    writeFileSync(filePath, file.buffer);

    const record: AttachmentRecord = {
      id: randomUUID(),
      incidentId,
      uploaderId: user.id,
      originalName: sanitized,
      storedName,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      checksum,
      createdAt: new Date().toISOString(),
      deletedAt: null,
    };

    this.records.set(record.id, record);
    return this.toPublic(record);
  }

  listByIncident(
    user: AuthzUser,
    incidentId: string,
    incidentReporterId: string,
  ): AttachmentPublic[] {
    this.assertCanAccess(user, incidentReporterId);
    const result: AttachmentPublic[] = [];
    for (const record of this.records.values()) {
      if (record.incidentId === incidentId && !record.deletedAt) {
        result.push(this.toPublic(record));
      }
    }
    return result;
  }

  getDownloadStream(
    user: AuthzUser,
    incidentId: string,
    attachmentId: string,
    incidentReporterId: string,
  ) {
    this.assertCanAccess(user, incidentReporterId);

    const record = this.records.get(attachmentId);
    if (!record || record.incidentId !== incidentId || record.deletedAt) {
      throw new NotFoundException('Adjunto no encontrado');
    }

    const filePath = join(this.storagePath, record.storedName);
    if (!existsSync(filePath)) {
      throw new NotFoundException('Archivo no encontrado en almacenamiento');
    }

    return {
      stream: createReadStream(filePath),
      mimeType: record.mimeType,
      originalName: record.originalName,
      sizeBytes: record.sizeBytes,
    };
  }

  delete(
    user: AuthzUser,
    incidentId: string,
    attachmentId: string,
    incidentReporterId: string,
  ): void {
    if (!AGENT_ROLES.has(user.role) && user.id !== incidentReporterId) {
      throw new ForbiddenException(
        'No tienes permisos para eliminar este adjunto',
      );
    }

    const record = this.records.get(attachmentId);
    if (!record || record.incidentId !== incidentId || record.deletedAt) {
      throw new NotFoundException('Adjunto no encontrado');
    }

    const filePath = join(this.storagePath, record.storedName);
    if (existsSync(filePath)) {
      try {
        unlinkSync(filePath);
      } catch {
        // Log and continue — soft-delete still proceeds
      }
    }

    record.deletedAt = new Date().toISOString();
  }
}
