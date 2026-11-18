import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import {
  GetProjectAppFormDataDocument,
  type GetProjectAppFormDataQuery,
  type Scope,
} from '@grantjs/schema';

import { type ScopeSlugOption, toScopeSlugOptions } from '@/lib/project-app-scope-slugs';

export type { ScopeSlugOption };

interface ProjectRoleOption {
  id: string;
  name: string;
}

interface UseProjectAppFormDataResult {
  projectRoles: ProjectRoleOption[];
  scopeSlugs: ScopeSlugOption[];
  loading: boolean;
  error: Error | undefined;
  refetch: () => Promise<unknown>;
}

/**
 * Fetches project roles and permissions (as scope slugs) for the project app create/edit form.
 * Used to populate sign-up role dropdown and scopes checklist.
 */
export function useProjectAppFormData(
  scope: Scope | null | undefined,
  projectId: string | null | undefined
): UseProjectAppFormDataResult {
  const skip = !scope?.id || !scope?.tenant || !projectId;

  const { data, loading, error, refetch } = useQuery<GetProjectAppFormDataQuery>(
    GetProjectAppFormDataDocument,
    {
      variables: { scope: scope!, projectId: projectId! },
      skip,
      fetchPolicy: 'cache-and-network',
    }
  );

  const project = data?.projects?.projects?.[0];

  const projectRoles = useMemo((): ProjectRoleOption[] => {
    if (!project?.roles) return [];
    return project.roles
      .filter(
        (r): r is { id: string; name: string } =>
          !!r && !!r.name && !r.name.startsWith('synthetic:')
      )
      .map((r) => ({
        id: r.id,
        name: r.name,
      }));
  }, [project]);

  const scopeSlugs = useMemo(
    (): ScopeSlugOption[] => toScopeSlugOptions(project?.permissions ?? []),
    [project]
  );

  return {
    projectRoles,
    scopeSlugs,
    loading,
    error: error ?? undefined,
    refetch,
  };
}
