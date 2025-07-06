import { GroupDataProvider } from '@/graphql/resolvers/groups/providers/types';
import { getGroups } from './getGroups';
import { createGroup } from './createGroup';
import { updateGroup } from './updateGroup';
import { deleteGroup } from './deleteGroup';

export const groupFakerProvider: GroupDataProvider = {
  getGroups,
  createGroup,
  updateGroup,
  deleteGroup,
};
