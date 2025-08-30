import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

import { createGroupPermissionRepository } from './group-permissions';
import { createGroupTagRepository } from './group-tags';
import { createGroupRepository } from './groups';
import { createOrganizationGroupRepository } from './organization-groups';
import { createOrganizationPermissionRepository } from './organization-permissions';
import { createOrganizationProjectRepository } from './organization-projects';
import { createOrganizationRoleRepository } from './organization-roles';
import { createOrganizationTagRepository } from './organization-tags';
import { createOrganizationUserRepository } from './organization-users';
import { createOrganizationRepository } from './organizations';
import { createPermissionTagRepository } from './permission-tags';
import { createPermissionRepository } from './permissions';
import { createProjectGroupRepository } from './project-groups';
import { createProjectPermissionRepository } from './project-permissions';
import { createProjectRoleRepository } from './project-roles';
import { createProjectTagRepository } from './project-tags';
import { createProjectUserRepository } from './project-users';
import { createProjectRepository } from './projects';
import { createRoleGroupRepository } from './role-groups';
import { createRoleTagRepository } from './role-tags';
import { createRoleRepository } from './roles';
import { createTagRepository } from './tags';
import { createUserRoleRepository } from './user-roles';
import { createUserTagRepository } from './user-tags';
import { createUserRepository } from './users';

export type Repositories = ReturnType<typeof createRepositories>;

export function createRepositories(db: PostgresJsDatabase) {
  return {
    userRepository: createUserRepository(db),
    roleRepository: createRoleRepository(db),
    userRoleRepository: createUserRoleRepository(db),
    userTagRepository: createUserTagRepository(db),
    tagRepository: createTagRepository(db),
    groupRepository: createGroupRepository(db),
    permissionRepository: createPermissionRepository(db),
    projectRepository: createProjectRepository(db),
    organizationRepository: createOrganizationRepository(db),
    groupPermissionRepository: createGroupPermissionRepository(db),
    organizationUserRepository: createOrganizationUserRepository(db),
    projectUserRepository: createProjectUserRepository(db),
    projectGroupRepository: createProjectGroupRepository(db),
    projectRoleRepository: createProjectRoleRepository(db),
    projectPermissionRepository: createProjectPermissionRepository(db),
    projectTagRepository: createProjectTagRepository(db),
    organizationProjectRepository: createOrganizationProjectRepository(db),
    organizationRoleRepository: createOrganizationRoleRepository(db),
    organizationTagRepository: createOrganizationTagRepository(db),
    roleGroupRepository: createRoleGroupRepository(db),
    roleTagRepository: createRoleTagRepository(db),
    organizationPermissionRepository: createOrganizationPermissionRepository(db),
    organizationGroupRepository: createOrganizationGroupRepository(db),
    groupTagRepository: createGroupTagRepository(db),
    permissionTagRepository: createPermissionTagRepository(db),
  };
}

export type { IUserRepository } from './users/interface';
export type { IRoleRepository } from './roles/interface';
export type { IUserRoleRepository } from './user-roles/interface';
export type { IUserTagRepository } from './user-tags/interface';
export type { ITagRepository } from './tags/interface';
export type { IGroupRepository } from './groups/interface';
export type { IPermissionRepository } from './permissions/interface';
export type { IProjectRepository } from './projects/interface';
export type { IOrganizationRepository } from './organizations/interface';
export type { IGroupPermissionRepository } from './group-permissions/interface';
export type { IOrganizationUserRepository } from './organization-users/interface';
export type { IProjectUserRepository } from './project-users/interface';
export type { IProjectGroupRepository } from './project-groups/interface';
export type { IProjectRoleRepository } from './project-roles/interface';
export type { IProjectPermissionRepository } from './project-permissions/interface';
export type { IProjectTagRepository } from './project-tags/interface';
export type { IOrganizationProjectRepository } from './organization-projects/interface';
export type { IOrganizationRoleRepository } from './organization-roles/interface';
export type { IOrganizationTagRepository } from './organization-tags/interface';
export type { IRoleGroupRepository } from './role-groups/interface';
export type { IRoleTagRepository } from './role-tags/interface';
export type { IOrganizationPermissionRepository } from './organization-permissions/interface';
export type { IOrganizationGroupRepository } from './organization-groups/interface';
export type { IGroupTagRepository } from './group-tags/interface';
export type { IPermissionTagRepository } from './permission-tags/interface';

export { EntityRepository } from './common/EntityRepository';
export { PivotRepository } from './common/PivotRepository';
