import {
  CdmFindBy,
  type PermissionCdmInput,
  type ResourceCdmInput,
  type SyncProjectInput,
  type TagCdmInput,
} from '@grantjs/schema';

import { extractCdmSearchableFromMetadata } from '@/lib/search-document.lib';

import type {
  CdmProjectUserApiKeyInternal,
  CdmRoleTemplateInternal,
  CdmUserAssignmentInternal,
  CdmUserProvisionInternal,
} from './cdm-internal.types';
import { serializePermissionRefForCdmDocument } from './cdm-permission-document-ref.lib';

type AggregatedGrantGroup = {
  groupKey: string;
  groupName: string;
  groupDescription: string | null;
  grantGroupId: string;
  permissionKeys: Set<string>;
  tagKeys: string[];
  primaryGroupTagKey: string | null | undefined;
  searchable?: Record<string, unknown> | null;
};

function aggregateLinkedGrantGroups(
  roleTemplates: readonly CdmRoleTemplateInternal[],
  userAssignments: readonly CdmUserAssignmentInternal[]
): Map<string, AggregatedGrantGroup> {
  const byGrantId = new Map<string, AggregatedGrantGroup>();
  const mergeGroup = (lg: {
    grantGroupId: string;
    groupKey: string;
    groupName: string;
    groupDescription: string | null;
    permissionKeys: readonly string[];
    tagKeys: readonly string[];
    primaryGroupTagKey?: string | null;
    searchable?: Record<string, unknown> | null;
  }) => {
    let agg = byGrantId.get(lg.grantGroupId);
    if (!agg) {
      agg = {
        groupKey: lg.groupKey,
        groupName: lg.groupName,
        groupDescription: lg.groupDescription,
        grantGroupId: lg.grantGroupId,
        permissionKeys: new Set(lg.permissionKeys),
        tagKeys: [...lg.tagKeys],
        primaryGroupTagKey: lg.primaryGroupTagKey,
        searchable: lg.searchable,
      };
      byGrantId.set(lg.grantGroupId, agg);
    } else {
      for (const pk of lg.permissionKeys) {
        agg.permissionKeys.add(pk);
      }
      agg.tagKeys = [...new Set([...agg.tagKeys, ...lg.tagKeys])].sort();
      if (
        (agg.primaryGroupTagKey == null || agg.primaryGroupTagKey === '') &&
        lg.primaryGroupTagKey
      ) {
        agg.primaryGroupTagKey = lg.primaryGroupTagKey;
      }
    }
  };

  for (const rt of roleTemplates) {
    if (rt.linkedGrantGroup) mergeGroup(rt.linkedGrantGroup);
  }

  const roleLinkedGroupKeys = new Set([...byGrantId.values()].map((g) => g.groupKey));
  for (const ua of userAssignments) {
    for (const dg of ua.exportDocumentGroups ?? []) {
      if (roleLinkedGroupKeys.has(dg.groupKey)) continue;
      mergeGroup(dg);
      roleLinkedGroupKeys.add(dg.groupKey);
    }
  }

  return byGrantId;
}

function permissionKeyToGroupKeysFromGrantGroups(
  grantGroups: Map<string, AggregatedGrantGroup>
): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const g of grantGroups.values()) {
    for (const pk of g.permissionKeys) {
      let s = out.get(pk);
      if (!s) {
        s = new Set<string>();
        out.set(pk, s);
      }
      s.add(g.groupKey);
    }
  }
  return out;
}

/**
 * Maps handler export slices into the public {@link SyncProjectInput}
 * shape (roles, users, groups, resources, permissions, tags).
 * Shared by {@link ProjectExportService} and integration tests so the
 * mapping cannot drift.
 */
