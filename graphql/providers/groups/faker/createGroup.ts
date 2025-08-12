import { Group, MutationCreateGroupArgs } from '@/graphql/generated/types';
import { createGroup as createGroupInStore } from '@/graphql/providers/groups/faker/dataStore';
export async function createGroup({ input }: MutationCreateGroupArgs): Promise<Group> {
  const groupData = createGroupInStore(input);
  return groupData;
}
