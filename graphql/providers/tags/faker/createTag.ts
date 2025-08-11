import { MutationCreateTagArgs, Tag } from '@/graphql/generated/types';

import { createTag as createTagInStore } from './dataStore';
export const createTag = async (params: MutationCreateTagArgs): Promise<Tag> => {
  const { input } = params;
  return createTagInStore(input);
};
