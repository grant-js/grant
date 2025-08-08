// Common organization field resolvers
export { createOrganizationFieldResolver } from './organization';

// Common project field resolvers
export { createProjectFieldResolver, createOrganizationProjectFieldResolver } from './project';

// Common user field resolvers
export {
  createUserFieldResolver,
  createOrganizationUserFieldResolver,
  createProjectUserFieldResolver,
} from './user';

// Common role field resolvers
export {
  createRoleFieldResolver,
  createOrganizationRoleFieldResolver,
  createProjectRoleFieldResolver,
} from './role';

// Common permission field resolvers
export {
  createPermissionFieldResolver,
  createOrganizationPermissionFieldResolver,
  createProjectPermissionFieldResolver,
} from './permission';

// Common group field resolvers
export {
  createGroupFieldResolver,
  createOrganizationGroupFieldResolver,
  createProjectGroupFieldResolver,
} from './group';
