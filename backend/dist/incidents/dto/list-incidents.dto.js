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
exports.ListIncidentsDto = void 0;
const class_validator_1 = require("class-validator");
class ListIncidentsDto {
    status;
    priority;
}
exports.ListIncidentsDto = ListIncidentsDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)([
        'open',
        'assigned',
        'in_progress',
        'awaiting_info',
        'awaiting_vendor',
        'resolved',
        'closed',
        'reopened',
    ]),
    __metadata("design:type", String)
], ListIncidentsDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['critical', 'high', 'medium', 'low']),
    __metadata("design:type", String)
], ListIncidentsDto.prototype, "priority", void 0);
//# sourceMappingURL=list-incidents.dto.js.map