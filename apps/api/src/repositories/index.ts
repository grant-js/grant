import { DbSchema } from '@logusgraphics/grant-database';

import { AccountProjectRepository } from './account-projects.repository';
import { AccountRepository } from './accounts.repository';
import { GroupPermissionRepository } from './group-permissions.repository';
import { GroupTagRepository } from './group-tags.repository';
import { GroupRepository } from './groups.repository';
import { OrganizationGroupRepository } from './organization-groups.repository';
import { OrganizationInvitationRepository } from './organization-invitations.repository';
import { OrganizationPermissionRepository } from './organization-permissions.repository';
import { OrganizationProjectRepository } from './organization-projects.repository';
import { OrganizationRoleRepository } from './organization-roles.repository';
import { OrganizationTagRepository } from './organization-tags.repository';
import { OrganizationUserRepository } from './organization-users.repository';
import { OrganizationRepository } from './organizations.repository';
import { PermissionTagRepository } from './permission-tags.repository';
import { PermissionRepository } from './permissions.repository';
import { ProjectGroupRepository } from './project-groups.repository';
import { ProjectPermissionRepository } from './project-permissions.repository';
import { ProjectRoleRepository } from './project-roles.repository';
import { ProjectTagRepository } from './project-tags.repository';
import { ProjectUserRepository } from './project-users.repository';
import { ProjectRepository } from './projects.repository';
import { RoleGroupRepository } from './role-groups.repository';
import { RoleTagRepository } from './role-tags.repository';
import { RoleRepository } from './roles.repository';
import { TagRepository } from './tags.repository';
import { UserAuthenticationMethodRepository } from './user-authentication-methods.repository';
import { UserRoleRepository } from './user-roles.repository';
import { UserSessionRepository } from './user-sessions.repository';
import { UserTagRepository } from './user-tags.repository';
import { UserRepository } from './users.repository';

export type Repositories = ReturnType<typeof createRepositories>;

export function createRepositories(db: DbSchema) {
  return {
    accountProjectRepository: new AccountProjectRepository(db),
    accountRepository: new AccountRepository(db),
    groupPermissionRepository: new GroupPermissionRepository(db),
    groupTagRepository: new GroupTagRepository(db),
    groupRepository: new GroupRepository(db),
    organizationGroupRepository: new OrganizationGroupRepository(db),
    organizationInvitationRepository: new OrganizationInvitationRepository(db),
    organizationPermissionRepository: new OrganizationPermissionRepository(db),
    organizationProjectRepository: new OrganizationProjectRepository(db),
    organizationRoleRepository: new OrganizationRoleRepository(db),
    organizationTagRepository: new OrganizationTagRepository(db),
    organizationUserRepository: new OrganizationUserRepository(db),
    organizationRepository: new OrganizationRepository(db),
    permissionTagRepository: new PermissionTagRepository(db),
    permissionRepository: new PermissionRepository(db),
    projectGroupRepository: new ProjectGroupRepository(db),
    projectPermissionRepository: new ProjectPermissionRepository(db),
    projectRoleRepository: new ProjectRoleRepository(db),
    projectTagRepository: new ProjectTagRepository(db),
    projectUserRepository: new ProjectUserRepository(db),
    projectRepository: new ProjectRepository(db),
    roleGroupRepository: new RoleGroupRepository(db),
    roleTagRepository: new RoleTagRepository(db),
    roleRepository: new RoleRepository(db),
    tagRepository: new TagRepository(db),
    userAuthenticationMethodRepository: new UserAuthenticationMethodRepository(db),
    userRoleRepository: new UserRoleRepository(db),
    userTagRepository: new UserTagRepository(db),
    userRepository: new UserRepository(db),
    userSessionRepository: new UserSessionRepository(db),
  };
}
