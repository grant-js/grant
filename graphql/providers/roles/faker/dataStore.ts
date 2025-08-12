import { faker } from '@faker-js/faker';

import { CreateRoleInput, UpdateRoleInput, RoleSortInput, Role } from '@/graphql/generated/types';
import {
  createFakerDataStore,
  EntityConfig,
  generateAuditTimestamps,
  updateAuditTimestamp,
} from '@/lib/providers/faker/genericDataStore';
const generateInitialRoles = (): Role[] => {
  const auditTimestamps = generateAuditTimestamps();
  return [
    {
      id: faker.string.uuid(),
      name: 'Admin',
      description: 'Admin role with all permission groups',
      ...auditTimestamps,
    },
    {
      id: faker.string.uuid(),
      name: 'Support',
      description: 'Support user with support permission groups',
      ...auditTimestamps,
    },
    {
      id: faker.string.uuid(),
      name: 'Partner',
      description: 'Partner user with partner permission groups',
      ...auditTimestamps,
    },
    {
      id: faker.string.uuid(),
      name: 'Customer',
      description: 'Customer tenant level with customer permission groups',
      ...auditTimestamps,
    },
  ];
};
const rolesConfig: EntityConfig<Role, CreateRoleInput, UpdateRoleInput> = {
  entityName: 'Role',
  dataFileName: 'roles.json',
  generateId: () => faker.string.uuid(),
  generateEntity: (input: CreateRoleInput, id: string): Role => {
    const auditTimestamps = generateAuditTimestamps();
    return {
      id,
      name: input.name,
      description: input.description || '',
      ...auditTimestamps,
    };
  },
  updateEntity: (entity: Role, input: UpdateRoleInput): Role => {
    const auditTimestamp = updateAuditTimestamp();
    return {
      ...entity,
      name: input.name || entity.name,
      description: input.description || entity.description,
      ...auditTimestamp,
    };
  },
  sortableFields: ['name', 'createdAt', 'updatedAt'],
  validationRules: [
    { field: 'id', unique: true },
    { field: 'name', unique: true, required: true },
  ],
  initialData: generateInitialRoles,
};
export const rolesDataStore = createFakerDataStore(rolesConfig);
export const initializeDataStore = () => rolesDataStore.getEntities();
export const sortRoles = (roles: Role[], sortConfig?: RoleSortInput): Role[] => {
  if (!sortConfig) return roles;
  return rolesDataStore.getEntities({
    field: sortConfig.field,
    order: sortConfig.order,
  });
};
export const getRoles = (sortConfig?: RoleSortInput, ids?: string[]): Role[] => {
  let allRoles = rolesDataStore.getEntities(
    sortConfig
      ? {
          field: sortConfig.field,
          order: sortConfig.order,
        }
      : undefined
  );
  if (ids && ids.length > 0) {
    allRoles = allRoles.filter((role) => ids.includes(role.id));
  }
  return allRoles;
};
export const isRoleUnique = (roleId: string): boolean => {
  return rolesDataStore.entityExists(roleId);
};
export const createRole = (input: CreateRoleInput): Role => {
  return rolesDataStore.createEntity(input);
};
export const updateRole = (roleId: string, input: UpdateRoleInput): Role | null => {
  return rolesDataStore.updateEntity(roleId, input);
};
export const deleteRole = (roleId: string): Role | null => {
  return rolesDataStore.deleteEntity(roleId);
};
