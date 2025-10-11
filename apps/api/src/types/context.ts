import { AuthenticatedUser } from './auth';

import { Handlers } from '@/handlers';

export interface RequestContext {
  user: AuthenticatedUser | null;
  handlers: Handlers;
  origin: string;
}
