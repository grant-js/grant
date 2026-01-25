import { ResourceResolver, ResourceResolverParams } from '@/lib/authorization';
import { ResourceResolverRequest } from '@/lib/authorization/types';

import { extractResourceId } from './common.resolver';

export interface ProjectResourceData {
  id: string;
  scope: {
    projects: string[];
  };
}

function extractProjectId(request: ResourceResolverRequest): string | null {
  return extractResourceId(request);
}

export function createProjectResourceResolver(): ResourceResolver<ProjectResourceData> {
  return async (params: ResourceResolverParams): Promise<ProjectResourceData | null> => {
    const { scope, request, context } = params;

    const projectId: string | null = extractProjectId(request);

    if (!projectId) {
      return null;
    }

    const scopeProjectIds = await context.handlers.projects.getScopedProjectIds(scope);

    return {
      id: projectId,
      scope: {
        projects: scopeProjectIds,
      },
    };
  };
}
