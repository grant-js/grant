import crypto from 'node:crypto';

import { ValidationError } from '@grantjs/core';
import { Scope, Tenant } from '@grantjs/schema';

import { config } from '@/config';

/**
 * JWK (JSON Web Key) for RSA public key in JWKS.
 * @see RFC 7517
 */
export interface RsaJwk {
  kty: 'RSA';
  use: 'sig';
  alg: string;
  kid: string;
  n: string;
  e: string;
}

/**
 * Convert an RSA public key PEM to a JWK suitable for JWKS.
 * Adds kid, use, and alg to the exported key material.
 */
export function publicKeyPemToJwk(
  publicKeyPem: string,
  options: { kid: string; alg?: string }
): RsaJwk {
  const keyObject = crypto.createPublicKey({
    key: publicKeyPem,
    format: 'pem',
  });

  const raw = keyObject.export({ format: 'jwk' }) as {
    kty: string;
    n?: string;
    e?: string;
  };

  if (raw.kty !== 'RSA' || !raw.n || !raw.e) {
    throw new ValidationError('Key is not a valid RSA public key');
  }

  return {
    kty: 'RSA',
    use: 'sig',
    alg: options.alg ?? 'RS256',
    kid: options.kid,
    n: raw.n,
    e: raw.e,
  };
}

export interface JwksResponse {
  keys: RsaJwk[];
}

export interface PublicKeyForJwks {
  kid: string;
  publicKeyPem: string;
}

/**
 * Build the issuer (iss) URL for JWT/OIDC discovery.
 * The issuer is the authority identifier — verifiers derive the JWKS endpoint
 * by appending /.well-known/jwks.json to this URL (standard OIDC convention).
 *
 * - scope null or system: returns API base URL.
 * - scope organizationProject/accountProject: returns scope-scoped issuer URL.
 */
export function buildJwksIssuerUrl(scope: Scope | null): string {
  const base = config.app.url.replace(/\/$/, '');
  if (!scope || scope.tenant === Tenant.System) return base;
  const parts = scope.id.split(':');
  if (scope.tenant === Tenant.OrganizationProject && parts.length >= 2) {
    return `${base}/org/${parts[0]}/prj/${parts[1]}`;
  }
  if (scope.tenant === Tenant.AccountProject && parts.length >= 2) {
    return `${base}/acc/${parts[0]}/prj/${parts[1]}`;
  }
  return base;
}

/** Retention cutoff for JWKS: include keys rotated after this date (e.g. refresh expiry + buffer). */
export function getJwksRetentionCutoff(refreshTokenExpirationDays: number, bufferDays = 7): Date {
  const retentionDays = refreshTokenExpirationDays + bufferDays;
  return new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
}

/**
 * Build the JWKS document (public keys only) for token verification.
 * Used by GET /.well-known/jwks.json. Optional onKeyError for logging conversion failures.
 */
export function getJwks(options?: {
  projectKeys?: PublicKeyForJwks[];
  onKeyError?: (kid: string, err: unknown) => void;
}): JwksResponse {
  const keys: RsaJwk[] = [];

  for (const { kid, publicKeyPem } of options?.projectKeys ?? []) {
    try {
      keys.push(publicKeyPemToJwk(publicKeyPem, { kid, alg: 'RS256' }));
    } catch (err) {
      options?.onKeyError?.(kid, err);
    }
  }

  return { keys };
}
