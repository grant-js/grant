import type {
  IApiKeyService,
  ICdmEntityHandler,
  IGroupPermissionService,
  IGroupService,
  IGroupTagService,
  IPermissionService,
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
  IUserGroupService,
  IUserPermissionService,
  IUserRepository,
  IUserRoleService,
  IUserService,
  IUserTagService,
} from '@grantjs/core';

import type { ProjectExportRepository } from '@/repositories/project-export.repository';
import type { ProjectImportRepository } from '@/repositories/project-import.repository';

import { CdmEntityBuilder } from './cdm-entity-builder';
import { PermissionCdmEntity } from './entities/permission.cdm-entity';
import { ProjectUserApiKeyCdmEntity } from './entities/project-user-api-key.cdm-entity';
import { ResourceCdmEntity } from './entities/resource.cdm-entity';
import { RoleTemplateCdmEntity } from './entities/role-template.cdm-entity';
import { TagCdmEntity } from './entities/tag.cdm-entity';
import { UserAssignmentCdmEntity } from './entities/user-assignment.cdm-entity';
import { UserProvisionCdmEntity } from './entities/user-provision.cdm-entity';

export interface CdmEntityRegistryDeps {
  importRepo: ProjectImportRepository;
  exportRepo: ProjectExportRepository;
  roles: IRoleService;
  groups: IGroupService;
  roleGroups: IRoleGroupService;
  rolePermissions: IRolePermissionService;
  groupPermissions: IGroupPermissionService;
  userPermissions: IUserPermissionService;
  userGroups: IUserGroupService;
  projectRoles: IProjectRoleService;
  projectGroups: IProjectGroupService;
  projectPermissions: IProjectPermissionService;
  projectRolePermissions: IProjectRolePermissionService;
  projectUserPermissions: IProjectUserPermissionService;
  projectUserGroups: IProjectUserGroupService;
  projectResources: IProjectResourceService;
  projectUsers: IProjectUserService;
  userRoles: IUserRoleService;
  apiKeys: IApiKeyService;
  projectUserApiKeys: IProjectUserApiKeyService;
  tags: ITagService;
  projectTags: IProjectTagService;
  roleTags: IRoleTagService;
  groupTags: IGroupTagService;
  userTags: IUserTagService;
  resources: IResourceService;
  permissions: IPermissionService;
  users: IUserService;
  userRepository: IUserRepository;
}

export function createDefaultCdmEntities(
  deps: CdmEntityRegistryDeps
): ReadonlyArray<ICdmEntityHandler> {
  const builder = new CdmEntityBuilder(
    deps.importRepo,
    deps.roles,
    deps.groups,
    deps.roleGroups,
    deps.groupPermissions,
    deps.rolePermissions,
    deps.userPermissions,
    deps.projectRoles,
    deps.projectGroups,
    deps.projectPermissions,
    deps.projectRolePermissions,
    deps.projectUserPermissions,
    deps.projectResources,
    deps.userRoles,
    deps.userGroups,
    deps.projectUserGroups
  );

  const entities: ICdmEntityHandler[] = [
    new ResourceCdmEntity(deps.importRepo, deps.exportRepo, deps.resources, deps.projectResources),
    new PermissionCdmEntity(
      deps.importRepo,
      deps.exportRepo,
      deps.permissions,
      deps.projectPermissions,
      deps.resources
    ),
    new TagCdmEntity(deps.importRepo, deps.exportRepo, deps.tags, deps.projectTags),
    new RoleTemplateCdmEntity(
      deps.importRepo,
      deps.exportRepo,
      builder,
      deps.roleTags,
      deps.groupTags
    ),
    new UserProvisionCdmEntity(deps.exportRepo, deps.users, deps.userRepository),
    new UserAssignmentCdmEntity(
      deps.exportRepo,
      builder,
      deps.projectUsers,
      deps.userRoles,
      deps.userTags
    ),
    new ProjectUserApiKeyCdmEntity(
      deps.importRepo,
      deps.exportRepo,
      deps.apiKeys,
      deps.projectUserApiKeys
    ),
  ];

  entities.sort((a, b) => a.order - b.order);
  return Object.freeze(entities);
}
