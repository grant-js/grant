import { MutationRemoveGroupTagArgs, GroupTag } from '@/graphql/generated/types';
import { deleteGroupTagByGroupAndTag } from '@/graphql/providers/group-tags/faker/dataStore';

export async function removeGroupTag({ input }: MutationRemoveGroupTagArgs): Promise<GroupTag> {
  const deletedGroupTag = deleteGroupTagByGroupAndTag(input.groupId, input.tagId);

  if (!deletedGroupTag) {
    throw new Error('Group tag relationship not found');
  }

  return deletedGroupTag;
}