export function assembleExportedSyncProjectInput(params: {
  roleTemplates: readonly CdmRoleTemplateInternal[];
  userAssignments: readonly CdmUserAssignmentInternal[];
  projectUserApiKeys: readonly CdmProjectUserApiKeyInternal[];
  provisionedUsers: readonly CdmUserProvisionInternal[];
  resourcesSlice: readonly ResourceCdmInput[];
  permissionsSlice: readonly PermissionCdmInput[];
  tagsSlice: readonly TagCdmInput[];
}): Pick<SyncProjectInput, 'roles' | 'users' | 'groups' | 'resources' | 'permissions' | 'tags'> {
  const {
    roleTemplates,
    userAssignments,
    projectUserApiKeys,
    provisionedUsers,
    resourcesSlice,
    permissionsSlice,
    tagsSlice,
  } = params;

  const grantGroupsById = aggregateLinkedGrantGroups(roleTemplates, userAssignments);
  const permissionKeyToGroupKeys = permissionKeyToGroupKeysFromGrantGroups(grantGroupsById);

  const groups: SyncProjectInput['groups'] = [...grantGroupsById.values()]
    .map((g) => ({
      key: g.groupKey,
      name: g.groupName,
      description: g.groupDescription,
      permissions: [...g.permissionKeys].sort(),
      tags: [...new Set(g.tagKeys)].sort(),
      primaryTag: g.primaryGroupTagKey ?? null,
      searchable: g.searchable ?? null,
      metadata: { grantGroupId: g.grantGroupId },
    }))
    .sort((a, b) => a.key.localeCompare(b.key));

  const roles: SyncProjectInput['roles'] = roleTemplates.map((rt) => ({
    key: rt.externalKey,
    name: rt.name,
    description: rt.description ?? null,
    groups: rt.linkedGrantGroup ? [rt.linkedGrantGroup.groupKey] : [],
    permissions: (rt.permissionRefs ?? [])
      .map((r) => serializePermissionRefForCdmDocument(r))
      .filter((s): s is string => Boolean(s)),
    tags: rt.tagKeys ?? [],
    primaryTag: rt.primaryRoleTagKey ?? null,
    searchable: rt.searchable ?? extractCdmSearchableFromMetadata(rt.metadata ?? undefined),
    metadata: rt.metadata ?? null,
  }));

  const usersOut: SyncProjectInput['users'] = userAssignments.map((ua) => ({
    key: ua.userId
      ? { value: ua.userId, findBy: CdmFindBy.Id }
      : { value: ua.userKey ?? '', findBy: CdmFindBy.Key },
    name: ua.userKey ?? ua.userId ?? 'user',
    roles: ua.roleTemplateKeys ?? [],
    groups: ua.directGroupKeys ?? [],
    permissions: (ua.directPermissionRefs ?? [])
      .map((r) => serializePermissionRefForCdmDocument(r))
      .filter((s): s is string => Boolean(s)),
    tags: ua.tagKeys ?? [],
    primaryTag: ua.primaryUserTagKey ?? null,
    apiKeys: projectUserApiKeys
      .filter((k) =>
        ua.userId ? k.userId === ua.userId : ua.userKey != null && k.userKey === ua.userKey
      )
      .map((k) => ({
        key: k.externalKey ?? null,
        clientId: k.clientId ?? null,
        clientSecret: null,
        name: k.name ?? null,
        description: k.description ?? null,
        expiresAt:
          k.expiresAt == null
            ? undefined
            : k.expiresAt instanceof Date
              ? k.expiresAt
              : new Date(String(k.expiresAt)),
        metadata: k.metadata ?? null,
      })),
    metadata: ua.metadata ?? null,
    searchable: ua.searchable ?? extractCdmSearchableFromMetadata(ua.metadata ?? undefined),
  }));

  const assignedProvisionKeys = new Set(
    userAssignments.map((ua) => ua.userKey).filter((k): k is string => Boolean(k))
  );
  for (const p of provisionedUsers) {
    if (assignedProvisionKeys.has(p.externalKey)) continue;
    usersOut.push({
      key: { value: p.externalKey, findBy: CdmFindBy.Key },
      name: p.name,
      roles: [],
      groups: [],
      permissions: [],
      tags: [],
      primaryTag: null,
      apiKeys: [],
      metadata: p.metadata ?? null,
    });
  }

  const resources: SyncProjectInput['resources'] = resourcesSlice.map((r) => {
    const md = r.metadata as Record<string, unknown> | null | undefined;
    const fromFieldTags = Array.isArray(r.tags) ? r.tags : [];
    const fromMetaTags = (Array.isArray(md?.tags) ? (md.tags as string[]) : []) ?? [];
    const tags = fromFieldTags.length > 0 ? fromFieldTags : fromMetaTags;
    const primaryFromField =
      typeof r.primaryTag === 'string' && r.primaryTag.trim() !== '' ? r.primaryTag : null;
    const primaryFromMeta =
      (typeof md?.primaryTag === 'string' && md.primaryTag.trim() !== '' ? md.primaryTag : null) ??
      null;
    const primaryTag = primaryFromField ?? primaryFromMeta;
    return {
      ...r,
      tags,
      primaryTag,
    };
  });

  const permissions: SyncProjectInput['permissions'] = permissionsSlice.map((p) => {
    const md = p.metadata as Record<string, unknown> | null | undefined;
    const fromFieldTags = Array.isArray(p.tags) ? p.tags : [];
    const fromMetaTags = (Array.isArray(md?.tags) ? (md.tags as string[]) : []) ?? [];
    const tags = fromFieldTags.length > 0 ? fromFieldTags : fromMetaTags;
    const primaryFromField =
      typeof p.primaryTag === 'string' && p.primaryTag.trim() !== '' ? p.primaryTag : null;
    const primaryFromMeta =
      (typeof md?.primaryTag === 'string' && md.primaryTag.trim() !== '' ? md.primaryTag : null) ??
      null;
    const primaryTag = primaryFromField ?? primaryFromMeta;
    const pk = p.key?.trim() ?? '';
    const fromMetaGroups = (Array.isArray(md?.groups) ? (md.groups as string[]) : []) ?? [];
    const fromFieldGroups = Array.isArray(p.groups) ? p.groups : [];
    const fromGrantGroups = pk ? [...(permissionKeyToGroupKeys.get(pk) ?? [])] : [];
    const groupsMerged = Array.from(
      new Set([...fromFieldGroups, ...fromMetaGroups, ...fromGrantGroups])
    ).sort();
    return {
      ...p,
      groups: groupsMerged,
      tags,
      primaryTag,
    };
  });

  const tags = tagsSlice as SyncProjectInput['tags'];

  return { roles, users: usersOut, groups, resources, permissions, tags };
}
