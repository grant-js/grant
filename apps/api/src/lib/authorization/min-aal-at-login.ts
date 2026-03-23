import {
  type Aal,
  downgradeAalIfMfaStale,
  getAalFromTokenClaims,
  satisfiesMinAal,
} from '@grantjs/core';
import { TokenType } from '@grantjs/schema';
import { NextFunction, Request, Response } from 'express';
import { getOperationAST, parse } from 'graphql';

import { config } from '@/config';
import type { GraphqlContext } from '@/graphql/types';
import { AuthorizationError } from '@/lib/errors';
import type { ContextRequest } from '@/types';
import type { RequestContext } from '@/types';

/**
 * Governed allowlist: GraphQL operation names permitted with an AAL1 session when
 * `minAalAtLogin` is `aal2` and the user has MFA enrolled. Treat like RBAC — do not expand casually.
 */
export const SAFE_AAL1_GRAPHQL_OPERATION_NAMES = new Set([
  'Me',
  'RefreshSession',
  'VerifyMfa',
  'VerifyMfaRecoveryCode',
  'LogoutMyUser',
  'IntrospectionQuery',
  'CreateMyMfaEnrollment',
  'VerifyMyMfaEnrollment',
  'MyMfaDevices',
]);

/**
 * REST paths (full path from root, no query) allowed with AAL1 under the same policy.
 */
export const SAFE_AAL1_REST_FULL_PATHS = new Set([
  '/api/config',
  '/api/auth/refresh',
  '/api/auth/mfa/verify',
  '/api/auth/mfa/recovery/verify',
  '/api/me/logout',
]);

function needsMinAalStepUp(tokenAal: Aal): boolean {
  return config.auth.minAalAtLogin === 'aal2' && !satisfiesMinAal(tokenAal, 'aal2');
}

function tokenAalFromUser(user: NonNullable<RequestContext['user']>): Aal {
  const base =
    user.aal ??
    getAalFromTokenClaims({
      acr: user.acr,
      amr: user.amr,
      mfaVerified: user.mfaVerified,
    });
  return downgradeAalIfMfaStale(
    base,
    { mfa_auth_time: user.mfaAuthTime, mfaVerified: user.mfaVerified },
    config.auth.mfaStepUpMaxAgeSeconds
  );
}

/**
 * Throws `MFA_REQUIRED` when the session must step up to AAL2 before calling this operation.
 */
export async function assertMinAalAtLoginGraphql(
  context: GraphqlContext,
  operationName: string | null | undefined
): Promise<void> {
  const user = context.user;
  if (!user || user.type !== TokenType.Session) {
    return;
  }
  if (config.auth.minAalAtLogin !== 'aal2') {
    return;
  }
  if (!needsMinAalStepUp(tokenAalFromUser(user))) {
    return;
  }
  if (operationName == null || operationName === '') {
    return;
  }

  const enrolled = await context.handlers.me.hasActiveMfaEnrollmentForUser(user.userId);
  if (!enrolled) {
    return;
  }
  if (SAFE_AAL1_GRAPHQL_OPERATION_NAMES.has(operationName)) {
    return;
  }
  throw new AuthorizationError('MFA required', 'MFA_REQUIRED');
}

/**
 * Express middleware: enforce minimum AAL for `/api` routes (runs after context middleware).
 */
function extractGraphqlOperationName(req: Request): string | undefined {
  const body = req.body as { query?: string; operationName?: string | null } | undefined;
  if (body?.operationName) {
    return body.operationName;
  }
  if (body?.query && typeof body.query === 'string') {
    try {
      const doc = parse(body.query);
      const op = getOperationAST(doc, body.operationName ?? undefined);
      if (op?.kind === 'OperationDefinition' && op.name) {
        return op.name.value;
      }
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/**
 * Runs before Apollo — enforces min-AAL policy using operation name from the GraphQL request body.
 */
export function graphqlMinAalAtLoginMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (req.method === 'GET') {
    next();
    return;
  }
  const run = async (): Promise<void> => {
    const ctx = (req as ContextRequest).context;
    if (!ctx) {
      return;
    }
    const opName = extractGraphqlOperationName(req);
    const gqlCtx = { ...ctx, req, res: _res } as GraphqlContext;
    await assertMinAalAtLoginGraphql(gqlCtx, opName);
  };
  void run()
    .then(() => next())
    .catch(next);
}

export function minAalAtLoginRestMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const run = async (): Promise<void> => {
    const ctx = (req as ContextRequest).context;
    const user = ctx?.user;
    if (!user || user.type !== TokenType.Session) {
      return;
    }
    if (config.auth.minAalAtLogin !== 'aal2') {
      return;
    }
    if (!needsMinAalStepUp(tokenAalFromUser(user))) {
      return;
    }
    const enrolled = await ctx.handlers.me.hasActiveMfaEnrollmentForUser(user.userId);
    if (!enrolled) {
      return;
    }
    const normalized = (req.originalUrl.split('?')[0] ?? '').replace(/\/$/, '') || '/';
    if (SAFE_AAL1_REST_FULL_PATHS.has(normalized)) {
      return;
    }
    throw new AuthorizationError('MFA required', 'MFA_REQUIRED');
  };

  void run().then(next).catch(next);
}
