import type { Request } from 'express';
import { describe, expect, it } from 'vitest';

import { requestContext } from '@/rest/request-context';
import type { ContextRequest, RequestContext } from '@/types';

describe('requestContext', () => {
  it('reads the context attached by contextMiddleware', () => {
    const attached = { locale: 'en' } as RequestContext;
    const req = { context: attached } as ContextRequest;
    expect(requestContext(req)).toBe(attached);
  });

  it('uses the factory fallback when the request has no context', () => {
    const fallback = { locale: 'de' } as RequestContext;
    const req = {} as Request;
    expect(requestContext(req, fallback)).toBe(fallback);
  });
});
