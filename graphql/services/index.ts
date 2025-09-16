import { DbSchema } from '@/graphql/lib/database/connection';
import { Repositories } from '@/graphql/repositories';
import { AuthenticatedUser } from '@/graphql/types';

import { createAccountProjectService } from './account-projects';
import { createAccountService } from './accounts';
import { createGroupPermissionService } from './group-permissions';
import { createGroupTagService } from './group-tags';
import { createGroupService } from './groups';
import { createOrganizationGroupService } from './organization-groups';
import { createOrganizationPermissionService } from './organization-permissions';
import { createOrganizationProjectService } from './organization-projects';
import { createOrganizationRoleService } from './organization-roles';
import { createOrganizationTagService } from './organization-tags';
import { createOrganizationUserService } from './organization-users';
import { createOrganizationService } from './organizations';
import { createPermissionTagService } from './permission-tags';
import { createPermissionService } from './permissions';
import { createProjectGroupService } from './project-groups';
import { createProjectPermissionService } from './project-permissions';
import { createProjectRoleService } from './project-roles';
import { createProjectTagService } from './project-tags';
import { createProjectUserService } from './project-users';
import { createProjectService } from './projects';
import { createRoleGroupService } from './role-groups';
import { createRoleTagService } from './role-tags';
import { createRoleService } from './roles';
import { createTagService } from './tags';
import { createUserRoleService } from './user-roles';
import { createUserTagService } from './user-tags';
import { createUserService } from './users';

export type Services = ReturnType<typeof createServices>;

export function createServices(
  repositories: Repositories,
  user: AuthenticatedUser | null,
  db: DbSchema
) {
  return {
    accounts: createAccountService(repositories, user, db),
    accountProjects: createAccountProjectService(repositories, user, db),
    users: createUserService(repositories, user, db),
    roles: createRoleService(repositories, user, db),
    userRoles: createUserRoleService(repositories, user, db),
    userTags: createUserTagService(repositories, user, db),
    tags: createTagService(repositories, user, db),
    groups: createGroupService(repositories, user, db),
    permissions: createPermissionService(repositories, user, db),
    projects: createProjectService(repositories, user, db),
    projectGroups: createProjectGroupService(repositories, user, db),
    projectRoles: createProjectRoleService(repositories, user, db),
    projectPermissions: createProjectPermissionService(repositories, user, db),
    projectTags: createProjectTagService(repositories, user, db),
    projectUsers: createProjectUserService(repositories, user, db),
    organizations: createOrganizationService(repositories, user, db),
    organizationRoles: createOrganizationRoleService(repositories, user, db),
    organizationTags: createOrganizationTagService(repositories, user, db),
    roleTags: createRoleTagService(repositories, user, db),
    permissionTags: createPermissionTagService(repositories, user, db),
    groupPermissions: createGroupPermissionService(repositories, user, db),
    organizationUsers: createOrganizationUserService(repositories, user, db),
    organizationProjects: createOrganizationProjectService(repositories, user, db),
    roleGroups: createRoleGroupService(repositories, user, db),
    organizationPermissions: createOrganizationPermissionService(repositories, user, db),
    organizationGroups: createOrganizationGroupService(repositories, user, db),
    groupTags: createGroupTagService(repositories, user, db),
  };
}
