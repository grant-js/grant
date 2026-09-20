/**
 * Per-project GitHub/Google OAuth connection repository port.
 * Ciphertext fields stay on the secret record; public DTOs never include them.
 */
import type { ProjectOAuthConnection, ProjectOAuthConnectionProvider } from '@grantjs/schema';

export interface ProjectOAuthConnectionSecretRecord {
  id: string;
  projectId: string;
  provider: string;
  clientId: string;
  encryptedSecret: string;
  secretIv: string;
  secretTag: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProjectOAuthConnectionRepository {
  listByProject(projectId: string, transaction?: unknown): Promise<ProjectOAuthConnection[]>;

  getSecretByProjectAndProvider(
    projectId: string,
    provider: ProjectOAuthConnectionProvider,
    transaction?: unknown
  ): Promise<ProjectOAuthConnectionSecretRecord | null>;

  upsertConnection(
    params: {
      projectId: string;
      provider: ProjectOAuthConnectionProvider;
      clientId: string;
      encryptedSecret: string;
      secretIv: string;
      secretTag: string;
    },
    transaction?: unknown
  ): Promise<ProjectOAuthConnection>;

  hardDeleteById(id: string, transaction?: unknown): Promise<void>;
}
