export type NotificationStatus = 'sent' | 'failed' | 'skipped';
export interface NotificationLogEntry {
    id: string;
    to: string;
    subject: string;
    event: string;
    status: NotificationStatus;
    messageId: string | null;
    errorMessage: string | null;
    createdAt: string;
}
export interface SendEmailOptions {
    to: string;
    subject: string;
    html: string;
    event: string;
}
