import { MutationDeleteTagArgs } from '@/graphql/generated/types';

import { deleteTag as deleteTagInStore } from './dataStore';

export const deleteTag = async (params: MutationDeleteTagArgs): Promise<boolean> => {
  const { id } = params;
  const deletedTag = deleteTagInStore(id);

  if (!deletedTag) {
    throw new Error(`Tag with id ${id} not found`);
  }

  return deletedTag !== null;
};
