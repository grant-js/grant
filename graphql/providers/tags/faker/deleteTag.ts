import { MutationDeleteTagArgs, Tag } from '@/graphql/generated/types';

import { deleteTag as deleteTagInStore } from './dataStore';
export const deleteTag = async (params: MutationDeleteTagArgs): Promise<Tag> => {
  const { id } = params;
  const deletedTag = deleteTagInStore(id);
  if (!deletedTag) {
    throw new Error(`Tag with id ${id} not found`);
  }
  return deletedTag;
};
