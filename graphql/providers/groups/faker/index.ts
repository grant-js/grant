import { createGroup } from '@/graphql/providers/groups/faker/createGroup';
import { deleteGroup } from '@/graphql/providers/groups/faker/deleteGroup';
import { getGroups } from '@/graphql/providers/groups/faker/getGroups';
import { updateGroup } from '@/graphql/providers/groups/faker/updateGroup';
import { GroupDataProvider } from '@/graphql/providers/groups/types';

export const groupFakerProvider: GroupDataProvider = {
  getGroups,
  createGroup,
  updateGroup,
  deleteGroup,
};
