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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttachmentsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const incidents_service_1 = require("../incidents/incidents.service");
const attachments_service_1 = require("./attachments.service");
const multer_1 = require("multer");
let AttachmentsController = class AttachmentsController {
    attachmentsService;
    incidentsService;
    constructor(attachmentsService, incidentsService) {
        this.attachmentsService = attachmentsService;
        this.incidentsService = incidentsService;
    }
    authzUser(user) {
        return { id: user.sub, role: user.role, email: user.email };
    }
    listAttachments(user, incidentId) {
        const authz = this.authzUser(user);
        const incident = this.incidentsService.getIncidentById(authz, incidentId);
        return this.attachmentsService.listByIncident(authz, incidentId, incident.reporterId);
    }
    uploadAttachment(user, incidentId, file) {
        if (!file) {
            throw new common_1.NotFoundException('No se recibió ningún archivo');
        }
        const authz = this.authzUser(user);
        const incident = this.incidentsService.getIncidentById(authz, incidentId);
        return this.attachmentsService.upload(authz, incidentId, incident.reporterId, file);
    }
    downloadAttachment(user, incidentId, attachmentId, res) {
        const authz = this.authzUser(user);
        const incident = this.incidentsService.getIncidentById(authz, incidentId);
        const { stream, mimeType, originalName, sizeBytes } = this.attachmentsService.getDownloadStream(authz, incidentId, attachmentId, incident.reporterId);
        const encoded = encodeURIComponent(originalName);
        res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${encoded}"; filename*=UTF-8''${encoded}`);
        res.setHeader('Content-Length', sizeBytes);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        stream.pipe(res);
    }
    deleteAttachment(user, incidentId, attachmentId) {
        const authz = this.authzUser(user);
        const incident = this.incidentsService.getIncidentById(authz, incidentId);
        this.attachmentsService.delete(authz, incidentId, attachmentId, incident.reporterId);
    }
};
exports.AttachmentsController = AttachmentsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('incidentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], AttachmentsController.prototype, "listAttachments", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.memoryStorage)(),
        limits: { fileSize: 10 * 1024 * 1024 },
    })),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('incidentId')),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], AttachmentsController.prototype, "uploadAttachment", null);
__decorate([
    (0, common_1.Get)(':attachmentId/download'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('incidentId')),
    __param(2, (0, common_1.Param)('attachmentId')),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object]),
    __metadata("design:returntype", void 0)
], AttachmentsController.prototype, "downloadAttachment", null);
__decorate([
    (0, common_1.Delete)(':attachmentId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('incidentId')),
    __param(2, (0, common_1.Param)('attachmentId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], AttachmentsController.prototype, "deleteAttachment", null);
exports.AttachmentsController = AttachmentsController = __decorate([
    (0, common_1.Controller)('incidents/:incidentId/attachments'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [attachments_service_1.AttachmentsService,
        incidents_service_1.IncidentsService])
], AttachmentsController);
//# sourceMappingURL=attachments.controller.js.map