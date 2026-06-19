import type { Group, Tag } from '@grantjs/schema';

import type { ListHydrator } from '@/lib/list-hydration/list-hydration.lib';

type ScopedTagHydration = {
  primaryTagByOwnerId: Map<string, Tag | null>;
  tagCountByOwnerId: Map<string, number>;
  tagsByOwnerId: Map<string, Tag[]>;
};

export type GroupListHydrationContext = {
  countPermissions: (groupIds: string[]) => Promise<Map<string, number>>;
  loadScopedTags: (groupIds: string[]) => Promise<ScopedTagHydration>;
};

export const groupListHydrators: Array<ListHydrator<Group, GroupListHydrationContext>> = [
  {
    fields: ['tags', 'primaryTag', 'tagCount'],
    hydrate: async ({ context, items, requestedFields }) => {
      const groupIds = items.map((group) => group.id);
      const wantsTags = requestedFields.includes('tags');
      const wantsPrimaryTag = requestedFields.includes('primaryTag');
      const wantsTagCount = requestedFields.includes('tagCount');
      const hydration = await context.loadScopedTags(groupIds);

      return items.map((group) => ({
        ...group,
        ...(wantsTags ? { tags: hydration.tagsByOwnerId.get(group.id) ?? [] } : {}),
        ...(wantsPrimaryTag
          ? { primaryTag: hydration.primaryTagByOwnerId.get(group.id) ?? null }
          : {}),
        ...(wantsTagCount ? { tagCount: hydration.tagCountByOwnerId.get(group.id) ?? 0 } : {}),
        __scopedTagsHydrated: true,
      }));
    },
  },
  {
    fields: ['permissionCount'],
    hydrate: async ({ context, items }) => {
      const counts = await context.countPermissions(items.map((group) => group.id));

      return items.map((group) => ({
        ...group,
        permissionCount: counts.get(group.id) ?? 0,
      }));
    },
  },
];
