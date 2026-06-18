import type {
  CdmExportContext,
  IApiKeyService,
  ICdmEntityHandler,
  IGroupPermissionService,
  IGroupService,
  IGroupTagService,
  IPermissionService,
  IProjectExportService,
  IProjectGroupService,
  IProjectPermissionService,
  IProjectResourceService,
  IProjectRolePermissionService,
  IProjectRoleService,
  IProjectTagService,
  IProjectUserApiKeyService,
  IProjectUserGroupService,
  IProjectUserPermissionService,
  IProjectUserService,
  IResourceService,
  IRoleGroupService,
  IRolePermissionService,
  IRoleService,
  IRoleTagService,
  ITagService,
  IUserAuthenticationMethodService,
  IUserGroupService,
  IUserPermissionService,
  IUserRepository,
  IUserRoleService,
  IUserService,
  IUserTagService,
} from '@grantjs/core';
import {
  CDM_EXPORT_SECTIONS,
  type CdmExportSection,
  type CdmHandlerInputKey,
  CdmModeStrategy,
  CdmOnConflict,
  Scope,
  SyncProjectInput,
  Tenant,
} from '@grantjs/schema';

import { assembleExportedSyncProjectInput, createDefaultCdmEntities } from '@/lib/cdm';
import type {
  CdmProjectUserApiKeyInternal,
  CdmRoleTemplateInternal,
  CdmUserAssignmentInternal,
  CdmUserProvisionInternal,
} from '@/lib/cdm/cdm-internal.types';
import { ValidationError } from '@/lib/errors';
import { Transaction } from '@/lib/transaction-manager.lib';
import type { ProjectExportRepository } from '@/repositories/project-export.repository';
import type { ProjectImportRepository } from '@/repositories/project-import.repository';

function exportHandlerIncluded(
  includeAll: boolean,
  include: Set<string>,
  key: CdmHandlerInputKey,
  includeUserApiKeys: boolean
): boolean {
  if (key === 'projectUserApiKeys') {
    if (includeAll) return includeUserApiKeys;
    return include.has('users') && includeUserApiKeys;
  }
  if (includeAll) return true;
  switch (key) {
    case 'resources':
      return include.has('resources');
    case 'permissions':
      return include.has('permissions');
    case 'tags':
      return include.has('tags');
    case 'roleTemplates':
      return include.has('roles') || include.has('groups');
    case 'provisionedUsers':
    case 'userAssignments':
      return include.has('users');
    default:
      return false;
  }
}

export class ProjectExportService implements IProjectExportService {
  private readonly handlers: ReadonlyArray<ICdmEntityHandler>;
  private readonly exportRepo: ProjectExportRepository;

  constructor(
    importRepo: ProjectImportRepository,
    exportRepo: ProjectExportRepository,
    roles: IRoleService,
    groups: IGroupService,
    roleGroups: IRoleGroupService,
    rolePermissions: IRolePermissionService,
    groupPermissions: IGroupPermissionService,
    userPermissions: IUserPermissionService,
    userGroups: IUserGroupService,
    projectRoles: IProjectRoleService,
    projectGroups: IProjectGroupService,
    projectPermissions: IProjectPermissionService,
    projectRolePermissions: IProjectRolePermissionService,
    projectUserPermissions: IProjectUserPermissionService,
    projectUserGroups: IProjectUserGroupService,
    projectResources: IProjectResourceService,
    projectUsers: IProjectUserService,
    userRoles: IUserRoleService,
    apiKeys: IApiKeyService,
    projectUserApiKeys: IProjectUserApiKeyService,
    tags: ITagService,
    projectTags: IProjectTagService,
    roleTags: IRoleTagService,
    groupTags: IGroupTagService,
    userTags: IUserTagService,
    resources: IResourceService,
    permissions: IPermissionService,
    users: IUserService,
    userAuthenticationMethods: IUserAuthenticationMethodService,
    userRepository: IUserRepository,
    handlers?: ReadonlyArray<ICdmEntityHandler>
  ) {
    this.exportRepo = exportRepo;
    this.handlers =
      handlers ??
      createDefaultCdmEntities({
        importRepo,
        exportRepo,
        roles,
        groups,
        roleGroups,
        rolePermissions,
        groupPermissions,
        userPermissions,
        userGroups,
        projectRoles,
        projectGroups,
        projectPermissions,
        projectRolePermissions,
        projectUserPermissions,
        projectUserGroups,
        projectResources,
        projectUsers,
        userRoles,
        apiKeys,
        projectUserApiKeys,
        tags,
        projectTags,
        roleTags,
        groupTags,
        userTags,
        resources,
        permissions,
        users,
        userAuthenticationMethods,
        userRepository,
      });
  }

