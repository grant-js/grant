import { createRepositories } from '@/graphql/repositories';
import { createGroupPermissionService } from '@/graphql/services/group-permissions';
import { createGroupTagService } from '@/graphql/services/group-tags';
import { createGroupService } from '@/graphql/services/groups';
import { createOrganizationGroupService } from '@/graphql/services/organization-groups';
import { createOrganizationPermissionService } from '@/graphql/services/organization-permissions';
import { createOrganizationProjectService } from '@/graphql/services/organization-projects';
import { createOrganizationRoleService } from '@/graphql/services/organization-roles';
import { createOrganizationTagService } from '@/graphql/services/organization-tags';
import { createOrganizationUserService } from '@/graphql/services/organization-users';
import { createOrganizationService } from '@/graphql/services/organizations';
import { createPermissionTagService } from '@/graphql/services/permission-tags';
import { createPermissionService } from '@/graphql/services/permissions';
import { createProjectGroupService } from '@/graphql/services/project-groups';
import { createProjectPermissionService } from '@/graphql/services/project-permissions';
import { createProjectRoleService } from '@/graphql/services/project-roles';
import { createProjectTagService } from '@/graphql/services/project-tags';
import { createProjectUserService } from '@/graphql/services/project-users';
import { createProjectService } from '@/graphql/services/projects';
import { createRoleGroupService } from '@/graphql/services/role-groups';
import { createRoleTagService } from '@/graphql/services/role-tags';
import { createRoleService } from '@/graphql/services/roles';
import { createTagService } from '@/graphql/services/tags';
import { createUserRoleService } from '@/graphql/services/user-roles';
import { createUserTagService } from '@/graphql/services/user-tags';
import { createUserService } from '@/graphql/services/users';

import { CreateModuleServicesParams, ModuleServices } from './interface';

export const createServices = ({ user, db }: CreateModuleServicesParams): ModuleServices => {
  const repositories = createRepositories(db);

  return {
    users: createUserService(repositories, user, db),
    roles: createRoleService(repositories, user, db),
    groups: createGroupService(repositories, user, db),
    permissions: createPermissionService(repositories, user, db),
    projects: createProjectService(repositories, user, db),
    organizations: createOrganizationService(repositories, user, db),
    tags: createTagService(repositories, user, db),
    userRoles: createUserRoleService(repositories, user, db),
    userTags: createUserTagService(repositories, user, db),
    groupPermissions: createGroupPermissionService(repositories, user, db),
    organizationUsers: createOrganizationUserService(repositories, user, db),
    organizationProjects: createOrganizationProjectService(repositories, user, db),
    roleGroups: createRoleGroupService(repositories, user, db),
    organizationPermissions: createOrganizationPermissionService(repositories, user, db),
    organizationGroups: createOrganizationGroupService(repositories, user, db),
    groupTags: createGroupTagService(repositories, user, db),
    projectRoles: createProjectRoleService(repositories, user, db),
    projectPermissions: createProjectPermissionService(repositories, user, db),
    projectTags: createProjectTagService(repositories, user, db),
    projectGroups: createProjectGroupService(repositories, user, db),
    projectUsers: createProjectUserService(repositories, user, db),
    organizationRoles: createOrganizationRoleService(repositories, user, db),
    organizationTags: createOrganizationTagService(repositories, user, db),
    roleTags: createRoleTagService(repositories, user, db),
    permissionTags: createPermissionTagService(repositories, user, db),
  };
};
