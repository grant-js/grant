import { faker } from '@faker-js/faker';

import { AddUserRoleInput, Scope, Tenant, UserRole } from '@/graphql/generated/types';
import { getRoles } from '@/graphql/providers/roles/faker/dataStore';
import { getUsers } from '@/graphql/providers/users/faker/dataStore';
import {
  createFakerDataStore,
  EntityConfig,
  generateAuditTimestamps,
} from '@/lib/providers/faker/genericDataStore';

import { getOrganizationRolesByOrganizationId } from '../../organization-roles/faker/dataStore';
import { getProjectRolesByProjectId } from '../../project-roles/faker/dataStore';
const generateFakeUserRoles = (count: number = 100): UserRole[] => {
  const users = getUsers();
  const roles = getRoles();
  const userRoles: UserRole[] = [];
  for (let i = 0; i < count; i++) {
    const randomUser = users[Math.floor(Math.random() * users.length)];
    const randomRole = roles[Math.floor(Math.random() * roles.length)];
    const exists = userRoles.some(
      (ur) => ur.userId === randomUser.id && ur.roleId === randomRole.id
    );
    if (!exists) {
      const auditTimestamps = generateAuditTimestamps();
      userRoles.push({
        id: faker.string.uuid(),
        userId: randomUser.id,
        roleId: randomRole.id,
        ...auditTimestamps,
      });
    }
  }
  return userRoles;
};
const userRoleConfig: EntityConfig<UserRole, AddUserRoleInput, never> = {
  entityName: 'UserRole',
  dataFileName: 'user-roles.json',
  generateId: () => faker.string.uuid(),
  generateEntity: (input: AddUserRoleInput, id: string): UserRole => {
    const auditTimestamps = generateAuditTimestamps();
    return {
      id,
      userId: input.userId,
      roleId: input.roleId,
      ...auditTimestamps,
    };
  },
  updateEntity: () => {
    throw new Error('UserRole entities should be updated through specific methods');
  },
  sortableFields: ['userId', 'roleId', 'createdAt', 'updatedAt'],
  validationRules: [
    { field: 'id', unique: true },
    { field: 'userId', unique: false, required: true },
    { field: 'roleId', unique: false, required: true },
  ],
  initialData: generateFakeUserRoles,
};
export const userRolesDataStore = createFakerDataStore(userRoleConfig);
export const getUserRoleIdsByScope = (scope: Scope): string[] => {
  switch (scope.tenant) {
    case Tenant.Project:
      return getProjectRolesByProjectId(scope.id).map((pr) => pr.roleId);
    case Tenant.Organization:
      return getOrganizationRolesByOrganizationId(scope.id).map((or) => or.roleId);
    default:
      return getRoles().map((r) => r.id);
  }
};
export const getUserRolesByUserId = (scope: Scope, userId: string): UserRole[] => {
  const userRoles = userRolesDataStore.getEntities().filter((ur) => ur.userId === userId);
  const scopedRoleIds = getUserRoleIdsByScope(scope);
  return userRoles.filter((ur) => scopedRoleIds.includes(ur.roleId));
};
export const getUserRolesByRoleId = (roleId: string): UserRole[] => {
  return userRolesDataStore.getEntities().filter((ur) => ur.roleId === roleId);
};
export const addUserRole = (userId: string, roleId: string): UserRole => {
  const existingRole = userRolesDataStore
    .getEntities()
    .find((ur) => ur.userId === userId && ur.roleId === roleId);
  if (existingRole) {
    return existingRole;
  }
  return userRolesDataStore.createEntity({ userId, roleId });
};
export const deleteUserRole = (id: string): UserRole | null => {
  return userRolesDataStore.deleteEntity(id);
};
export const deleteUserRoleByUserAndRole = (userId: string, roleId: string): UserRole | null => {
  const userRole = userRolesDataStore
    .getEntities()
    .find((ur) => ur.userId === userId && ur.roleId === roleId);
  if (!userRole) {
    return null;
  }
  return userRolesDataStore.deleteEntity(userRole.id);
};
export const deleteUserRolesByUserId = (userId: string): UserRole[] => {
  const userRoles = userRolesDataStore.getEntities().filter((ur) => ur.userId === userId);
  userRoles.forEach((ur) => userRolesDataStore.deleteEntity(ur.id));
  return userRoles;
};
export const deleteUserRolesByRoleId = (roleId: string): UserRole[] => {
  const userRoles = userRolesDataStore.getEntities().filter((ur) => ur.roleId === roleId);
  userRoles.forEach((ur) => userRolesDataStore.deleteEntity(ur.id));
  return userRoles;
};
