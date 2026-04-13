export type Role = 'reporter' | 'agent' | 'supervisor' | 'admin';

export interface UserRecord {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  active: boolean;
  passwordHash: string;
  forcePasswordChange: boolean;
  failedAttempts: number;
  lockUntil: Date | null;
}

export interface SessionRecord {
  sessionId: string;
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface PasswordResetRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
}

export interface InitialPasswordRecord {
  token: string;
  userId: string;
  expiresAt: Date;
  usedAt: Date | null;
}

export interface JwtAccessPayload {
  sub: string;
  email: string;
  role: Role;
  sessionId: string;
  env: string;
}

export interface JwtRefreshPayload {
  sub: string;
  sessionId: string;
  tokenId: string;
}

