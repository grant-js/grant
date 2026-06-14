/**
 * Shared CDM payloads and export inputs for project sync job tests.
 */
import { CdmFindBy, CdmModeStrategy, type SyncProjectInput } from '@grantjs/schema';

export const FIXTURE_PROJECT_ID = '00000000-0000-4000-8000-000000000011';
export const FIXTURE_ACCOUNT_ID = '00000000-0000-4000-8000-000000000020';
export const FIXTURE_JOB_ID = '40000000-0000-4000-8000-000000000077';

export const mergeMode: NonNullable<SyncProjectInput['mode']> = {
  strategy: CdmModeStrategy.Merge,
  onConflict: null,
  confirmDestructive: false,
};

export const replaceMode = (confirmDestructive = true): NonNullable<SyncProjectInput['mode']> => ({
  strategy: CdmModeStrategy.Replace,
  onConflict: null,
  confirmDestructive,
});

export function minimalCdm(overrides: Partial<SyncProjectInput> = {}): SyncProjectInput {
  return {
    version: 1,
    mode: mergeMode,
    roles: [],
    users: [],
    resources: [],
    permissions: [],
    groups: [],
    tags: [],
    ...overrides,
  };
}

/**
 * REST `startProjectSync` Zod schema accepts `id` as optional string only — not `null`.
 * GraphQL allows omitted/null `id`; use the raw `cdm` for GraphQL variables.
 */
export function cdmRestPayload(
  cdm: SyncProjectInput
): Omit<SyncProjectInput, 'id'> & { id?: string } {
  const { id, ...rest } = cdm;
  return id != null && id !== '' ? { ...rest, id } : rest;
}

/** Role templates require ≥1 permissionRef after expand (see RoleTemplateHandler.validateInput). */
function cdmRoleResourceBundle(roleKey: string, displayName: string) {
  const resourceKey = `${roleKey}-resource`;
  const permissionKey = `${roleKey}-read`;
  return {
    resources: [
      {
        key: resourceKey,
        slug: resourceKey,
        name: `${displayName} resource`,
        description: null,
        actions: ['read'],
        metadata: null,
      },
    ],
    permissions: [
      {
        key: permissionKey,
        resource: resourceKey,
        action: 'read',
        name: `${displayName}:read`,
        description: null,
        condition: null,
        metadata: null,
      },
    ],
    roles: [
      {
        key: roleKey,
        name: displayName,
        description: null,
        groups: [],
        permissions: [permissionKey],
        tags: [],
        primaryTag: null,
        metadata: null,
      },
    ],
  };
}

export function cdmWithRoleTemplate(
  roleKey = 'e2e-viewer',
  overrides: Partial<SyncProjectInput> = {}
): SyncProjectInput {
  return minimalCdm({
    ...cdmRoleResourceBundle(roleKey, 'E2E Viewer'),
    ...overrides,
  });
}

export function cdmWithCustomResourceAndPermission(): SyncProjectInput {
  return minimalCdm({
    resources: [
      {
        key: 'e2e-docs',
        slug: 'e2e-docs',
        name: 'E2E Docs',
        description: null,
        actions: ['read'],
        metadata: null,
      },
    ],
    permissions: [
      {
        key: 'e2e-docs-read',
        resource: 'e2e-docs',
        action: 'read',
        name: 'E2E Docs:read',
        description: null,
        condition: null,
        metadata: null,
      },
    ],
  });
}

export function replaceCdm(options?: {
  confirmDestructive?: boolean;
  roleKey?: string;
}): SyncProjectInput {
  const confirmDestructive = options?.confirmDestructive ?? true;
  const roleKey = options?.roleKey ?? 'replace-only-role';
  return {
    version: 1,
    id: 'replace-import-1',
    mode: replaceMode(confirmDestructive),
    users: [],
    groups: [],
    tags: [],
    ...cdmRoleResourceBundle(roleKey, 'Replace Only Role'),
  };
}

/** Rich CDM payload for replace-teardown E2E: multi-resource, tag, group, role, direct user groups. */
function richCdmEntityBundle(prefix: string, userId: string) {
  const tagKey = `${prefix}-tag`;
  const groupKey = `${prefix}-group`;
  const roleKey = `${prefix}-role`;
  const resourceKeys = Array.from({ length: 5 }, (_, i) => `${prefix}-res-${i}`);
  const permissionKeys = resourceKeys.map((_, i) => `${prefix}-perm-${i}`);

  const resources = resourceKeys.map((key, i) => ({
    key,
    slug: key,
    name: `Resource ${i}`,
    description: null,
    actions: ['read'],
    tags: i === 0 ? [tagKey] : [],
    primaryTag: i === 0 ? tagKey : null,
    metadata: null,
  }));

  const permissions = resourceKeys.map((resourceKey, i) => ({
    key: permissionKeys[i],
    resource: resourceKey,
    action: 'read',
    name: `${resourceKey}:read`,
    description: null,
    condition: null,
    groups: [],
    tags: [],
    primaryTag: null,
    metadata: null,
  }));

  return {
    tags: [
      {
        key: tagKey,
        name: tagKey,
        color: 'blue',
        metadata: null,
      },
    ],
    resources,
    permissions,
    groups: [
      {
        key: groupKey,
        name: `${prefix} Group`,
        description: null,
        permissions: [permissionKeys[0]!],
        tags: [],
        primaryTag: null,
        metadata: null,
      },
    ],
    roles: [
      {
        key: roleKey,
        name: `${prefix} Role`,
        description: null,
        groups: [],
        permissions: [permissionKeys[1]!],
        tags: [],
        primaryTag: null,
        metadata: null,
      },
    ],
    users: [
      {
        key: { value: userId, findBy: CdmFindBy.Id },
        name: 'Rich CDM User',
        roles: [],
        groups: [groupKey],
        permissions: [],
        tags: [],
        primaryTag: null,
        apiKeys: [],
        metadata: null,
      },
    ],
    tagKey,
    roleKey,
  };
}

