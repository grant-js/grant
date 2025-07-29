import { GroupTagDataProvider } from '@/graphql/providers/group-tags/types';
import { getGroupTags } from '@/graphql/providers/group-tags/faker/getGroupTags';
import { addGroupTag } from '@/graphql/providers/group-tags/faker/addGroupTag';
import { removeGroupTag } from '@/graphql/providers/group-tags/faker/removeGroupTag';

export const groupTagFakerProvider: GroupTagDataProvider = {
  getGroupTags,
  addGroupTag,
  removeGroupTag,
};
