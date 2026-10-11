/**
 * ProjectApp authorization-code grant repository port.
 * The persisted `token` column is a SHA-256 hex of the refresh secret.
 * Public records never include that hash.
 */

export interface ProjectOAuthGrantRecord {
  id: string;
  projectAppId: string;
  userId: string;
  scopeTenant: string;
  scopeId: string;
  scopes: string[] | null;
  expiresAt: Date;
  lastUsedAt: Date | null;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface CreateProjectOAuthGrantParams {
  projectAppId: string;
  userId: string;
  scopeTenant: string;
  scopeId: string;
  scopes?: string[] | null;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface RotateProjectOAuthGrantParams {
  id: string;
  tokenHash: string;
  expiresAt: Date;
  lastUsedAt: Date;
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface IProjectOAuthGrantRepository {
  createGrant(
    params: CreateProjectOAuthGrantParams,
    transaction?: unknown
  ): Promise<ProjectOAuthGrantRecord>;

  findActiveByTokenHash(
    tokenHash: string,
    transaction?: unknown
  ): Promise<ProjectOAuthGrantRecord | null>;

  rotateGrant(
    params: RotateProjectOAuthGrantParams,
    transaction?: unknown
  ): Promise<ProjectOAuthGrantRecord>;

  softDeleteGrant(id: string, transaction?: unknown): Promise<void>;
}
