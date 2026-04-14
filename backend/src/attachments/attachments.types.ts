export interface AttachmentRecord {
  id: string;
  incidentId: string;
  uploaderId: string;
  originalName: string;
  storedName: string; // UUID filename on disk
  mimeType: string;
  sizeBytes: number;
  checksum: string; // SHA-256 hex
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
