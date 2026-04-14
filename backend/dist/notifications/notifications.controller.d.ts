import type { JwtAccessPayload } from '../auth/auth.types';
import { NotificationsService } from './notifications.service';
export declare class NotificationsController {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    getLog(user: JwtAccessPayload): import("./notifications.types").NotificationLogEntry[];
}
