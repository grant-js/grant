import type {
  GroupCdmInput,
  PermissionCdmInput,
  ResourceCdmInput,
  RoleCdmInput,
  SyncProjectInput,
  TagCdmInput,
} from '@grantjs/schema';
import { CdmFindBy } from '@grantjs/schema';

import { ValidationError } from '@/lib/errors';
import { readCdmInputSearchable } from '@/lib/search-document.lib';

import type {
  CdmPermissionRefInternal,
  CdmProjectUserApiKeyInternal,
  CdmRoleTemplateInternal,
  CdmUserAssignmentInternal,
  CdmUserProvisionInternal,
} from './cdm-internal.types';
import {
  addPermissionRefDeduped,
  parseCdmPermissionDocumentString,
} from './cdm-permission-document-ref.lib';
import { isSyntheticCdmRoleKey } from './cdm-synthetic.lib';

/**
 * Handler pipeline input: canonical CDM document expanded into the slices
 * entity handlers expect (role templates, assignments, nested API keys, …).
 */
export interface ExpandedCdmSyncPayload {
  version: number;
  id: string | null;
  mode: SyncProjectInput['mode'];
  resources: ResourceCdmInput[];
  permissions: PermissionCdmInput[];
  tags: TagCdmInput[];
  groups: GroupCdmInput[];
  roleTemplates: CdmRoleTemplateInternal[];
  provisionedUsers: CdmUserProvisionInternal[];
  userAssignments: CdmUserAssignmentInternal[];
  projectUserApiKeys: CdmProjectUserApiKeyInternal[];
  warnings: string[];
}

/**
 * Expand the ubiquitous CDM document into handler-owned slices.
 */
export function expandCdmSyncInput(input: SyncProjectInput): ExpandedCdmSyncPayload {
  const version = input.version;
  const id = input.id ?? null;
  const mode = input.mode;
  const warnings: string[] = [];

  const permissionByKey = new Map<string, PermissionCdmInput>();
  for (const p of input.permissions ?? []) {
    const key = p.key?.trim() ?? '';
    if (key === '') continue;
    permissionByKey.set(key, { ...p });
  }
  const groupByKey = new Map((input.groups ?? []).map((g) => [g.key, g]));

  for (const g of input.groups ?? []) {
    for (const p of g.permissions ?? []) {
      if (!permissionByKey.has(p)) continue;
      const perm = permissionByKey.get(p)!;
      const prev = perm.groups ?? [];
      perm.groups = Array.from(new Set([...prev, g.key]));
    }
  }

  const roleTemplates: CdmRoleTemplateInternal[] = (input.roles ?? []).map((role) => {
    const permissionRefs: CdmRoleTemplateInternal['permissionRefs'] = [];
    for (const p of role.permissions ?? []) {
      addPermissionRefDeduped(permissionRefs, parseCdmPermissionDocumentString(p, permissionByKey));
    }
    for (const gk of role.groups ?? []) {
      const g = groupByKey.get(gk);
      for (const gp of g?.permissions ?? []) {
        addPermissionRefDeduped(
          permissionRefs,
          parseCdmPermissionDocumentString(gp, permissionByKey)
        );
      }
      for (const [pk, p] of permissionByKey.entries()) {
        const groups = p.groups ?? [];
        if (groups.includes(gk)) {
          addPermissionRefDeduped(
            permissionRefs,
            parseCdmPermissionDocumentString(pk, permissionByKey)
          );
        }
      }
    }
    const linked = linkedGroupImportFields(role, groupByKey);
    const firstGroupKey = (role.groups ?? []).find(
      (k): k is string => typeof k === 'string' && k.length > 0
    );
    const groupSearchable =
      firstGroupKey != null
        ? readCdmInputSearchable(groupByKey.get(firstGroupKey)?.searchable)
        : null;
    return {
      externalKey: role.key,
      name: role.name,
      description: role.description ?? null,
      permissionRefs,
      metadata: role.metadata ?? null,
      searchable: readCdmInputSearchable(role.searchable),
      groupSearchable,
      tagKeys: role.tags ?? [],
      primaryRoleTagKey: role.primaryTag ?? null,
      groupTagKeys: linked.groupTagKeys,
      primaryGroupTagKey: linked.primaryGroupTagKey,
      linkedGroupImportName: linked.linkedGroupImportName,
      linkedGroupImportDescription: linked.linkedGroupImportDescription,
      linkedDocumentGroupKeys: (role.groups ?? []).filter(
        (k): k is string => typeof k === 'string' && k.length > 0
      ),
    };
  });

  const provisionedUsers: CdmUserProvisionInternal[] = [];
  const userAssignments: CdmUserAssignmentInternal[] = [];
  const projectUserApiKeys: CdmProjectUserApiKeyInternal[] = [];

  for (const u of input.users ?? []) {
    const resolver = u.key;
    const isId = resolver.findBy === CdmFindBy.Id;
    const isEmail = resolver.findBy === CdmFindBy.Email;
    const userKey = !isId ? normalizeUserKey(resolver.value, resolver.findBy) : null;
    const userId = isId ? resolver.value : null;

    if (userKey) {
      provisionedUsers.push({
        externalKey: userKey,
        findBy: isEmail ? 'email' : 'key',
        name: u.name,
        metadata: u.metadata ?? null,
        searchable: readCdmInputSearchable(u.searchable),
      });
    }

    const requestedDirectPermissionKeys = (u.permissions ?? []).filter(
      (k): k is string => typeof k === 'string' && k.length > 0
    );
    const directPermissionRefs: CdmUserAssignmentInternal['directPermissionRefs'] = [];
    for (const key of requestedDirectPermissionKeys) {
      addPermissionRefDeduped(
        directPermissionRefs,
        parseCdmPermissionDocumentString(key, permissionByKey)
      );
    }

    const rawRoleKeys = (u.roles ?? []).filter(
      (k): k is string => typeof k === 'string' && k.length > 0
    );
    const strippedSyntheticKeys = rawRoleKeys.filter((k) => isSyntheticCdmRoleKey(k));
    const roleTemplateKeys = rawRoleKeys.filter((k) => !isSyntheticCdmRoleKey(k));
    if (strippedSyntheticKeys.length > 0) {
      const subject = userKey ?? userId ?? 'unknown';
      warnings.push(
        `users[${subject}]: removed legacy synthetic role key(s) ${strippedSyntheticKeys.join(', ')}; use users.permissions for direct grants`
      );
    }

    const directGroupKeys = (u.groups ?? []).filter(
      (k): k is string => typeof k === 'string' && k.length > 0
    );
    const directGroups = directGroupKeys.map((groupKey) => ({
      groupKey,
      permissionRefs: collectDocumentGroupPermissionRefs(groupKey, groupByKey, permissionByKey),
    }));

    userAssignments.push({
      userId,
      userKey,
      roleTemplateKeys,
      directGroupKeys,
      directGroups,
      directPermissionRefs,
      tagKeys: u.tags ?? [],
      primaryUserTagKey: u.primaryTag ?? null,
      metadata: u.metadata ?? null,
      searchable: readCdmInputSearchable(u.searchable),
    });

    for (const apiKey of u.apiKeys ?? []) {
      projectUserApiKeys.push({
        externalKey: apiKey.key ?? null,
        userId,
        userKey,
        clientId: apiKey.clientId ?? null,
        clientSecret: apiKey.clientSecret ?? null,
        name: apiKey.name ?? null,
        description: apiKey.description ?? null,
        expiresAt: apiKey.expiresAt ?? null,
        metadata: apiKey.metadata ?? null,
      });
    }
  }

  const resources: ResourceCdmInput[] = (input.resources ?? []).map((r) => ({
    ...r,
    slug: r.slug ?? slugify(r.name),
  }));

  const permissions: PermissionCdmInput[] = Array.from(permissionByKey.values()).map((p) => ({
    ...p,
    metadata: {
      ...(typeof p.metadata === 'object' && p.metadata != null ? p.metadata : {}),
      groups: p.groups ?? [],
      tags: p.tags ?? [],
      primaryTag: p.primaryTag ?? null,
    },
  }));

  const tags: TagCdmInput[] = (input.tags ?? []).map((t) => ({ ...t }));

  return {
    version,
    id,
    mode,
    resources,
    permissions,
    tags,
    groups: input.groups ?? [],
    roleTemplates,
    provisionedUsers,
    userAssignments,
    projectUserApiKeys,
    warnings,
  };
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
}

