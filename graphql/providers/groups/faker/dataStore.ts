import { faker } from '@faker-js/faker';

import {
  CreateGroupInput,
  UpdateGroupInput,
  GroupSortInput,
  Group,
} from '@/graphql/generated/types';
import {
  createFakerDataStore,
  EntityConfig,
  generateAuditTimestamps,
  updateAuditTimestamp,
} from '@/lib/providers/faker';
const generateInitialGroups = (): Group[] => {
  const auditTimestamps = generateAuditTimestamps();
  return [
    {
      id: faker.string.uuid(),
      name: 'Admin',
      description: 'Admin  group with all permissions',
      ...auditTimestamps,
    },
    {
      id: faker.string.uuid(),
      name: 'Support Invoice',
      description: 'Support invoice group with all support invoice permissions',
      ...auditTimestamps,
    },
    {
      id: faker.string.uuid(),
      name: 'Support Accounting',
      description: 'Support invoice group with all support accounting permissions',
      ...auditTimestamps,
    },
    {
      id: faker.string.uuid(),
      name: 'Support Payment',
      description: 'Support payment group with all support payment permissions',
      ...auditTimestamps,
    },
    {
      id: faker.string.uuid(),
      name: 'Support Policy',
      description: 'Support policy group with all support policy permissions',
      ...auditTimestamps,
    },
    {
      id: faker.string.uuid(),
      name: 'Support Claim',
      description: 'Support claim group with all support claim permissions',
      ...auditTimestamps,
    },
    {
      id: faker.string.uuid(),
      name: 'Support Configuration',
      description: 'Support configuration group with all support configuration permissions',
      ...auditTimestamps,
    },
    {
      id: faker.string.uuid(),
      name: 'Support Document',
      description: 'Support document group with all support document permissions',
      ...auditTimestamps,
    },
    {
      id: faker.string.uuid(),
      name: 'Support Workflow',
      description: 'Support workflow group with all support workflow permissions',
      ...auditTimestamps,
    },
    {
      id: faker.string.uuid(),
      name: 'Support Partnership',
      description: 'Support partnership group with all support partnership permissions',
      ...auditTimestamps,
    },
    {
      id: faker.string.uuid(),
      name: 'Support Commission',
      description: 'Support commission group with all support commission permissions',
      ...auditTimestamps,
    },
    {
      id: faker.string.uuid(),
      name: 'Support Quotation',
      description: 'Support quotation group with all support quotation permissions',
      ...auditTimestamps,
    },
    {
      id: faker.string.uuid(),
      name: 'Partner Invoice',
      description: 'Partner invoice group with all partner invoice permissions',
      ...auditTimestamps,
    },
    {
      id: faker.string.uuid(),
      name: 'Partner Accounting',
      description: 'Partner invoice group with all partner accounting permissions',
      ...auditTimestamps,
    },
    {
      id: faker.string.uuid(),
      name: 'Partner Payment',
      description: 'Partner payment group with all partner payment permissions',
      ...auditTimestamps,
    },
    {
      id: faker.string.uuid(),
      name: 'Partner Policy',
      description: 'Partner policy group with all partner policy permissions',
      ...auditTimestamps,
    },
    {
      id: faker.string.uuid(),
      name: 'Partner Claim',
      description: 'Partner claim group with all partner claim permissions',
      ...auditTimestamps,
    },
    {
      id: faker.string.uuid(),
      name: 'Partner Configuration',
      description: 'Partner configuration group with all partner configuration permissions',
      ...auditTimestamps,
    },
    {
      id: faker.string.uuid(),
      name: 'Partner Document',
      description: 'Partner document group with all partner document permissions',
      ...auditTimestamps,
    },
    {
      id: faker.string.uuid(),
      name: 'Partner Workflow',
      description: 'Partner workflow group with all partner workflow permissions',
      ...auditTimestamps,
    },
    {
      id: faker.string.uuid(),
      name: 'Partner Partnership',
      description: 'Partner partnership group with all partner partnership permissions',
      ...auditTimestamps,
    },
    {
      id: faker.string.uuid(),
      name: 'Partner Commission',
      description: 'Partner commission group with all partner commission permissions',
      ...auditTimestamps,
    },
    {
      id: faker.string.uuid(),
      name: 'Partner Quotation',
      description: 'Partner quotation group with all partner quotation permissions',
      ...auditTimestamps,
    },
    {
      id: faker.string.uuid(),
      name: 'Customer Invoice',
      description: 'Customer invoice group with all customer invoice permissions',
      ...auditTimestamps,
    },
    {
      id: faker.string.uuid(),
      name: 'Customer Accounting',
      description: 'Customer invoice group with all customer accounting permissions',
      ...auditTimestamps,
    },
    {
      id: faker.string.uuid(),
      name: 'Customer Payment',
      description: 'Customer payment group with all customer payment permissions',
      ...auditTimestamps,
    },
    {
      id: faker.string.uuid(),
      name: 'Customer Policy',
      description: 'Customer policy group with all customer policy permissions',
      ...auditTimestamps,
    },
    {
      id: faker.string.uuid(),
      name: 'Customer Claim',
      description: 'Customer claim group with all customer claim permissions',
      ...auditTimestamps,
    },
    {
      id: faker.string.uuid(),
      name: 'Customer Configuration',
      description: 'Customer configuration group with all customer configuration permissions',
      ...auditTimestamps,
    },
    {
      id: faker.string.uuid(),
      name: 'Customer Document',
      description: 'Customer document group with all customer document permissions',
      ...auditTimestamps,
    },
    {
      id: faker.string.uuid(),
      name: 'Customer Workflow',
      description: 'Customer workflow group with all customer workflow permissions',
      ...auditTimestamps,
    },
    {
      id: faker.string.uuid(),
      name: 'Customer Partnership',
      description: 'Customer partnership group with all customer partnership permissions',
      ...auditTimestamps,
    },
    {
      id: faker.string.uuid(),
      name: 'Customer Commission',
      description: 'Customer commission group with all customer commission permissions',
      ...auditTimestamps,
    },
    {
      id: faker.string.uuid(),
      name: 'Customer Quotation',
      description: 'Customer quotation group with all customer quotation permissions',
      ...auditTimestamps,
    },
  ];
};
const groupsConfig: EntityConfig<Group, CreateGroupInput, UpdateGroupInput> = {
  entityName: 'Group',
  dataFileName: 'groups.json',
  generateId: () => faker.string.uuid(),
  generateEntity: (input: CreateGroupInput, id: string): Group => {
    const auditTimestamps = generateAuditTimestamps();
    return {
      id,
      name: input.name,
      description: input.description || '',
      ...auditTimestamps,
    };
  },
  updateEntity: (entity: Group, input: UpdateGroupInput): Group => {
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
  initialData: generateInitialGroups,
};
export const groupsDataStore = createFakerDataStore(groupsConfig);
export const initializeDataStore = () => groupsDataStore.getEntities();
export const sortGroups = (groups: Group[], sortConfig?: GroupSortInput): Group[] => {
  if (!sortConfig) return groups;
  return groupsDataStore.getEntities({
    field: sortConfig.field,
    order: sortConfig.order,
  });
};
export const getGroups = (sortConfig?: GroupSortInput, ids?: string[]): Group[] => {
  let allGroups = groupsDataStore.getEntities(
    sortConfig
      ? {
          field: sortConfig.field,
          order: sortConfig.order,
        }
      : undefined
  );
  if (ids && ids.length > 0) {
    allGroups = allGroups.filter((group) => ids.includes(group.id));
  }
  return allGroups;
};
export const isGroupUnique = (groupId: string): boolean => {
  return groupsDataStore.entityExists(groupId);
};
export const createGroup = (input: CreateGroupInput): Group => {
  return groupsDataStore.createEntity(input);
};
export const updateGroup = (groupId: string, input: UpdateGroupInput): Group | null => {
  return groupsDataStore.updateEntity(groupId, input);
};
export const deleteGroup = (groupId: string): Group | null => {
  return groupsDataStore.deleteEntity(groupId);
};
