import type { JwtAccessPayload } from '../auth/auth.types';
import { IncidentsService } from './incidents.service';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { ListIncidentsDto } from './dto/list-incidents.dto';
import { UpdateIncidentDto } from './dto/update-incident.dto';
import { AssignIncidentDto } from './dto/assign-incident.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
export declare class IncidentsController {
    private readonly incidentsService;
    constructor(incidentsService: IncidentsService);
    private toAuthzUser;
    listIncidents(user: JwtAccessPayload, query: ListIncidentsDto): import("./incidents.types").IncidentRecord[];
    createIncident(user: JwtAccessPayload, body: CreateIncidentDto): import("./incidents.types").IncidentRecord;
    getIncident(user: JwtAccessPayload, id: string): import("./incidents.types").IncidentRecord;
    updateIncident(user: JwtAccessPayload, id: string, body: UpdateIncidentDto): import("./incidents.types").IncidentRecord;
    assignIncident(user: JwtAccessPayload, id: string, body: AssignIncidentDto): import("./incidents.types").IncidentRecord;
    changeStatus(user: JwtAccessPayload, id: string, body: ChangeStatusDto): import("./incidents.types").IncidentRecord;
    getTracking(user: JwtAccessPayload, id: string): import("./incidents.types").TrackingEventRecord[];
    listComments(user: JwtAccessPayload, id: string): import("./incidents.types").IncidentCommentRecord[];
    addComment(user: JwtAccessPayload, id: string, body: CreateCommentDto): import("./incidents.types").IncidentCommentRecord;
}
