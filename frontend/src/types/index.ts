export type Role = 'reporter' | 'agent' | 'supervisor' | 'admin'

export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  role: Role
}

export type IncidentPriority = 'critical' | 'high' | 'medium' | 'low'
export type IncidentStatus =
  | 'open'
  | 'assigned'
  | 'in_progress'
  | 'awaiting_info'
  | 'awaiting_vendor'
  | 'resolved'
  | 'closed'
  | 'reopened'

export interface Incident {
  id: string
  ticketNumber: string
  title: string
  description: string
  priority: IncidentPriority
  status: IncidentStatus
  reporterId: string
  reporterEmail: string
  assigneeId: string | null
  version: number
  createdAt: string
  updatedAt: string
  resolvedAt: string | null
  closedAt: string | null
}

export interface TrackingEvent {
  id: string
  incidentId: string
  actorId: string
  eventType: string
  comment: string | null
  fieldChanged: string | null
  oldValue: string | null
  newValue: string | null
  createdAt: string
}

export interface Comment {
  id: string
  incidentId: string
  authorId: string
  body: string
  isInternal: boolean
  createdAt: string
}

export interface Attachment {
  id: string
  incidentId: string
  uploaderId: string
  originalName: string
  mimeType: string
  sizeBytes: number
  checksum: string
  createdAt: string
}
