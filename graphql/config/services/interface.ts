import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import {
  IRoleService,
  IUserRoleService,
  IUserTagService,
  ITagService,
  IGroupService,
  IPermissionService,
  IProjectService,
  IOrganizationService,
  IGroupPermissionService,
  IOrganizationUserService,
  IOrganizationProjectService,
  IRoleGroupService,
  IOrganizationPermissionService,
  IOrganizationGroupService,
  IGroupTagService,
  IProjectRoleService,
  IProjectPermissionService,
  IProjectTagService,
  IProjectGroupService,
  IProjectUserService,
  IOrganizationRoleService,
  IOrganizationTagService,
  IRoleTagService,
  IPermissionTagService,
} from '@/graphql/services';
import { IUserService } from '@/graphql/services/users/interface';
import { AuthenticatedUser } from '@/graphql/types';

export interface ModuleServices {
  users: IUserService;
  roles: IRoleService;
  groups: IGroupService;
  permissions: IPermissionService;
  projects: IProjectService;
  organizations: IOrganizationService;
  tags: ITagService;
  userRoles: IUserRoleService;
  userTags: IUserTagService;
  groupPermissions: IGroupPermissionService;
  organizationUsers: IOrganizationUserService;
  organizationProjects: IOrganizationProjectService;
  roleGroups: IRoleGroupService;
  organizationPermissions: IOrganizationPermissionService;
  organizationGroups: IOrganizationGroupService;
  groupTags: IGroupTagService;
  projectRoles: IProjectRoleService;
  projectPermissions: IProjectPermissionService;
  projectTags: IProjectTagService;
  projectGroups: IProjectGroupService;
  projectUsers: IProjectUserService;
  organizationRoles: IOrganizationRoleService;
  organizationTags: IOrganizationTagService;
  roleTags: IRoleTagService;
  permissionTags: IPermissionTagService;
}

export interface CreateModuleServicesParams {
  user: AuthenticatedUser | null;
  db: PostgresJsDatabase; // Database connection for connection reuse
}
