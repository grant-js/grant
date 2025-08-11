import { faker } from '@faker-js/faker';

import { AddRoleGroupInput, RoleGroup, Scope, Tenant } from '@/graphql/generated/types';
import { getRoles } from '@/graphql/providers/roles/faker/dataStore';
import {
  createFakerDataStore,
  EntityConfig,
  generateAuditTimestamps,
} from '@/lib/providers/faker/genericDataStore';

import { getGroups } from '../../groups/faker/dataStore';
import { getOrganizationGroupsByOrganizationId } from '../../organization-groups/faker/dataStore';
import { getProjectGroupsByProjectId } from '../../project-groups/faker/dataStore';

// Generate fake role-group relationships
const generateFakeRoleGroups = (count: number = 100): RoleGroup[] => {
  const groups = getGroups();
  const roles = getRoles();

  const roleGroups: RoleGroup[] = [];

  // Create some random role-group relationships
  for (let i = 0; i < count; i++) {
    const randomGroup = groups[Math.floor(Math.random() * groups.length)];
    const randomRole = roles[Math.floor(Math.random() * roles.length)];

    // Avoid duplicates
    const exists = roleGroups.some(
      (rg) => rg.groupId === randomGroup.id && rg.roleId === randomRole.id
    );
    if (!exists) {
      const auditTimestamps = generateAuditTimestamps();
      roleGroups.push({
        id: faker.string.uuid(),
        groupId: randomGroup.id,
        roleId: randomRole.id,
        ...auditTimestamps,
      });
    }
  }

  return roleGroups;
};

// RoleGroup-specific configuration
const roleGroupConfig: EntityConfig<RoleGroup, AddRoleGroupInput, never> = {
  entityName: 'RoleGroup',
  dataFileName: 'role-groups.json',

  // Generate UUID for role-group IDs
  generateId: () => faker.string.uuid(),

  // Generate role-group entity from input
  generateEntity: (input: AddRoleGroupInput, id: string): RoleGroup => {
    const auditTimestamps = generateAuditTimestamps();
    return {
      id,
      groupId: input.groupId,
      roleId: input.roleId,
      ...auditTimestamps,
    };
  },

  // Update role-group entity (not used for this pivot)
  updateEntity: () => {
    throw new Error('RoleGroup entities should be updated through specific methods');
  },

  // Sortable fields
  sortableFields: ['groupId', 'roleId', 'createdAt', 'updatedAt'],

  // Validation rules
  validationRules: [
    { field: 'id', unique: true },
    { field: 'groupId', unique: false, required: true },
    { field: 'roleId', unique: false, required: true },
  ],

  // Initial data
  initialData: generateFakeRoleGroups,
};

// Create the role-groups data store instance
export const roleGroupsDataStore = createFakerDataStore(roleGroupConfig);

// Helper function to get group IDs based on scope
export const getRoleGroupIdsByScope = (scope: Scope): string[] => {
  switch (scope.tenant) {
    case Tenant.Project:
      return getProjectGroupsByProjectId(scope.id).map((pg) => pg.groupId);
    case Tenant.Organization:
      return getOrganizationGroupsByOrganizationId(scope.id).map((og) => og.groupId);
    default:
      // For global scope, return all group IDs
      return getGroups().map((g) => g.id);
  }
};

// Helper functions for role-group operations
export const getRoleGroupsByRoleId = (scope: Scope, roleId: string): RoleGroup[] => {
  const roleGroups = roleGroupsDataStore.getEntities().filter((rg) => rg.roleId === roleId);

  const scopedGroupIds = getRoleGroupIdsByScope(scope);
  return roleGroups.filter((rg) => scopedGroupIds.includes(rg.groupId));
};

export const getRoleGroupsByGroupId = (groupId: string): RoleGroup[] => {
  return roleGroupsDataStore.getEntities().filter((rg) => rg.groupId === groupId);
};

export const addRoleGroup = (groupId: string, roleId: string): RoleGroup => {
  // Check if role already exists
  const existingRole = roleGroupsDataStore
    .getEntities()
    .find((rg) => rg.groupId === groupId && rg.roleId === roleId);

  if (existingRole) {
    return existingRole;
  }

  return roleGroupsDataStore.createEntity({ groupId, roleId });
};

export const deleteRoleGroup = (id: string): RoleGroup | null => {
  return roleGroupsDataStore.deleteEntity(id);
};

export const deleteRoleGroupByGroupAndRole = (
  groupId: string,
  roleId: string
): RoleGroup | null => {
  const roleGroup = roleGroupsDataStore
    .getEntities()
    .find((rg) => rg.groupId === groupId && rg.roleId === roleId);

  if (!roleGroup) {
    return null;
  }

  return roleGroupsDataStore.deleteEntity(roleGroup.id);
};

export const deleteRoleGroupsByGroupId = (groupId: string): RoleGroup[] => {
  const roleGroups = roleGroupsDataStore.getEntities().filter((rg) => rg.groupId === groupId);
  roleGroups.forEach((rg) => roleGroupsDataStore.deleteEntity(rg.id));
  return roleGroups;
};

export const deleteRoleGroupsByRoleId = (roleId: string): RoleGroup[] => {
  const roleGroups = roleGroupsDataStore.getEntities().filter((rg) => rg.roleId === roleId);
  roleGroups.forEach((rg) => roleGroupsDataStore.deleteEntity(rg.id));
  return roleGroups;
};
