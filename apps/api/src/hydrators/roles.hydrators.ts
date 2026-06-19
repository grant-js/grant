import type { Role, Tag } from '@grantjs/schema';

import type { ListHydrator } from '@/lib/list-hydration/list-hydration.lib';

type ScopedTagHydration = {
  primaryTagByOwnerId: Map<string, Tag | null>;
  tagCountByOwnerId: Map<string, number>;
  tagsByOwnerId: Map<string, Tag[]>;
};

export type RoleListHydrationContext = {
  countGroups: (roleIds: string[]) => Promise<Map<string, number>>;
  countPermissions: (roleIds: string[]) => Promise<Map<string, number>>;
  loadScopedTags: (roleIds: string[]) => Promise<ScopedTagHydration>;
};

export const roleListHydrators: Array<ListHydrator<Role, RoleListHydrationContext>> = [
  {
    fields: ['tags', 'primaryTag', 'tagCount'],
    hydrate: async ({ context, items, requestedFields }) => {
      const roleIds = items.map((role) => role.id);
      const wantsTags = requestedFields.includes('tags');
      const wantsPrimaryTag = requestedFields.includes('primaryTag');
      const wantsTagCount = requestedFields.includes('tagCount');
      const hydration = await context.loadScopedTags(roleIds);

      return items.map((role) => ({
        ...role,
        ...(wantsTags ? { tags: hydration.tagsByOwnerId.get(role.id) ?? [] } : {}),
        ...(wantsPrimaryTag
          ? { primaryTag: hydration.primaryTagByOwnerId.get(role.id) ?? null }
          : {}),
        ...(wantsTagCount ? { tagCount: hydration.tagCountByOwnerId.get(role.id) ?? 0 } : {}),
        __scopedTagsHydrated: true,
      }));
    },
  },
  {
    fields: ['groupCount'],
    hydrate: async ({ context, items }) => {
      const counts = await context.countGroups(items.map((role) => role.id));

      return items.map((role) => ({
        ...role,
        groupCount: counts.get(role.id) ?? 0,
      }));
    },
  },
  {
    fields: ['permissionCount'],
    hydrate: async ({ context, items }) => {
      const counts = await context.countPermissions(items.map((role) => role.id));

      return items.map((role) => ({
        ...role,
        permissionCount: counts.get(role.id) ?? 0,
      }));
    },
  },
];
