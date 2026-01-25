import { Request } from 'express';

import { ResourceResolver, ResourceResolverParams } from '@/lib/authorization';

import { extractResourceId } from './common.resolver';

export interface UserResourceData {
  id: string;
}

function extractUserId(request: Request): string | null {
  return extractResourceId(request, 'userId');
}

export function createUserResourceResolver(): ResourceResolver<UserResourceData> {
  return async (params: ResourceResolverParams): Promise<UserResourceData | null> => {
    const { request } = params;

    const userId: string | null = extractUserId(request);

    if (!userId) {
      return null;
    }

    return {
      id: userId,
    };
  };
}
