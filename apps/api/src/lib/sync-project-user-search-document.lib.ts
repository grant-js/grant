import type { IProjectUserRepository, IUserRepository } from '@grantjs/core';

import { toMetadataRecord } from '@/lib/effective-project-user-metadata.lib';
import { Transaction } from '@/lib/transaction-manager.lib';

import {
  buildSearchDocument,
  CDM_SEARCHABLE_METADATA_KEY,
  mergeImporterMetadataWithSearchable,
} from './search-document.lib';

export interface SyncProjectUserSearchDocumentParams {
  projectId: string;
  userId: string;
  searchable?: Record<string, unknown> | null;
}

function readSearchableRecord(raw: unknown): Record<string, unknown> | null {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  return raw as Record<string, unknown>;
}

/**
 * Recomputes and persists `project_users.search_document` from CDM searchable,
 * pivot metadata, and global user identity fields.
 */
export async function syncProjectUserSearchDocument(
  projectUsers: IProjectUserRepository,
  users: IUserRepository,
  params: SyncProjectUserSearchDocumentParams,
  transaction?: Transaction
): Promise<void> {
  const rows = await projectUsers.getProjectUsers(
    { projectId: params.projectId, userId: params.userId },
    transaction
  );
  if (rows.length === 0) {
    return;
  }
  const pivot = rows[0];
  const userPage = await users.getUsers({ ids: [params.userId], limit: 1 }, transaction);
  const globalUser = userPage.users[0];

  const pivotMetadata = toMetadataRecord(pivot.metadata);
  const explicitSearchable =
    params.searchable ??
    readSearchableRecord(
      (pivotMetadata.cdmSource as Record<string, unknown> | undefined)?.[
        CDM_SEARCHABLE_METADATA_KEY
      ]
    );

  const searchDocument = buildSearchDocument({
    kind: 'user',
    name: pivot.displayName ?? globalUser?.name ?? undefined,
    displayName: pivot.displayName,
    globalUserName: globalUser?.name,
    searchable: explicitSearchable,
    metadata: pivotMetadata,
  });

  await projectUsers.updateProjectUserSearchDocument(
    {
      projectId: params.projectId,
      userId: params.userId,
      searchDocument,
    },
    transaction
  );
}

export function mergeUserAssignmentImporterMetadata(
  metadata: Record<string, unknown> | null | undefined,
  searchable: Record<string, unknown> | null | undefined
): Record<string, unknown> | null | undefined {
  return mergeImporterMetadataWithSearchable(metadata ?? undefined, searchable ?? undefined);
}
