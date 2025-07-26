import { faker } from '@faker-js/faker';
import { createFakerDataStore, EntityConfig } from '@/lib/providers/faker/genericDataStore';
import { getRoles } from '@/graphql/providers/roles/faker/dataStore';
import { getGroups } from '../../groups/faker/dataStore';

// Type for RoleGroup data without the resolved fields
export interface RoleGroupData {
  id: string;
  groupId: string;
  roleId: string;
}

// Generate fake role-group relationships
const generateFakeRoleGroups = (count: number = 100): RoleGroupData[] => {
  const groups = getGroups();
  const roles = getRoles();

  const roleGroups: RoleGroupData[] = [];

  // Create some random role-group relationships
  for (let i = 0; i < count; i++) {
    const randomGroup = groups[Math.floor(Math.random() * groups.length)];
    const randomRole = roles[Math.floor(Math.random() * roles.length)];

    // Avoid duplicates
    const exists = roleGroups.some(
      (rg) => rg.groupId === randomGroup.id && rg.roleId === randomRole.id
    );
    if (!exists) {
      roleGroups.push({
        id: faker.string.uuid(),
        groupId: randomGroup.id,
        roleId: randomRole.id,
      });
    }
  }

  return roleGroups;
};

// RoleGroup-specific configuration
const roleGroupConfig: EntityConfig<RoleGroupData, never, never> = {
  entityName: 'RoleGroup',
  dataFileName: 'role-groups.json',

  // Generate UUID for role-group IDs
  generateId: () => faker.string.uuid(),

  // Generate role-group entity from input (not used for this pivot)
  generateEntity: () => {
    throw new Error('RoleGroup entities should be created through specific methods');
  },

  // Update role-group entity (not used for this pivot)
  updateEntity: () => {
    throw new Error('RoleGroup entities should be updated through specific methods');
  },

  // Sortable fields
  sortableFields: ['groupId', 'roleId'],

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

// Helper functions for role-group operations
export const getRoleGroupsByRoleId = (roleId: string): RoleGroupData[] => {
  const roleGroups = roleGroupsDataStore.getEntities().filter((rg) => rg.roleId === roleId);
  return roleGroups;
};

export const getRoleGroupsByGroupId = (groupId: string): RoleGroupData[] => {
  return roleGroupsDataStore.getEntities().filter((rg) => rg.groupId === groupId);
};

export const addRoleGroup = (groupId: string, roleId: string): RoleGroupData => {
  // Get current entities and check if role already exists
  const entities = roleGroupsDataStore.getEntities();
  const existingRole = entities.find((rg) => rg.groupId === groupId && rg.roleId === roleId);

  if (existingRole) {
    return existingRole;
  }

  const roleGroup: RoleGroupData = {
    id: faker.string.uuid(),
    groupId,
    roleId,
  };

  entities.push(roleGroup);

  // Save back to the data store
  const fs = require('fs');
  const path = require('path');
  const dataFilePath = path.join(process.cwd(), 'data', 'role-groups.json');
  fs.writeFileSync(dataFilePath, JSON.stringify(entities, null, 2));

  return roleGroup;
};

export const deleteRoleGroup = (id: string): RoleGroupData | null => {
  return roleGroupsDataStore.deleteEntity(id);
};

// New function to delete by groupId and roleId
export const deleteRoleGroupByGroupAndRole = (
  groupId: string,
  roleId: string
): RoleGroupData | null => {
  const entities = roleGroupsDataStore.getEntities();
  const roleGroupIndex = entities.findIndex((rg) => rg.groupId === groupId && rg.roleId === roleId);

  if (roleGroupIndex === -1) {
    return null;
  }

  const roleGroup = entities[roleGroupIndex];
  entities.splice(roleGroupIndex, 1);

  // Save back to the data store
  const fs = require('fs');
  const path = require('path');
  const dataFilePath = path.join(process.cwd(), 'data', 'role-groups.json');
  fs.writeFileSync(dataFilePath, JSON.stringify(entities, null, 2));

  return roleGroup;
};

export const deleteRoleGroupsByGroupId = (groupId: string): RoleGroupData[] => {
  const roleGroups = getRoleGroupsByGroupId(groupId);
  return roleGroups
    .map((rg) => roleGroupsDataStore.deleteEntity(rg.id))
    .filter(Boolean) as RoleGroupData[];
};

export const deleteRoleGroupsByRoleId = (roleId: string): RoleGroupData[] => {
  const roleGroups = getRoleGroupsByRoleId(roleId);
  return roleGroups
    .map((rg) => roleGroupsDataStore.deleteEntity(rg.id))
    .filter(Boolean) as RoleGroupData[];
};
