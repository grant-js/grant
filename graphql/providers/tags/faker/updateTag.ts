import { UpdateTagParams, UpdateTagResult } from '@/graphql/providers/tags/types';

import { updateTag as updateTagInStore } from './dataStore';

export const updateTag = async (params: UpdateTagParams): Promise<UpdateTagResult> => {
  const { id, input } = params;
  const updatedTag = updateTagInStore(id, input);

  if (!updatedTag) {
    throw new Error(`Tag with id ${id} not found`);
  }

  return updatedTag;
};
