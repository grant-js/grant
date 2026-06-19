import type { Resource, Tag } from '@grantjs/schema';

import type { ListHydrator } from '@/lib/list-hydration/list-hydration.lib';

type ScopedTagHydration = {
  tagsByOwnerId: Map<string, Tag[]>;
};

export type ResourceListHydrationContext = {
  loadScopedTags: (resourceIds: string[]) => Promise<ScopedTagHydration>;
};

export const resourceListHydrators: Array<ListHydrator<Resource, ResourceListHydrationContext>> = [
  {
    fields: ['tags'],
    hydrate: async ({ context, items }) => {
      const resourceIds = items.map((resource) => resource.id);
      const hydration = await context.loadScopedTags(resourceIds);

      return items.map((resource) => ({
        ...resource,
        tags: hydration.tagsByOwnerId.get(resource.id) ?? [],
        __scopedTagsHydrated: true,
      }));
    },
  },
];
