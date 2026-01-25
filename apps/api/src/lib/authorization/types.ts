import { Scope } from '@grantjs/schema';
import { Request } from 'express';

import { RequestContext } from '@/types';

export type ResourceResolverRequest = Request | any;
export interface ResourceResolverParams {
  resourceSlug: string;
  scope: Scope;
  context: RequestContext;
  request: ResourceResolverRequest;
  [key: string]: unknown;
}

export type ResourceResolverResult<T = Record<string, unknown>> = T | null;

export type ResourceResolver<TResult = Record<string, unknown>> = (
  params: ResourceResolverParams
) => Promise<ResourceResolverResult<TResult>>;