  public async exportProjectCdm(
    params: {
      projectId: string;
      scope: Scope;
      version?: number;
      cdmVersion?: number;
      sections?: readonly CdmExportSection[];
      /** Default true when omitted (sync rollback snapshot). */
      includeUserApiKeys?: boolean;
      mode?: {
        strategy: 'merge' | 'replace';
        onConflict?: 'fail' | 'skip' | 'update' | null;
        confirmDestructive?: boolean;
      };
    },
    transaction?: unknown
  ): Promise<SyncProjectInput> {
    this.assertProjectScope(params.scope);
    const scopeProjectId = this.projectIdFromScope(params.scope);
    if (scopeProjectId !== params.projectId) {
      throw new ValidationError(
        'scope id must contain the same projectId as the projectId argument'
      );
    }
    const version = params.version ?? params.cdmVersion ?? 1;
    if (version !== 1) {
      throw new ValidationError('Unsupported version; only 1 is allowed');
    }

    const tx = transaction as Transaction | undefined;

    const documentId = await this.exportRepo.getProjectNameForCdmDocument(params.projectId, tx);

    const exportCtx: CdmExportContext = {
      projectId: params.projectId,
      scope: params.scope,
      tx,
    };

    const modeStrategy =
      params.mode?.strategy === 'replace' ? CdmModeStrategy.Replace : CdmModeStrategy.Merge;
    const onConflict = this.resolveExportOnConflict(params.mode?.onConflict);

    const result: SyncProjectInput = {
      version,
      id: documentId,
      mode: {
        strategy: modeStrategy,
        onConflict,
        confirmDestructive: params.mode?.confirmDestructive ?? false,
      },
      roles: [],
      users: [],
      groups: [],
      tags: [],
      resources: [],
      permissions: [],
    };

    const includeAll = params.sections == null || params.sections.length === 0;
    const include = includeAll
      ? new Set<string>(CDM_EXPORT_SECTIONS)
      : new Set<string>(params.sections);

    const includeUserApiKeys = params.includeUserApiKeys ?? true;

    const slices: Partial<Record<CdmHandlerInputKey, readonly unknown[]>> = {};

    for (const handler of this.handlers) {
      if (!exportHandlerIncluded(includeAll, include, handler.inputKey, includeUserApiKeys)) {
        continue;
      }
      slices[handler.inputKey] = await handler.export(exportCtx);
    }

    const roleTemplates = (slices.roleTemplates ?? []) as readonly CdmRoleTemplateInternal[];
    const userAssignments = (slices.userAssignments ?? []) as readonly CdmUserAssignmentInternal[];
    const projectUserApiKeys = (slices.projectUserApiKeys ??
      []) as readonly CdmProjectUserApiKeyInternal[];
    const provisionedUsers = (slices.provisionedUsers ?? []) as readonly CdmUserProvisionInternal[];

    const assembled = assembleExportedSyncProjectInput({
      roleTemplates,
      userAssignments,
      projectUserApiKeys,
      provisionedUsers,
      resourcesSlice: (slices.resources ?? []) as NonNullable<SyncProjectInput['resources']>,
      permissionsSlice: (slices.permissions ?? []) as NonNullable<SyncProjectInput['permissions']>,
      tagsSlice: (slices.tags ?? []) as NonNullable<SyncProjectInput['tags']>,
    });
    result.roles = assembled.roles;
    result.users = assembled.users;
    result.groups = assembled.groups;
    result.resources = assembled.resources;
    result.permissions = assembled.permissions;
    result.tags = assembled.tags;

    return result;
  }

  private resolveExportOnConflict(
    value: 'fail' | 'skip' | 'update' | null | undefined
  ): CdmOnConflict | null {
    if (value == null) return null;
    if (value === 'fail') return CdmOnConflict.Fail;
    if (value === 'skip') return CdmOnConflict.Skip;
    if (value === 'update') return CdmOnConflict.Update;
    return null;
  }

  private assertProjectScope(scope: Scope): void {
    if (scope.tenant !== Tenant.AccountProject && scope.tenant !== Tenant.OrganizationProject) {
      throw new ValidationError(
        'exportProjectCdm requires accountProject or organizationProject scope'
      );
    }
  }

  private projectIdFromScope(scope: Scope): string {
    return scope.id.split(':')[1] ?? '';
  }
}
