import { userTagTagResolver } from '@/graphql/resolvers/user-tags/fields/tag';
import { userTagUserResolver } from '@/graphql/resolvers/user-tags/fields/user';

export const UserTag = {
  user: userTagUserResolver,
  tag: userTagTagResolver,
};
