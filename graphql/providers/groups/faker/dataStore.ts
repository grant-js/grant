import {
  Group,
  CreateGroupInput,
  UpdateGroupInput,
  GroupSortInput,
} from '@/graphql/generated/types';
import { createFakerDataStore, EntityConfig } from '@/lib/providers/faker';
import { slugifySafe } from '@/shared/lib/slugify';

// Generate initial groups (hardcoded)
const generateInitialGroups = (): Group[] => [
  {
    id: 'admin',
    name: 'Admin',
    description: 'Admin  group with all permissions',
    permissions: [],
  },
  {
    id: 'support-invoice',
    name: 'Support Invoice',
    description: 'Support invoice group with all support invoice permissions',
    permissions: [],
  },
  {
    id: 'support-accounting',
    name: 'Support Invoice',
    description: 'Support invoice group with all support accounting permissions',
    permissions: [],
  },
  {
    id: 'support-payment',
    name: 'Support Payment',
    description: 'Support payment group with all support payment permissions',
    permissions: [],
  },
  {
    id: 'support-policy',
    name: 'Support Policy',
    description: 'Support policy group with all support policy permissions',
    permissions: [],
  },
  {
    id: 'support-claim',
    name: 'Support Claim',
    description: 'Support claim group with all support claim permissions',
    permissions: [],
  },
  {
    id: 'support-configuration',
    name: 'Support Configuration',
    description: 'Support configuration group with all support configuration permissions',
    permissions: [],
  },
  {
    id: 'support-document',
    name: 'Support Document',
    description: 'Support document group with all support document permissions',
    permissions: [],
  },
  {
    id: 'support-workflow',
    name: 'Support Workflow',
    description: 'Support workflow group with all support workflow permissions',
    permissions: [],
  },
  {
    id: 'support-partnership',
    name: 'Support Partnership',
    description: 'Support partnership group with all support partnership permissions',
    permissions: [],
  },
  {
    id: 'support-commssion',
    name: 'Support Commssion',
    description: 'Support commssion group with all support commssion permissions',
    permissions: [],
  },
  {
    id: 'support-quotation',
    name: 'Support Quotation',
    description: 'Support quotation group with all support quotation permissions',
    permissions: [],
  },
  {
    id: 'partner-invoice',
    name: 'Partner Invoice',
    description: 'Partner invoice group with all partner invoice permissions',
    permissions: [],
  },
  {
    id: 'partner-accounting',
    name: 'Partner Invoice',
    description: 'Partner invoice group with all partner accounting permissions',
    permissions: [],
  },
  {
    id: 'partner-payment',
    name: 'Partner Payment',
    description: 'Partner payment group with all partner payment permissions',
    permissions: [],
  },
  {
    id: 'partner-policy',
    name: 'Partner Policy',
    description: 'Partner policy group with all partner policy permissions',
    permissions: [],
  },
  {
    id: 'partner-claim',
    name: 'Partner Claim',
    description: 'Partner claim group with all partner claim permissions',
    permissions: [],
  },
  {
    id: 'partner-configuration',
    name: 'Partner Configuration',
    description: 'Partner configuration group with all partner configuration permissions',
    permissions: [],
  },
  {
    id: 'partner-document',
    name: 'Partner Document',
    description: 'Partner document group with all partner document permissions',
    permissions: [],
  },
  {
    id: 'partner-workflow',
    name: 'Partner Workflow',
    description: 'Partner workflow group with all partner workflow permissions',
    permissions: [],
  },
  {
    id: 'partner-partnership',
    name: 'Partner Partnership',
    description: 'Partner partnership group with all partner partnership permissions',
    permissions: [],
  },
  {
    id: 'partner-commssion',
    name: 'Partner Commssion',
    description: 'Partner commssion group with all partner commssion permissions',
    permissions: [],
  },
  {
    id: 'partner-quotation',
    name: 'Partner Quotation',
    description: 'Partner quotation group with all partner quotation permissions',
    permissions: [],
  },
];

// Groups-specific configuration
const groupsConfig: EntityConfig<Group, CreateGroupInput, UpdateGroupInput> = {
  entityName: 'Group',
  dataFileName: 'groups.json',

  // Generate slugified ID from name
  generateId: (input: CreateGroupInput) => slugifySafe(input.name),

  // Generate group entity from input
  generateEntity: (input: CreateGroupInput, id: string): Group => ({
    id,
    name: input.name,
    description: input.description || '',
    permissions: [], // TODO add permissions dynamically
  }),

  // Update group entity
  updateEntity: (entity: Group, input: UpdateGroupInput): Group => ({
    ...entity,
    name: input.name || entity.name,
    description: input.description || entity.description,
  }),

  // Sortable fields
  sortableFields: ['name'],

  // Validation rules
  validationRules: [
    { field: 'id', unique: true },
    { field: 'name', unique: true, required: true },
  ],

  // Initial data
  initialData: generateInitialGroups,
};

// Create the groups data store instance
export const groupsDataStore = createFakerDataStore(groupsConfig);

// Export the main functions with the same interface as the original
export const initializeDataStore = () => groupsDataStore.getEntities();
export const saveGroups = (groups: Group[]) => {
  // This is handled internally by the data store
  // We keep this for backward compatibility but it's a no-op
};
export const sortGroups = (groups: Group[], sortConfig?: GroupSortInput): Group[] => {
  if (!sortConfig) return groups;

  return groupsDataStore.getEntities({
    field: sortConfig.field,
    order: sortConfig.order,
  });
};
export const getGroups = (sortConfig?: GroupSortInput): Group[] => {
  return groupsDataStore.getEntities(
    sortConfig
      ? {
          field: sortConfig.field,
          order: sortConfig.order,
        }
      : undefined
  );
};
export const isGroupUnique = (groupId: string): boolean => {
  return !groupsDataStore.entityExists(groupId);
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
