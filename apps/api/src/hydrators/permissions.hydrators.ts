import type { Permission, Tag } from '@grantjs/schema';

import type { ListHydrator } from '@/lib/list-hydration/list-hydration.lib';

type ScopedTagHydration = {
  primaryTagByOwnerId: Map<string, Tag | null>;
  tagCountByOwnerId: Map<string, number>;
  tagsByOwnerId: Map<string, Tag[]>;
};

export type PermissionListHydrationContext = {
  loadScopedTags: (permissionIds: string[]) => Promise<ScopedTagHydration>;
};

export const permissionListHydrators: Array<
  ListHydrator<Permission, PermissionListHydrationContext>
> = [
  {
    fields: ['tags', 'primaryTag', 'tagCount'],
    hydrate: async ({ context, items, requestedFields }) => {
      const permissionIds = items.map((permission) => permission.id);
      const wantsTags = requestedFields.includes('tags');
      const wantsPrimaryTag = requestedFields.includes('primaryTag');
      const wantsTagCount = requestedFields.includes('tagCount');
      const hydration = await context.loadScopedTags(permissionIds);

      return items.map((permission) => ({
        ...permission,
        ...(wantsTags ? { tags: hydration.tagsByOwnerId.get(permission.id) ?? [] } : {}),
        ...(wantsPrimaryTag
          ? { primaryTag: hydration.primaryTagByOwnerId.get(permission.id) ?? null }
          : {}),
        ...(wantsTagCount ? { tagCount: hydration.tagCountByOwnerId.get(permission.id) ?? 0 } : {}),
        __scopedTagsHydrated: true,
      }));
    },
  },
];
