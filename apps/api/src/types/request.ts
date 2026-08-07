import { GrantAuth } from '@grantjs/core';
import { Request } from 'express';

import { RequestContext } from './context';

interface AuthenticatedRequest extends Request {
  user?: GrantAuth | null;
  audience?: string;
}

export interface ContextRequest extends AuthenticatedRequest {
  context: RequestContext;
}
