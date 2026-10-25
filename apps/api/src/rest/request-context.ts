import type { Request } from 'express';

import type { ContextRequest, RequestContext } from '@/types';

/**
 * Handlers on a long-lived REST router read the request context, not a snapshot
 * closed over at router construction. `fallback` is for tests that mount a
 * factory with a fixed context and never run `contextMiddleware`.
 */
export function requestContext(req: Request, fallback?: RequestContext): RequestContext {
  return (req as ContextRequest).context ?? fallback!;
}
