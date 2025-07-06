import { CreateGroupParams, CreateGroupResult } from '@/graphql/providers/groups/types';
import { createGroup as createGroupInStore } from '@/graphql/providers/groups/faker/dataStore';

export async function createGroup({ input }: CreateGroupParams): Promise<CreateGroupResult> {
  return createGroupInStore(input);
}
