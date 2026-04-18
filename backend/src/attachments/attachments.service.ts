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
import type { AttachmentPublic } from './attachments.types';
import { DatabaseService } from '../database/database.service';

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

interface AttachmentRow {
  id: string;
  incident_id: string;
  uploaded_by: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  checksum_sha256: string | null;
  created_at: string;
}

@Injectable()
export class AttachmentsService {
  private readonly storagePath: string;
  private readonly maxFileSizeBytes: number;

  constructor(private readonly db: DatabaseService) {
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

  private toPublic(row: AttachmentRow): AttachmentPublic {
    return {
      id: row.id,
      incidentId: row.incident_id,
      uploaderId: row.uploaded_by,
      originalName: row.file_name,
      mimeType: row.mime_type,
      sizeBytes: row.file_size,
      checksum: row.checksum_sha256 ?? '',
      createdAt: row.created_at,
    };
  }

  async upload(
    user: AuthzUser,
    incidentId: string,
    incidentReporterId: string,
    file: Express.Multer.File,
  ): Promise<AttachmentPublic> {
    this.assertCanAccess(user, incidentReporterId);

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de archivo no permitido: ${file.mimetype}`,
      );
    }

    if (file.size > this.maxFileSizeBytes) {
      throw new BadRequestException(
        `El archivo supera el tamano maximo permitido (${process.env.MAX_FILE_SIZE_MB ?? 10} MB)`,
      );
    }

    const sanitized = this.sanitizeFilename(file.originalname);
    if (!sanitized) {
      throw new BadRequestException('Nombre de archivo invalido');
    }

    const checksum = this.computeChecksum(file.buffer);
    const storedName = randomUUID();
    const filePath = join(this.storagePath, storedName);
    writeFileSync(filePath, file.buffer);

    const { rows } = await this.db.query<AttachmentRow>(
      `
        INSERT INTO attachments (
          incident_id,
          uploaded_by,
          file_name,
          file_path,
          file_size,
          mime_type,
          checksum_sha256,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING id,
                  incident_id,
                  uploaded_by,
                  file_name,
                  file_path,
                  file_size,
                  mime_type,
                  checksum_sha256,
                  created_at
      `,
      [incidentId, user.id, sanitized, storedName, file.size, file.mimetype, checksum],
    );

    return this.toPublic(rows[0]);
  }

  async listByIncident(
    user: AuthzUser,
    incidentId: string,
    incidentReporterId: string,
  ): Promise<AttachmentPublic[]> {
    this.assertCanAccess(user, incidentReporterId);

    const { rows } = await this.db.query<AttachmentRow>(
      `
        SELECT id,
               incident_id,
               uploaded_by,
               file_name,
               file_path,
               file_size,
               mime_type,
               checksum_sha256,
               created_at
        FROM attachments
        WHERE incident_id = $1
        ORDER BY created_at ASC
      `,
      [incidentId],
    );

    return rows.map((row) => this.toPublic(row));
  }

  async getDownloadStream(
    user: AuthzUser,
    incidentId: string,
    attachmentId: string,
    incidentReporterId: string,
  ) {
    this.assertCanAccess(user, incidentReporterId);

    const { rows } = await this.db.query<AttachmentRow>(
      `
        SELECT id,
               incident_id,
               uploaded_by,
               file_name,
               file_path,
               file_size,
               mime_type,
               checksum_sha256,
               created_at
        FROM attachments
        WHERE id = $1 AND incident_id = $2
      `,
      [attachmentId, incidentId],
    );

    const record = rows[0];
    if (!record) {
      throw new NotFoundException('Adjunto no encontrado');
    }

    const filePath = join(this.storagePath, record.file_path);
    if (!existsSync(filePath)) {
      throw new NotFoundException('Archivo no encontrado en almacenamiento');
    }

    return {
      stream: createReadStream(filePath),
      mimeType: record.mime_type,
      originalName: record.file_name,
      sizeBytes: record.file_size,
    };
  }

  async delete(
    user: AuthzUser,
    incidentId: string,
    attachmentId: string,
    incidentReporterId: string,
  ): Promise<void> {
    if (!AGENT_ROLES.has(user.role) && user.id !== incidentReporterId) {
      throw new ForbiddenException(
        'No tienes permisos para eliminar este adjunto',
      );
    }

    const { rows } = await this.db.query<AttachmentRow>(
      `
        SELECT id,
               incident_id,
               uploaded_by,
               file_name,
               file_path,
               file_size,
               mime_type,
               checksum_sha256,
               created_at
        FROM attachments
        WHERE id = $1 AND incident_id = $2
      `,
      [attachmentId, incidentId],
    );

    const record = rows[0];
    if (!record) {
      throw new NotFoundException('Adjunto no encontrado');
    }

    const filePath = join(this.storagePath, record.file_path);
    if (existsSync(filePath)) {
      try {
        unlinkSync(filePath);
      } catch {
        // Ignore physical delete errors to avoid blocking DB cleanup.
      }
    }

    await this.db.query(
      'DELETE FROM attachments WHERE id = $1 AND incident_id = $2',
      [attachmentId, incidentId],
    );
  }
}
