import { GrantAuth } from '@grantjs/core';
import { Request } from 'express';

import { RequestContext } from './context';

import type { Scope } from '@grantjs/schema';

export interface ScopeRequest extends Request {
  requestScope: Scope | null;
}

export interface AuthenticatedRequest extends Request {
  user?: GrantAuth | null;
  audience?: string;
}

export interface ContextRequest extends AuthenticatedRequest {
  context: RequestContext;
}
