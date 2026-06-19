import type { Tag, User } from '@grantjs/schema';

import type { ListHydrator } from '@/lib/list-hydration/list-hydration.lib';

type ScopedTagHydration = {
  primaryTagByOwnerId: Map<string, Tag | null>;
  tagCountByOwnerId: Map<string, number>;
  tagsByOwnerId: Map<string, Tag[]>;
};

export type UserListHydrationContext = {
  countPermissions: (userIds: string[]) => Promise<Map<string, number>>;
  countProjectUserApiKeys: (userIds: string[]) => Promise<Map<string, number>>;
  countRoles: (userIds: string[]) => Promise<Map<string, number>>;
  loadScopedTags: (userIds: string[]) => Promise<ScopedTagHydration>;
};

export const userListHydrators: Array<ListHydrator<User, UserListHydrationContext>> = [
  {
    fields: ['tags', 'primaryTag', 'tagCount'],
    hydrate: async ({ context, items, requestedFields }) => {
      const userIds = items.map((user) => user.id);
      const wantsTags = requestedFields.includes('tags');
      const wantsPrimaryTag = requestedFields.includes('primaryTag');
      const wantsTagCount = requestedFields.includes('tagCount');
      const hydration = await context.loadScopedTags(userIds);

      return items.map((user) => ({
        ...user,
        ...(wantsTags ? { tags: hydration.tagsByOwnerId.get(user.id) ?? [] } : {}),
        ...(wantsPrimaryTag
          ? { primaryTag: hydration.primaryTagByOwnerId.get(user.id) ?? null }
          : {}),
        ...(wantsTagCount ? { tagCount: hydration.tagCountByOwnerId.get(user.id) ?? 0 } : {}),
        __scopedTagsHydrated: true,
      }));
    },
  },
  {
    fields: ['roleCount'],
    hydrate: async ({ context, items }) => {
      const counts = await context.countRoles(items.map((user) => user.id));

      return items.map((user) => ({
        ...user,
        roleCount: counts.get(user.id) ?? 0,
      }));
    },
  },
  {
    fields: ['permissionCount'],
    hydrate: async ({ context, items }) => {
      const counts = await context.countPermissions(items.map((user) => user.id));

      return items.map((user) => ({
        ...user,
        permissionCount: counts.get(user.id) ?? 0,
      }));
    },
  },
  {
    fields: ['projectUserApiKeyCount'],
    hydrate: async ({ context, items }) => {
      const counts = await context.countProjectUserApiKeys(items.map((user) => user.id));

      return items.map((user) => ({
        ...user,
        projectUserApiKeyCount: counts.get(user.id) ?? 0,
      }));
    },
  },
];