export function richMergeCdm(prefix: string, userId: string): SyncProjectInput {
  const bundle = richCdmEntityBundle(prefix, userId);
  return {
    version: 1,
    id: null,
    mode: mergeMode,
    tags: bundle.tags,
    resources: bundle.resources,
    permissions: bundle.permissions,
    groups: bundle.groups,
    roles: bundle.roles,
    users: bundle.users,
  };
}

export function richReplaceCdm(prefix: string, userId: string): SyncProjectInput {
  const replacePrefix = `${prefix}-repl`;
  const bundle = richCdmEntityBundle(replacePrefix, userId);
  return {
    version: 1,
    id: `${prefix}-replace-import`,
    mode: replaceMode(true),
    tags: bundle.tags,
    resources: bundle.resources,
    permissions: bundle.permissions,
    groups: bundle.groups,
    roles: bundle.roles,
    users: bundle.users,
  };
}

/** Minimal CDM for direct user.groups → group → permission authorization E2E. */
export function cdmDirectGroupAuth(userId: string): SyncProjectInput {
  return minimalCdm({
    resources: [
      {
        key: 'docs',
        slug: 'docs',
        name: 'Docs',
        description: null,
        actions: ['read'],
        tags: [],
        primaryTag: null,
        metadata: null,
      },
    ],
    permissions: [
      {
        key: 'docs-read',
        resource: 'docs',
        action: 'read',
        name: 'Docs:read',
        description: null,
        condition: null,
        groups: [],
        tags: [],
        primaryTag: null,
        metadata: null,
      },
    ],
    groups: [
      {
        key: 'direct-group',
        name: 'Direct Group',
        description: null,
        permissions: ['docs-read'],
        tags: [],
        primaryTag: null,
        metadata: null,
      },
    ],
    users: [
      {
        key: { value: userId, findBy: CdmFindBy.Id },
        name: 'Direct Group User',
        roles: [],
        groups: ['direct-group'],
        permissions: [],
        tags: [],
        primaryTag: null,
        apiKeys: [],
        metadata: null,
      },
    ],
  });
}

export function invalidCdmMissingVersion(): Record<string, unknown> {
  return {
    mode: mergeMode,
    roles: [],
    users: [],
    resources: [],
    permissions: [],
    groups: [],
    tags: [],
  };
}

export function invalidCdmUnsupportedVersion(): SyncProjectInput {
  return { ...minimalCdm(), version: 2 };
}

export function invalidCdmDuplicateRoleKeys(): SyncProjectInput {
  return minimalCdm({
    roles: [
      {
        key: 'dup',
        name: 'Role A',
        description: null,
        groups: [],
        permissions: [],
        tags: [],
        primaryTag: null,
        metadata: null,
      },
      {
        key: 'dup',
        name: 'Role B',
        description: null,
        groups: [],
        permissions: [],
        tags: [],
        primaryTag: null,
        metadata: null,
      },
    ],
  });
}

export function cdmWithUserById(userId: string): SyncProjectInput {
  return cdmWithRoleTemplate('linked-viewer', {
    users: [
      {
        key: { value: userId, findBy: CdmFindBy.Id },
        name: 'Linked User',
        roles: ['linked-viewer'],
        groups: [],
        permissions: [],
        tags: [],
        primaryTag: null,
        apiKeys: [],
        metadata: null,
      },
    ],
  });
}

export interface ExportInputOptions {
  version?: number;
  jobName?: string;
  sections?: string[];
  includeUserApiKeys?: boolean;
  mode?: SyncProjectInput['mode'];
}

export function exportInput(options: ExportInputOptions = {}): {
  version: number;
  jobName?: string;
  sections?: string[];
  includeUserApiKeys?: boolean;
  mode?: SyncProjectInput['mode'];
} {
  return {
    version: options.version ?? 1,
    ...(options.jobName !== undefined ? { jobName: options.jobName } : {}),
    ...(options.sections !== undefined ? { sections: options.sections } : {}),
    ...(options.includeUserApiKeys !== undefined
      ? { includeUserApiKeys: options.includeUserApiKeys }
      : {}),
    ...(options.mode !== undefined ? { mode: options.mode } : {}),
  };
}

export function accountProjectScope(accountId: string, projectId: string) {
  return {
    tenant: 'accountProject' as const,
    id: `${accountId}:${projectId}`,
  };
}

export function organizationProjectScope(organizationId: string, projectId: string) {
  return {
    tenant: 'organizationProject' as const,
    id: `${organizationId}:${projectId}`,
  };
}
