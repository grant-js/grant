import { MutationUpdateTagArgs, Tag } from '@/graphql/generated/types';

import { updateTag as updateTagInStore } from './dataStore';
export const updateTag = async (params: MutationUpdateTagArgs): Promise<Tag> => {
  const { id, input } = params;
  const updatedTag = updateTagInStore(id, input);
  if (!updatedTag) {
    throw new Error(`Tag with id ${id} not found`);
  }
  return updatedTag;
};
