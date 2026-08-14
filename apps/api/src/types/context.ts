import type { Grant, GrantAuth, ILogger } from '@grantjs/core';
import type { PooledDatabase } from '@grantjs/database';
import type { SupportedLocale } from '@grantjs/i18n';

import type { Handlers } from '@/handlers';
import type { ResourceResolvers } from '@/resource-resolvers';
import type { Services } from '@/services';

export interface RequestContext {
  grant: Grant;
  user: GrantAuth | null;
  handlers: Handlers;
  resourceResolvers: ResourceResolvers;
  /**
   * Queue side effects (e.g. BullMQ enqueue) to run after the HTTP-scoped DB
   * transaction commits — avoids workers seeing uncommitted rows.
   */
  scheduleAfterCommit?: (fn: () => void | Promise<void>) => void;
  requestLogger: ILogger;
  origin: string;
  /** Base URL derived from request (X-Forwarded-Proto/Host or Host); used for issuer and callbacks. */
  requestBaseUrl: string;
  locale: SupportedLocale;
  userAgent: string | null;
  ipAddress: string | null;
}

export interface AppContext {
  services: Services;
  /**
   * The pooled database, not a request transaction — `createAppContext` is only
   * ever called from `server.ts` with the connection itself. Jobs rely on that:
   * `runDemoRefresh` needs a reservable client for its advisory lock.
   */
  db: PooledDatabase;
  grant: Grant;
}
