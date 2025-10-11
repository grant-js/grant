import { DbSchema } from '@logusgraphics/grant-database';

import { AccountProjectService } from './account-projects.service';
import { AccountService } from './accounts.service';
import { GroupPermissionService } from './group-permissions.service';
import { GroupTagService } from './group-tags.service';
import { GroupService } from './groups.service';
import { OrganizationGroupService } from './organization-groups.service';
import { OrganizationPermissionService } from './organization-permissions.service';
import { OrganizationProjectService } from './organization-projects.service';
import { OrganizationRoleService } from './organization-roles.service';
import { OrganizationTagService } from './organization-tags.service';
import { OrganizationUserService } from './organization-users.service';
import { OrganizationService } from './organizations.service';
import { PermissionTagService } from './permission-tags.service';
import { PermissionService } from './permissions.service';
import { ProjectGroupService } from './project-groups.service';
import { ProjectPermissionService } from './project-permissions.service';
import { ProjectRoleService } from './project-roles.service';
import { ProjectTagService } from './project-tags.service';
import { ProjectUserService } from './project-users.service';
import { ProjectService } from './projects.service';
import { RoleGroupService } from './role-groups.service';
import { RoleTagService } from './role-tags.service';
import { RoleService } from './roles.service';
import { TagService } from './tags.service';
import { UserAuthenticationMethodService } from './user-authentication-methods.service';
import { UserRoleService } from './user-roles.service';
import { UserSessionService } from './user-sessions.service';
import { UserTagService } from './user-tags.service';
import { UserService } from './users.service';

import { Repositories } from '@/repositories';
import { AuthenticatedUser } from '@/types';

export type Services = ReturnType<typeof createServices>;

export function createServices(
  repositories: Repositories,
  user: AuthenticatedUser | null,
  db: DbSchema
) {
  return {
    accounts: new AccountService(repositories, user, db),
    accountProjects: new AccountProjectService(repositories, user, db),
    users: new UserService(repositories, user, db),
    userAuthenticationMethods: new UserAuthenticationMethodService(repositories, user, db),
    userSessions: new UserSessionService(repositories, user, db),
    roles: new RoleService(repositories, user, db),
    userRoles: new UserRoleService(repositories, user, db),
    userTags: new UserTagService(repositories, user, db),
    tags: new TagService(repositories, user, db),
    groups: new GroupService(repositories, user, db),
    permissions: new PermissionService(repositories, user, db),
    projects: new ProjectService(repositories, user, db),
    projectGroups: new ProjectGroupService(repositories, user, db),
    projectRoles: new ProjectRoleService(repositories, user, db),
    projectPermissions: new ProjectPermissionService(repositories, user, db),
    projectTags: new ProjectTagService(repositories, user, db),
    projectUsers: new ProjectUserService(repositories, user, db),
    organizations: new OrganizationService(repositories, user, db),
    organizationRoles: new OrganizationRoleService(repositories, user, db),
    organizationTags: new OrganizationTagService(repositories, user, db),
    roleTags: new RoleTagService(repositories, user, db),
    permissionTags: new PermissionTagService(repositories, user, db),
    groupPermissions: new GroupPermissionService(repositories, user, db),
    organizationUsers: new OrganizationUserService(repositories, user, db),
    organizationProjects: new OrganizationProjectService(repositories, user, db),
    roleGroups: new RoleGroupService(repositories, user, db),
    organizationPermissions: new OrganizationPermissionService(repositories, user, db),
    organizationGroups: new OrganizationGroupService(repositories, user, db),
    groupTags: new GroupTagService(repositories, user, db),
  };
}
