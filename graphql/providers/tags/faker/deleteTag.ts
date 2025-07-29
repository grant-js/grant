import { DeleteTagParams, DeleteTagResult } from '@/graphql/providers/tags/types';

import { deleteTag as deleteTagInStore } from './dataStore';

export const deleteTag = async (params: DeleteTagParams): Promise<DeleteTagResult> => {
  const { id } = params;
  const deletedTag = deleteTagInStore(id);

  if (!deletedTag) {
    throw new Error(`Tag with id ${id} not found`);
  }

  return deletedTag;
};
