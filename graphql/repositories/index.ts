import { DbSchema } from '@/graphql/lib/database/connection';

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
    groupPermissionRepository: createGroupPermissionRepository(db),
    groupTagRepository: createGroupTagRepository(db),
    groupRepository: createGroupRepository(db),
    organizationGroupRepository: createOrganizationGroupRepository(db),
    organizationPermissionRepository: createOrganizationPermissionRepository(db),
    organizationProjectRepository: createOrganizationProjectRepository(db),
    organizationRoleRepository: createOrganizationRoleRepository(db),
    organizationTagRepository: createOrganizationTagRepository(db),
    organizationUserRepository: createOrganizationUserRepository(db),
    organizationRepository: createOrganizationRepository(db),
    permissionTagRepository: createPermissionTagRepository(db),
    permissionRepository: createPermissionRepository(db),
    projectGroupRepository: createProjectGroupRepository(db),
    projectPermissionRepository: createProjectPermissionRepository(db),
    projectRoleRepository: createProjectRoleRepository(db),
    projectTagRepository: createProjectTagRepository(db),
    projectUserRepository: createProjectUserRepository(db),
    projectRepository: createProjectRepository(db),
    roleGroupRepository: createRoleGroupRepository(db),
    roleTagRepository: createRoleTagRepository(db),
    roleRepository: createRoleRepository(db),
    tagRepository: createTagRepository(db),
    userRoleRepository: createUserRoleRepository(db),
    userTagRepository: createUserTagRepository(db),
    userRepository: createUserRepository(db),
  };
}
