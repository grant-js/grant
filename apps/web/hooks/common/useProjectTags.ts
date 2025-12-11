import { useCallback } from 'react';

import { Project, Tag, Tenant } from '@logusgraphics/grant-schema';

import { useProjectScope } from './useProjectScope';

export function useProjectTags() {
  const scope = useProjectScope();

  return useCallback(
    (project: Project): Tag[] => {
      if (scope?.tenant === Tenant.Organization) {
        return project.organizationTags || [];
      }
      return project.tags || [];
    },
    [scope]
  );
}
