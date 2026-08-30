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
 */

import { createHash, timingSafeEqual } from 'node:crypto';

import type { ISecretResolver } from '@grantjs/core';
import type { NextFunction, Request, Response } from 'express';

import { config } from '@/config';
import { AuthorizationError } from '@/lib/errors';

/** The resolver key holding the shared secret. */
export const ORIGIN_VERIFY_SECRET_KEY = 'ORIGIN_VERIFY_SECRET';

/**
 * Paths that must answer without the header.
 *
 * The Lambda Web Adapter probes `/health` over loopback to decide the container is
 * ready, and that probe carries no CloudFront headers. Rejecting it would mean the
 * function never reports ready and every invocation fails — a self-inflicted outage
 * rather than a security control, so the exemption is load-bearing.
 *
 * Exempting it costs nothing: the handler reads no data and returns a fixed document.
 */
const EXEMPT_PATHS = new Set(['/health']);

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
  return function verifyOrigin(req: Request, _res: Response, next: NextFunction): void {
    if (EXEMPT_PATHS.has(req.path)) {
      next();
      return;
    }

    // Resolved per request rather than captured at boot, so a rotated secret takes
    // effect within the resolver's cache TTL instead of at the next redeploy (ADR
    // 0004). The resolver caches, so this is not a per-request network call.
    secrets
      .resolve(ORIGIN_VERIFY_SECRET_KEY)
      .then((expected) => {
        if (!expected) {
          // Not configured: every other deployment target, unchanged.
          next();
          return;
        }

        const header = req.headers[config.security.originVerifyHeader];
        const provided = Array.isArray(header) ? header[0] : header;

        if (!provided || !secretsMatch(provided, expected)) {
          // Deliberately says nothing about which header was expected or whether one
          // was present — a direct caller learns only that the origin refused them.
          next(new AuthorizationError('Forbidden'));
          return;
        }

        next();
      })
      .catch(next);
  };
}
