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
exports.IncidentsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const incidents_service_1 = require("./incidents.service");
const create_incident_dto_1 = require("./dto/create-incident.dto");
const list_incidents_dto_1 = require("./dto/list-incidents.dto");
const update_incident_dto_1 = require("./dto/update-incident.dto");
const assign_incident_dto_1 = require("./dto/assign-incident.dto");
const change_status_dto_1 = require("./dto/change-status.dto");
const create_comment_dto_1 = require("./dto/create-comment.dto");
let IncidentsController = class IncidentsController {
    incidentsService;
    constructor(incidentsService) {
        this.incidentsService = incidentsService;
    }
    toAuthzUser(user) {
        return { id: user.sub, role: user.role, email: user.email };
    }
    listIncidents(user, query) {
        return this.incidentsService.listIncidents(this.toAuthzUser(user), query);
    }
    createIncident(user, body) {
        return this.incidentsService.createIncident(this.toAuthzUser(user), body);
    }
    getIncident(user, id) {
        return this.incidentsService.getIncidentById(this.toAuthzUser(user), id);
    }
    updateIncident(user, id, body) {
        return this.incidentsService.updateIncident(this.toAuthzUser(user), id, body);
    }
    assignIncident(user, id, body) {
        return this.incidentsService.assignIncident(this.toAuthzUser(user), id, body);
    }
    changeStatus(user, id, body) {
        return this.incidentsService.changeStatus(this.toAuthzUser(user), id, body);
    }
    getTracking(user, id) {
        return this.incidentsService.getTracking(this.toAuthzUser(user), id);
    }
    listComments(user, id) {
        return this.incidentsService.listComments(this.toAuthzUser(user), id);
    }
    addComment(user, id, body) {
        return this.incidentsService.addComment(this.toAuthzUser(user), id, body);
    }
};
exports.IncidentsController = IncidentsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, list_incidents_dto_1.ListIncidentsDto]),
    __metadata("design:returntype", void 0)
], IncidentsController.prototype, "listIncidents", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_incident_dto_1.CreateIncidentDto]),
    __metadata("design:returntype", void 0)
], IncidentsController.prototype, "createIncident", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], IncidentsController.prototype, "getIncident", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_incident_dto_1.UpdateIncidentDto]),
    __metadata("design:returntype", void 0)
], IncidentsController.prototype, "updateIncident", null);
__decorate([
    (0, common_1.Post)(':id/assign'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, assign_incident_dto_1.AssignIncidentDto]),
    __metadata("design:returntype", void 0)
], IncidentsController.prototype, "assignIncident", null);
__decorate([
    (0, common_1.Post)(':id/status'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, change_status_dto_1.ChangeStatusDto]),
    __metadata("design:returntype", void 0)
], IncidentsController.prototype, "changeStatus", null);
__decorate([
    (0, common_1.Get)(':id/tracking'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], IncidentsController.prototype, "getTracking", null);
__decorate([
    (0, common_1.Get)(':id/comments'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], IncidentsController.prototype, "listComments", null);
__decorate([
    (0, common_1.Post)(':id/comments'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, create_comment_dto_1.CreateCommentDto]),
    __metadata("design:returntype", void 0)
], IncidentsController.prototype, "addComment", null);
exports.IncidentsController = IncidentsController = __decorate([
    (0, common_1.Controller)('incidents'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [incidents_service_1.IncidentsService])
], IncidentsController);
//# sourceMappingURL=incidents.controller.js.map