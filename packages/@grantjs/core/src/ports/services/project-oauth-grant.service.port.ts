/**
 * ProjectApp grant service port. The plaintext refresh token is returned only
 * from create/rotate and is never persisted.
 */
import type { ProjectOAuthGrantRecord } from '../repositories/project-oauth-grant.repository.port';

export interface CreateProjectOAuthGrantInput {
  projectAppId: string;
  userId: string;
  scopeTenant: string;
  scopeId: string;
  scopes?: string[] | null;
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface ProjectOAuthGrantRotationMeta {
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface ProjectOAuthGrantIssued {
  grant: ProjectOAuthGrantRecord;
  refreshToken: string;
}

export interface IProjectOAuthGrantService {
  createGrant(
    params: CreateProjectOAuthGrantInput,
    transaction?: unknown
  ): Promise<ProjectOAuthGrantIssued>;

  rotateByRefreshToken(
    refreshToken: string,
    meta?: ProjectOAuthGrantRotationMeta,
    transaction?: unknown
  ): Promise<ProjectOAuthGrantIssued | null>;

  revokeGrant(id: string, transaction?: unknown): Promise<void>;

  revokeByRefreshToken(refreshToken: string, transaction?: unknown): Promise<boolean>;

  /**
   * Revoke every live grant of a user across one project's apps (a project password
   * reset, ADR 0011 § 6). Each revocation is audited like `revokeGrant`. Returns how many
   * grants went. Access tokens already issued live until they expire; only refresh is cut.
   */
  revokeAllForUserInProject(
    projectId: string,
    userId: string,
    transaction?: unknown
  ): Promise<number>;
}
