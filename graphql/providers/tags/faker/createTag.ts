import { CreateTagParams, CreateTagResult } from '@/graphql/providers/tags/types';

import { createTag as createTagInStore } from './dataStore';

export const createTag = async (params: CreateTagParams): Promise<CreateTagResult> => {
  const { input } = params;
  return createTagInStore(input);
};
