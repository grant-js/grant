import { useCallback } from 'react';

import { Project, Tag, Tenant } from '@grantjs/schema';

import { useProjectScope } from './use-project-scope';

export function useProjectTags() {
  const scope = useProjectScope();

  return useCallback(
    (project: Project): Tag[] => {
      if (scope?.tenant === Tenant.Organization) {
        return project.organizationTags || [];
      }
      if (scope?.tenant === Tenant.Account) {
        return project.accountTags || [];
      }
      return project.tags || [];
    },
    [scope]
  );
}
