import type { NotificationLogEntry, SendEmailOptions } from './notifications.types';
export declare class NotificationsService {
    private readonly logger;
    private readonly log;
    private transporter;
    private initialized;
    private getTransporter;
    private addToLog;
    sendEmail(options: SendEmailOptions): Promise<void>;
    queueEmail(options: SendEmailOptions): void;
    notifyIncidentCreated(params: {
        reporterEmail: string;
        ticketNumber: string;
        title: string;
        priority: string;
    }): void;
    notifyIncidentAssigned(params: {
        assigneeEmail: string;
        ticketNumber: string;
        title: string;
        assignedByEmail: string;
    }): void;
    notifyStatusChanged(params: {
        reporterEmail: string;
        ticketNumber: string;
        title: string;
        oldStatus: string;
        newStatus: string;
        comment?: string | null;
    }): void;
    notifyCommentAdded(params: {
        recipientEmail: string;
        ticketNumber: string;
        title: string;
        authorEmail: string;
        commentBody: string;
    }): void;
    notifyPasswordReset(params: {
        email: string;
        resetToken: string;
        env: string;
    }): void;
    getLog(): NotificationLogEntry[];
}
