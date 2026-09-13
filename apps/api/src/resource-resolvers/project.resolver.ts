import {
  extractScopeFromResolverRequest,
  ResourceResolver,
  ResourceResolverParams,
} from '@/lib/authorization';
import { ResourceResolverRequest } from '@/lib/authorization/types';

import { extractResourceId } from './common.resolver';

export interface ProjectResourceData {
  id: string;
  scope: {
    projects: string[];
  };
}

function extractProjectId(request: ResourceResolverRequest): string | null {
  return extractResourceId(request) ?? extractResourceId(request, 'projectId');
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

/**
 * Resolves project-app resource for both GraphQL and REST.
 * Scope from: request.scope (body), request.input.scope (GraphQL), or request.query.scopeId + request.query.tenant (REST).
 * Uses shared extractScopeFromResolverRequest; returns ProjectResourceData so In(resource.id, resource.scope.projects) condition applies.
 */
export function createProjectAppResourceResolver(): ResourceResolver<ProjectResourceData> {
  return async (params: ResourceResolverParams): Promise<ProjectResourceData | null> => {
    const { scope, request, context } = params;

    const requestScope = extractScopeFromResolverRequest(request);
    if (!requestScope) {
      return null;
    }

    const parts = requestScope.id.split(':');
    const projectId = parts.length >= 2 ? parts[1]! : null;
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