function normalizeUserKey(value: string, findBy: CdmFindBy | null | undefined): string {
  if (findBy !== CdmFindBy.Email) {
    return value;
  }
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ValidationError(`users[${value}]: key.value must be a valid email`);
  }
  return email;
}

function collectDocumentGroupPermissionRefs(
  groupKey: string,
  groupByKey: Map<string, GroupCdmInput>,
  permissionByKey: Map<string, PermissionCdmInput>
): CdmPermissionRefInternal[] {
  const refs: CdmPermissionRefInternal[] = [];
  const g = groupByKey.get(groupKey);
  for (const gp of g?.permissions ?? []) {
    if (typeof gp === 'string' && gp.length > 0) {
      addPermissionRefDeduped(refs, parseCdmPermissionDocumentString(gp, permissionByKey));
    }
  }
  for (const [pk, p] of permissionByKey.entries()) {
    const groups = p.groups ?? [];
    if (groups.includes(groupKey)) {
      addPermissionRefDeduped(refs, parseCdmPermissionDocumentString(pk, permissionByKey));
    }
  }
  return refs;
}

function linkedGroupImportFields(
  role: RoleCdmInput,
  groupByKey: Map<string, GroupCdmInput>
): {
  groupTagKeys: string[];
  primaryGroupTagKey: string | null;
  linkedGroupImportName: string | null;
  linkedGroupImportDescription: string | null;
} {
  const groupKeys = (role.groups ?? []).filter(
    (k): k is string => typeof k === 'string' && k.length > 0
  );
  const tagKeySet = new Set<string>();
  let primaryGroupTagKey: string | null = null;
  let linkedGroupImportName: string | null = null;
  let linkedGroupImportDescription: string | null = null;

  for (let i = 0; i < groupKeys.length; i += 1) {
    const gk = groupKeys[i];
    const g = groupByKey.get(gk);
    if (!g) continue;
    for (const t of g.tags ?? []) {
      if (typeof t === 'string' && t.trim() !== '') tagKeySet.add(t.trim());
    }
    if (i === 0) {
      const n = g.name?.trim();
      linkedGroupImportName = n && n.length > 0 ? n : null;
      const d = g.description;
      linkedGroupImportDescription = typeof d === 'string' && d.trim() !== '' ? d.trim() : null;
      const pt = g.primaryTag;
      primaryGroupTagKey =
        typeof pt === 'string' && pt.trim() !== '' ? pt.trim() : primaryGroupTagKey;
    }
  }

  return {
    groupTagKeys: [...tagKeySet].sort(),
    primaryGroupTagKey,
    linkedGroupImportName,
    linkedGroupImportDescription,
  };
}
