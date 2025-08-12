import { addGroupTag } from '@/graphql/providers/group-tags/faker/addGroupTag';
import { getGroupTags } from '@/graphql/providers/group-tags/faker/getGroupTags';
import { removeGroupTag } from '@/graphql/providers/group-tags/faker/removeGroupTag';
import { GroupTagDataProvider } from '@/graphql/providers/group-tags/types';
export const groupTagFakerProvider: GroupTagDataProvider = {
  getGroupTags,
  addGroupTag,
  removeGroupTag,
};
