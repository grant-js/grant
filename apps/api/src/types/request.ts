import { GrantAuth } from '@grantjs/core';
import type { Scope } from '@grantjs/schema';
import { Request } from 'express';

import { RequestContext } from './context';

export interface ScopeRequest extends Request {
  requestScope: Scope | null;
}

interface AuthenticatedRequest extends Request {
  user?: GrantAuth | null;
  audience?: string;
}

export interface ContextRequest extends AuthenticatedRequest {
  context: RequestContext;
}
