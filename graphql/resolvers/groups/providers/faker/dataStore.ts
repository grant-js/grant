import fs from 'fs';
import path from 'path';
import { ApolloServerErrorCode } from '@apollo/server/errors';
import {
  Group,
  CreateGroupInput,
  GroupSortableField,
  GroupSortOrder,
  UpdateGroupInput,
} from '@/graphql/generated/types';
import { slugifySafe } from '@/shared/lib/slugify';
import { ApiError } from '@/graphql/errors';

const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'groups.json');

// Ensure the data directory exists
const ensureDataDirectory = () => {
  const dataDir = path.dirname(DATA_FILE_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

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

// Initialize or load the data store
export const initializeDataStore = (): Group[] => {
  ensureDataDirectory();

  if (!fs.existsSync(DATA_FILE_PATH)) {
    const groups = generateInitialGroups();
    fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(groups, null, 2));
    return groups;
  }

  const data = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
  return JSON.parse(data);
};

// Save groups to the data store
export const saveGroups = (groups: Group[]): void => {
  ensureDataDirectory();
  fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(groups, null, 2));
};

// Sort groups based on configuration
export const sortGroups = (
  groups: Group[],
  sortConfig?: { field: GroupSortableField; order: GroupSortOrder }
): Group[] => {
  if (!sortConfig) return groups;
  return [...groups].sort((a, b) => {
    let aValue = a.name.toLowerCase();
    let bValue = b.name.toLowerCase();
    if (aValue === bValue) return 0;
    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;
    const comparison = aValue < bValue ? -1 : 1;
    return sortConfig.order === GroupSortOrder.Asc ? comparison : -comparison;
  });
};

// Get all groups from the data store with optional sorting
export const getGroups = (sortConfig?: {
  field: GroupSortableField;
  order: GroupSortOrder;
}): Group[] => {
  if (!fs.existsSync(DATA_FILE_PATH)) {
    return sortGroups(initializeDataStore(), sortConfig);
  }
  const data = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
  return sortGroups(JSON.parse(data), sortConfig);
};

export const isGroupUnique = (groupId: string): boolean => {
  const groups = getGroups();
  return !groups.some((group) => group.id === groupId);
};

// Create a new group in the data store
export const createGroup = (input: CreateGroupInput): Group => {
  const groups = getGroups();
  const id = slugifySafe(input.name);
  if (!isGroupUnique(id)) {
    throw new ApiError(`Group with id ${id} already exists`, ApolloServerErrorCode.BAD_REQUEST);
  }
  const newGroup: Group = {
    id,
    name: input.name,
    description: input.description,
    permissions: [], // TODO add permissions dynamically
  };
  groups.push(newGroup);
  saveGroups(groups);
  return newGroup;
};

// Update a group in the data store
export const updateGroup = (groupId: string, input: UpdateGroupInput): Group | null => {
  const groups = getGroups();
  const groupIndex = groups.findIndex((group) => group.id === groupId);

  if (groupIndex === -1) {
    return null;
  }

  let updatedGroup: Group = {
    ...groups[groupIndex],
  };

  if (input.name) updatedGroup.name = input.name;
  if (input.description) updatedGroup.description = input.description;

  groups[groupIndex] = updatedGroup;
  saveGroups(groups);
  return updatedGroup;
};

// Delete a group from the data store
export const deleteGroup = (groupId: string): Group | null => {
  const groups = getGroups();
  const groupToDelete = groups.find((group) => group.id === groupId);

  if (!groupToDelete) {
    return null;
  }

  const filteredGroups = groups.filter((group) => group.id !== groupId);
  saveGroups(filteredGroups);
  return groupToDelete;
};
