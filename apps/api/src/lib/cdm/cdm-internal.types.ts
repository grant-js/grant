/**
 * CDM shapes used only inside the API after expanding the public
 * {@link SyncProjectInput} contract. Handlers operate on these rows;
 * they are not exposed on the GraphQL boundary.
 */

export interface CdmPermissionRefInternal {
  resourceSlug?: string | null;
  action?: string | null;
  permissionKey?: string | null;
  permissionId?: string | null;
  condition?: unknown;
}

export interface CdmRoleTemplateInternal {
  externalKey: string;
  name: string;
  description: string | null;
  permissionRefs: CdmPermissionRefInternal[];
  metadata: Record<string, unknown> | null | undefined;
  tagKeys?: string[];
  primaryRoleTagKey?: string | null;
  groupTagKeys?: string[];
  primaryGroupTagKey?: string | null;
  /**
   * Grant group linked via `role_groups` (export-only). Drives `groups[]` and
   * `roles[].groups` in {@link assembleExportedSyncProjectInput}.
   */
  linkedGrantGroup?: {
    grantGroupId: string;
    groupKey: string;
    groupName: string;
    groupDescription: string | null;
    permissionKeys: readonly string[];
    tagKeys: readonly string[];
    primaryGroupTagKey?: string | null;
  };
  /**
   * Import-only: first `groups[].name` / description from the CDM document for
   * a role's linked group key(s), so {@link CdmEntityBuilder.createRoleWithGroup}
   * can create the paired Grant group with a human label instead of `CDM: {roleKey}`.
   */
  linkedGroupImportName?: string | null;
  linkedGroupImportDescription?: string | null;
  /** Import-only: CDM `roles[].groups` keys mapped to the paired Grant group. */
  linkedDocumentGroupKeys?: string[];
}

export interface CdmUserAssignmentInternal {
  userId?: string | null;
  userKey?: string | null;
  roleTemplateKeys?: string[];
  /** CDM document `users[].groups` keys → native `user_groups` on import. */
  directGroupKeys?: string[];
  /** Resolved permission refs per direct group key (computed during expand). */
  directGroups?: Array<{
    groupKey: string;
    permissionRefs: CdmPermissionRefInternal[];
  }>;
  directPermissionRefs?: CdmPermissionRefInternal[];
  metadata?: Record<string, unknown> | null;
  tagKeys?: string[];
  primaryUserTagKey?: string | null;
  /**
   * Export-only: document groups referenced via `directGroupKeys` that are
   * not already emitted through a role's `linkedGrantGroup`.
   */
  exportDocumentGroups?: NonNullable<CdmRoleTemplateInternal['linkedGrantGroup']>[];
}

export interface CdmProjectUserApiKeyInternal {
  externalKey?: string | null;
  userId?: string | null;
  userKey?: string | null;
  clientId?: string | null;
  clientSecret?: string | null;
  name?: string | null;
  description?: string | null;
  expiresAt?: string | Date | null;
  metadata?: Record<string, unknown> | null;
}

export interface CdmUserProvisionInternal {
  externalKey: string;
  name: string;
  metadata?: Record<string, unknown> | null;
}
