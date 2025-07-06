import { GroupDataProvider } from '@/graphql/providers/groups/types';
import { getGroups } from '@/graphql/providers/groups/faker/getGroups';
import { createGroup } from '@/graphql/providers/groups/faker/createGroup';
import { updateGroup } from '@/graphql/providers/groups/faker/updateGroup';
import { deleteGroup } from '@/graphql/providers/groups/faker/deleteGroup';

export const groupFakerProvider: GroupDataProvider = {
  getGroups,
  createGroup,
  updateGroup,
  deleteGroup,
};
