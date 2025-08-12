import { faker } from '@faker-js/faker';

import { AddOrganizationUserInput, OrganizationUser } from '@/graphql/generated/types';
import {
  createFakerDataStore,
  EntityConfig,
  generateAuditTimestamps,
} from '@/lib/providers/faker/genericDataStore';
const generateInitialOrganizationUsers = (): OrganizationUser[] => {
  return [];
};
const organizationUserConfig: EntityConfig<OrganizationUser, AddOrganizationUserInput, never> = {
  entityName: 'OrganizationUser',
  dataFileName: 'organization-users.json',
  generateId: () => faker.string.uuid(),
  generateEntity: (input: AddOrganizationUserInput, id: string): OrganizationUser => {
    const auditTimestamps = generateAuditTimestamps();
    return {
      id,
      organizationId: input.organizationId,
      userId: input.userId,
      ...auditTimestamps,
    };
  },
  updateEntity: () => {
    throw new Error('OrganizationUser entities should be updated through specific methods');
  },
  sortableFields: ['organizationId', 'userId', 'createdAt', 'updatedAt'],
  validationRules: [
    { field: 'id', unique: true },
    { field: 'organizationId', unique: false, required: true },
    { field: 'userId', unique: false, required: true },
  ],
  initialData: generateInitialOrganizationUsers,
};
export const organizationUsersDataStore = createFakerDataStore(organizationUserConfig);
export const getOrganizationUsersByOrganizationId = (
  organizationId: string
): OrganizationUser[] => {
  const organizationUsers = organizationUsersDataStore
    .getEntities()
    .filter((ou) => ou.organizationId === organizationId);
  return organizationUsers;
};
export const getOrganizationUsersByUserId = (userId: string): OrganizationUser[] => {
  return organizationUsersDataStore.getEntities().filter((ou) => ou.userId === userId);
};
export const addOrganizationUser = (organizationId: string, userId: string): OrganizationUser => {
  const existingRelationship = organizationUsersDataStore
    .getEntities()
    .find((ou) => ou.organizationId === organizationId && ou.userId === userId);
  if (existingRelationship) {
    return existingRelationship;
  }
  return organizationUsersDataStore.createEntity({ organizationId, userId });
};
export const deleteOrganizationUser = (id: string): OrganizationUser | null => {
  return organizationUsersDataStore.deleteEntity(id);
};
export const deleteOrganizationUserByOrganizationAndUser = (
  organizationId: string,
  userId: string
): OrganizationUser | null => {
  const organizationUser = organizationUsersDataStore
    .getEntities()
    .find((ou) => ou.organizationId === organizationId && ou.userId === userId);
  if (!organizationUser) {
    return null;
  }
  return organizationUsersDataStore.deleteEntity(organizationUser.id);
};
export const deleteOrganizationUsersByOrganizationId = (
  organizationId: string
): OrganizationUser[] => {
  const organizationUsers = organizationUsersDataStore
    .getEntities()
    .filter((ou) => ou.organizationId === organizationId);
  organizationUsers.forEach((ou) => organizationUsersDataStore.deleteEntity(ou.id));
  return organizationUsers;
};
export const deleteOrganizationUsersByUserId = (userId: string): OrganizationUser[] => {
  const organizationUsers = organizationUsersDataStore
    .getEntities()
    .filter((ou) => ou.userId === userId);
  organizationUsers.forEach((ou) => organizationUsersDataStore.deleteEntity(ou.id));
  return organizationUsers;
};
