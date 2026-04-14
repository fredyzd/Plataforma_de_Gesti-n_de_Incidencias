export interface AttachmentRecord {
    id: string;
    incidentId: string;
    uploaderId: string;
    originalName: string;
    storedName: string;
    mimeType: string;
    sizeBytes: number;
    checksum: string;
    createdAt: string;
    deletedAt: string | null;
}
export interface AttachmentPublic {
    id: string;
    incidentId: string;
    uploaderId: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    checksum: string;
    createdAt: string;
}
