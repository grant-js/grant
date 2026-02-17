import type { Handlers } from '@/handlers';
import type { ResourceResolvers } from '@/resource-resolvers';
import type { Services } from '@/services';

import type { Grant, GrantAuth, ILogger } from '@grantjs/core';
import type { DbSchema } from '@grantjs/database';
import type { SupportedLocale } from '@grantjs/i18n';

export interface RequestContext {
  grant: Grant;
  user: GrantAuth | null;
  handlers: Handlers;
  resourceResolvers: ResourceResolvers;
  requestLogger: ILogger;
  origin: string;
  locale: SupportedLocale;
  userAgent: string | null;
  ipAddress: string | null;
}

export interface AppContext {
  services: Services;
  db: DbSchema;
  grant: Grant;
}
