import { createTag } from '@/graphql/providers/tags/faker/createTag';
import { deleteTag } from '@/graphql/providers/tags/faker/deleteTag';
import { getTags } from '@/graphql/providers/tags/faker/getTags';
import { updateTag } from '@/graphql/providers/tags/faker/updateTag';
import { TagDataProvider } from '@/graphql/providers/tags/types';

export const tagFakerProvider: TagDataProvider = {
  getTags,
  createTag,
  updateTag,
  deleteTag,
};
