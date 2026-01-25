import { SupportedLocale } from '@grantjs/constants';
import { GrantAuth } from '@grantjs/core';

import { Handlers } from '@/handlers';
import { ResourceResolvers } from '@/resource-resolvers';

export interface RequestContext {
  user: GrantAuth | null;
  handlers: Handlers;
  resourceResolvers: ResourceResolvers;
  origin: string;
  locale: SupportedLocale;
  userAgent: string | null;
  ipAddress: string | null;
}
