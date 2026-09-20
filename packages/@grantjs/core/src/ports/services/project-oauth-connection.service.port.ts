/**
 * Per-project GitHub/Google OAuth connection (BYO client) service port.
 */
import type { ProjectOAuthConnection, ProjectOAuthConnectionProvider } from '@grantjs/schema';

export interface ProjectOAuthConnectionCredentials {
  clientId: string;
  clientSecret: string;
}

export interface IProjectOAuthConnectionService {
  listByProject(projectId: string, transaction?: unknown): Promise<ProjectOAuthConnection[]>;

  upsert(
    params: {
      projectId: string;
      provider: ProjectOAuthConnectionProvider;
      clientId: string;
      clientSecret: string;
    },
    transaction?: unknown
  ): Promise<ProjectOAuthConnection>;

  clear(
    params: { projectId: string; provider: ProjectOAuthConnectionProvider },
    transaction?: unknown
  ): Promise<boolean>;

  /**
   * Decrypt the stored BYO secret for authorize/callback. Returns null when
   * this project has no live connection for the provider. Never log the result.
   */
  getDecryptedCredentials(
    projectId: string,
    provider: ProjectOAuthConnectionProvider,
    transaction?: unknown
  ): Promise<ProjectOAuthConnectionCredentials | null>;
}
