/**
 * Rejects requests that did not arrive through the CDN.
 *
 * The AWS target puts CloudFront in front of a Lambda Function URL. The obvious way to
 * keep that URL private is `AuthType: AWS_IAM` with Origin Access Control, and it does
 * not work for this API — two documented CloudFront behaviours rule it out:
 *
 *   - OAC's recommended `SigningBehavior: always` **overwrites the viewer's
 *     `Authorization` header** with its own SigV4 signature, so bearer tokens cannot
 *     survive the trip. `no-override` does not rescue it: it declines to sign when the
 *     viewer sends `Authorization`, and the unsigned request is then refused by IAM.
 *   - `POST` and `PUT` through OAC require the *viewer* to compute the body's SHA-256
 *     and send it as `x-amz-content-sha256`, because CloudFront will not buffer the
 *     body to hash it. GraphQL is POST-only from a browser.
 *
 * So the URL is reachable, and a shared secret — delivered by CloudFront as an origin
 * custom header, never by the client — is what distinguishes an edge request from a
 * direct one. The trade against IAM is honest and worth stating: IAM is enforced by
 * AWS before any code runs, while this runs *in* the function, so a probe costs one
 * short invocation before being refused. Reserved concurrency bounds that.
 *
 * **Disabled unless a secret resolves**, which is what keeps every other target
 * unchanged: Docker and Kubernetes configure no secret and this is a pass-through.
 * Where the origin *is* reachable, `SECURITY_ORIGIN_VERIFY_REQUIRED` makes a missing
 * secret fail closed rather than open — absence must not disable the control.
 *
 * There are no exempt paths. An earlier version exempted `/health` because the Lambda
 * Web Adapter probed it over loopback, which left an unauthenticated endpoint on a
 * publicly reachable origin. The adapter now uses a TCP readiness check
 * (`apps/api/Dockerfile`), which needs no exemption: the port does not open until
 * `createApp()` has resolved, so binding it is already the readiness signal.
 */

import { createHash, timingSafeEqual } from 'node:crypto';

import type { ISecretResolver } from '@grantjs/core';
import type { NextFunction, Request, Response } from 'express';

import { config } from '@/config';
import { AuthorizationError } from '@/lib/errors';
import { createLogger } from '@/lib/logger';

/** The resolver key holding the shared secret. */
export const ORIGIN_VERIFY_SECRET_KEY = 'ORIGIN_VERIFY_SECRET';

/**
 * Compares as fixed-width digests rather than raw strings.
 *
 * `timingSafeEqual` throws on length mismatch, so comparing the values directly would
 * both leak the secret's length and turn a wrong-length guess into a 500. Hashing
 * first makes every comparison the same width.
 */
function secretsMatch(provided: string, expected: string): boolean {
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

export function originVerifyMiddleware(secrets: ISecretResolver) {
  const log = createLogger('OriginVerify');

  return function verifyOrigin(req: Request, _res: Response, next: NextFunction): void {
    // Resolved per request rather than captured at boot, so a rotated secret takes
    // effect within the resolver's cache TTL instead of at the next redeploy (ADR
    // 0004). The resolver caches, so this is not a per-request network call.
    secrets
      .resolve(ORIGIN_VERIFY_SECRET_KEY)
      .then((expected) => {
        if (!expected) {
          if (config.security.originVerifyRequired) {
            // The control that replaces IAM must not be disableable by absence. A
            // secret dropped from the payload, a partial rotation or a changed shape
            // would otherwise open the origin silently — no error, no log, nothing
            // failing. Refuse instead, loudly.
            log.error({
              msg: 'Origin verification is required but no secret resolved; refusing request',
              key: ORIGIN_VERIFY_SECRET_KEY,
            });
            next(new AuthorizationError('Forbidden'));
            return;
          }

          // Not configured and not required: every other deployment target, unchanged.
          next();
          return;
        }

        const header = req.headers[config.security.originVerifyHeader];
        const provided = Array.isArray(header) ? header[0] : header;

        if (!provided || !secretsMatch(provided, expected)) {
          // Logged under a stable module name so reaching the origin directly is
          // distinguishable from an ordinary authorization failure — that is the one
          // condition worth alerting on, and it is otherwise indistinguishable from
          // every other 403 the API produces.
          log.warn({
            msg: 'Request did not arrive through the CDN; refusing',
            path: req.path,
            headerPresent: provided !== undefined,
          });
          // The response deliberately says nothing about which header was expected or
          // whether one was present — a direct caller learns only that it was refused.
          next(new AuthorizationError('Forbidden'));
          return;
        }

        next();
      })
      .catch(next);
  };
}
