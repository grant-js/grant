import type {
  IAuditLogger,
  IProjectOAuthConnectionRepository,
  IProjectOAuthConnectionService,
  ISecretResolver,
  ProjectOAuthConnectionCredentials,
} from '@grantjs/core';
import { type ProjectOAuthConnection, ProjectOAuthConnectionProvider } from '@grantjs/schema';

import { ConfigurationError, NotFoundError } from '@/lib/errors';
import {
  decryptProjectOAuthConnectionSecret,
  encryptProjectOAuthConnectionSecret,
} from '@/lib/project-oauth-connection.lib';
import { Transaction } from '@/lib/transaction-manager.lib';
import { validateInput, validateOutput } from '@/services/common';

import {
  clearProjectOAuthConnectionParamsSchema,
  listProjectOAuthConnectionsParamsSchema,
  projectOAuthConnectionOutputSchema,
  upsertProjectOAuthConnectionParamsSchema,
} from './project-oauth-connections.schemas';

function auditValues(connection: ProjectOAuthConnection): Record<string, unknown> {
  return {
    id: connection.id,
    projectId: connection.projectId,
    provider: connection.provider,
    clientId: connection.clientId,
    isConfigured: connection.isConfigured,
  };
}

export class ProjectOAuthConnectionService implements IProjectOAuthConnectionService {
  constructor(
    private readonly connections: IProjectOAuthConnectionRepository,
    private readonly audit: IAuditLogger,
    private readonly secrets: ISecretResolver
  ) {}

  private async requireEncryptionKey(): Promise<string> {
    const encryptionKey = await this.secrets.resolve('PROJECT_OAUTH_CONNECTION_ENCRYPTION_KEY');
    if (!encryptionKey) {
      throw new ConfigurationError('PROJECT_OAUTH_CONNECTION_ENCRYPTION_KEY must be configured');
    }
    return encryptionKey;
  }

  async listByProject(
    projectId: string,
    transaction?: Transaction
  ): Promise<ProjectOAuthConnection[]> {
    const validated = validateInput(
      listProjectOAuthConnectionsParamsSchema,
      { projectId },
      'ProjectOAuthConnectionService.listByProject'
    );
    const rows = await this.connections.listByProject(validated.projectId, transaction);
    return rows.map((row) =>
      validateOutput(
        projectOAuthConnectionOutputSchema,
        row,
        'ProjectOAuthConnectionService.listByProject'
      )
    );
  }

  async upsert(
    params: {
      projectId: string;
      provider: ProjectOAuthConnectionProvider;
      clientId: string;
      clientSecret: string;
    },
    transaction?: Transaction
  ): Promise<ProjectOAuthConnection> {
    const validated = validateInput(
      upsertProjectOAuthConnectionParamsSchema,
      params,
      'ProjectOAuthConnectionService.upsert'
    );
    const encryptionKey = await this.requireEncryptionKey();
    const encrypted = encryptProjectOAuthConnectionSecret(validated.clientSecret, encryptionKey);
    const existing = await this.connections.getSecretByProjectAndProvider(
      validated.projectId,
      validated.provider,
      transaction
    );
    const result = await this.connections.upsertConnection(
      {
        projectId: validated.projectId,
        provider: validated.provider,
        clientId: validated.clientId,
        ...encrypted,
      },
      transaction
    );
    const output = validateOutput(
      projectOAuthConnectionOutputSchema,
      result,
      'ProjectOAuthConnectionService.upsert'
    );

    if (existing) {
      await this.audit.logUpdate(
        output.id,
        {
          id: existing.id,
          projectId: existing.projectId,
          provider: existing.provider,
          clientId: existing.clientId,
          isConfigured: true,
        },
        auditValues(output),
        { action: 'UPSERT_PROJECT_OAUTH_CONNECTION' },
        transaction
      );
    } else {
      await this.audit.logCreate(
        output.id,
        auditValues(output),
        { action: 'UPSERT_PROJECT_OAUTH_CONNECTION' },
        transaction
      );
    }

    return output;
  }

  async clear(
    params: { projectId: string; provider: ProjectOAuthConnectionProvider },
    transaction?: Transaction
  ): Promise<boolean> {
    const validated = validateInput(
      clearProjectOAuthConnectionParamsSchema,
      params,
      'ProjectOAuthConnectionService.clear'
    );
    const existing = await this.connections.getSecretByProjectAndProvider(
      validated.projectId,
      validated.provider,
      transaction
    );
    if (!existing) {
      throw new NotFoundError('ProjectOAuthConnection');
    }

    await this.connections.hardDeleteById(existing.id, transaction);
    await this.audit.logHardDelete(
      existing.id,
      {
        id: existing.id,
        projectId: existing.projectId,
        provider: existing.provider,
        clientId: existing.clientId,
        isConfigured: false,
      },
      { action: 'CLEAR_PROJECT_OAUTH_CONNECTION' },
      transaction
    );
    return true;
  }

  async getDecryptedCredentials(
    projectId: string,
    provider: ProjectOAuthConnectionProvider,
    transaction?: Transaction
  ): Promise<ProjectOAuthConnectionCredentials | null> {
    const validated = validateInput(
      clearProjectOAuthConnectionParamsSchema,
      { projectId, provider },
      'ProjectOAuthConnectionService.getDecryptedCredentials'
    );
    const row = await this.connections.getSecretByProjectAndProvider(
      validated.projectId,
      validated.provider,
      transaction
    );
    if (!row) {
      return null;
    }

    const encryptionKey = await this.requireEncryptionKey();
    try {
      const clientSecret = decryptProjectOAuthConnectionSecret({
        encryptedSecret: row.encryptedSecret,
        secretIv: row.secretIv,
        secretTag: row.secretTag,
        key: encryptionKey,
      });
      return { clientId: row.clientId, clientSecret };
    } catch {
      throw new ConfigurationError(
        'Failed to decrypt project OAuth connection secret; check PROJECT_OAUTH_CONNECTION_ENCRYPTION_KEY'
      );
    }
  }
}
