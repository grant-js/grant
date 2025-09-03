import { DbSchema } from '../lib/providers/database/connection';

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

export function createRepositories(db: DbSchema) {
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
