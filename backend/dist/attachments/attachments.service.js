"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttachmentsService = void 0;
const common_1 = require("@nestjs/common");
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const path_1 = require("path");
const crypto_2 = require("crypto");
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
let AttachmentsService = class AttachmentsService {
    records = new Map();
    storagePath;
    maxFileSizeBytes;
    constructor() {
        this.storagePath = (0, path_1.join)(process.cwd(), process.env.STORAGE_PATH ?? 'storage/attachments');
        const maxMb = Number(process.env.MAX_FILE_SIZE_MB ?? 10);
        this.maxFileSizeBytes = maxMb * 1024 * 1024;
        if (!(0, fs_1.existsSync)(this.storagePath)) {
            (0, fs_1.mkdirSync)(this.storagePath, { recursive: true });
        }
    }
    assertCanAccess(user, incidentReporterId) {
        if (AGENT_ROLES.has(user.role))
            return;
        if (user.id !== incidentReporterId) {
            throw new common_1.ForbiddenException('No tienes permisos para acceder a esta incidencia');
        }
    }
    sanitizeFilename(name) {
        return name
            .replace(/[^a-zA-Z0-9._\-\s]/g, '')
            .replace(/\s+/g, '_')
            .slice(0, 200);
    }
    computeChecksum(buffer) {
        return (0, crypto_1.createHash)('sha256').update(buffer).digest('hex');
    }
    toPublic(record) {
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
    upload(user, incidentId, incidentReporterId, file) {
        this.assertCanAccess(user, incidentReporterId);
        if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
            throw new common_1.BadRequestException(`Tipo de archivo no permitido: ${file.mimetype}`);
        }
        if (file.size > this.maxFileSizeBytes) {
            throw new common_1.BadRequestException(`El archivo supera el tamaño máximo permitido (${process.env.MAX_FILE_SIZE_MB ?? 10} MB)`);
        }
        const sanitized = this.sanitizeFilename(file.originalname);
        if (!sanitized) {
            throw new common_1.BadRequestException('Nombre de archivo inválido');
        }
        const checksum = this.computeChecksum(file.buffer);
        const storedName = (0, crypto_2.randomUUID)();
        const filePath = (0, path_1.join)(this.storagePath, storedName);
        (0, fs_1.writeFileSync)(filePath, file.buffer);
        const record = {
            id: (0, crypto_2.randomUUID)(),
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
    listByIncident(user, incidentId, incidentReporterId) {
        this.assertCanAccess(user, incidentReporterId);
        const result = [];
        for (const record of this.records.values()) {
            if (record.incidentId === incidentId && !record.deletedAt) {
                result.push(this.toPublic(record));
            }
        }
        return result;
    }
    getDownloadStream(user, incidentId, attachmentId, incidentReporterId) {
        this.assertCanAccess(user, incidentReporterId);
        const record = this.records.get(attachmentId);
        if (!record || record.incidentId !== incidentId || record.deletedAt) {
            throw new common_1.NotFoundException('Adjunto no encontrado');
        }
        const filePath = (0, path_1.join)(this.storagePath, record.storedName);
        if (!(0, fs_1.existsSync)(filePath)) {
            throw new common_1.NotFoundException('Archivo no encontrado en almacenamiento');
        }
        return {
            stream: (0, fs_1.createReadStream)(filePath),
            mimeType: record.mimeType,
            originalName: record.originalName,
            sizeBytes: record.sizeBytes,
        };
    }
    delete(user, incidentId, attachmentId, incidentReporterId) {
        if (!AGENT_ROLES.has(user.role) && user.id !== incidentReporterId) {
            throw new common_1.ForbiddenException('No tienes permisos para eliminar este adjunto');
        }
        const record = this.records.get(attachmentId);
        if (!record || record.incidentId !== incidentId || record.deletedAt) {
            throw new common_1.NotFoundException('Adjunto no encontrado');
        }
        const filePath = (0, path_1.join)(this.storagePath, record.storedName);
        if ((0, fs_1.existsSync)(filePath)) {
            try {
                (0, fs_1.unlinkSync)(filePath);
            }
            catch {
            }
        }
        record.deletedAt = new Date().toISOString();
    }
};
exports.AttachmentsService = AttachmentsService;
exports.AttachmentsService = AttachmentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], AttachmentsService);
//# sourceMappingURL=attachments.service.js.map