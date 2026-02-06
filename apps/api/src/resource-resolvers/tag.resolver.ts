import { ResourceResolver, ResourceResolverParams } from '@/lib/authorization';
import { ResourceResolverRequest } from '@/lib/authorization/types';

import { extractResourceId } from './common.resolver';

export interface TagResourceData {
  id: string;
  scope: {
    tags: string[];
  };
}

function extractTagId(request: ResourceResolverRequest): string | null {
  return extractResourceId(request);
}

export function createTagResourceResolver(): ResourceResolver<TagResourceData> {
  return async (params: ResourceResolverParams): Promise<TagResourceData | null> => {
    const { scope, request, context } = params;

    const tagId: string | null = extractTagId(request);

    if (!tagId) {
      return null;
    }

    const scopeTagIds = await context.handlers.tags.getScopedTagIds(scope);

    return {
      id: tagId,
      scope: {
        tags: scopeTagIds,
      },
    };
  };
}
