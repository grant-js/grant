import type { ProjectApp, Tag } from '@grantjs/schema';

import type { ListHydrator } from '@/lib/list-hydration/list-hydration.lib';

type ScopedTagHydration = {
  tagsByOwnerId: Map<string, Tag[]>;
};

export type ProjectAppListHydrationContext = {
  loadScopedTags: (projectAppIds: string[]) => Promise<ScopedTagHydration>;
};

export const projectAppListHydrators: Array<
  ListHydrator<ProjectApp, ProjectAppListHydrationContext>
> = [
  {
    fields: ['tags'],
    hydrate: async ({ context, items }) => {
      const projectAppIds = items.map((projectApp) => projectApp.id);
      const hydration = await context.loadScopedTags(projectAppIds);

      return items.map((projectApp) => ({
        ...projectApp,
        tags: hydration.tagsByOwnerId.get(projectApp.id) ?? [],
        __scopedTagsHydrated: true,
      }));
    },
  },
];
