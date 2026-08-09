/**
 * NIST-ish Authentication Assurance Level (subset used by the platform).
 * Ordering is explicit — never compare `acr` strings lexicographically in guards.
 */
export type Aal = 'aal1' | 'aal2' | 'aal3';

/** Canonical total order: aal1 < aal2 < aal3 */
const AAL_RANK: Record<Aal, number> = {
  aal1: 1,
  aal2: 2,
  aal3: 3,
};

export function compareAal(a: Aal, b: Aal): number {
  return AAL_RANK[a] - AAL_RANK[b];
}

/** True if `tokenAal` meets or exceeds `required` (e.g. aal2 satisfies aal2 and aal1). */
export function satisfiesMinAal(tokenAal: Aal, required: Aal): boolean {
  return compareAal(tokenAal, required) >= 0;
}

/**
 * Maps `acr` claim values to `Aal`. Unknown values fall back to legacy `mfaVerified` / default aal1.
 */
function acrStringToAal(acr: unknown): Aal | null {
  if (typeof acr !== 'string') return null;
  const normalized = acr.toLowerCase();
  if (normalized === 'aal1') return 'aal1';
  if (normalized === 'aal2') return 'aal2';
  if (normalized === 'aal3') return 'aal3';
  return null;
}

/**
 * Single derivation of effective AAL from JWT claims. Guards and policy code should use this
 * (or `GrantAuth.aal`) — not ad-hoc `acr` / `amr` checks.
 */
export function getAalFromTokenClaims(claims: {
  acr?: unknown;
  amr?: unknown;
  mfaVerified?: boolean;
}): Aal {
  const fromAcr = acrStringToAal(claims.acr);
  if (fromAcr) {
    return fromAcr;
  }
  // Legacy tokens without `acr`: infer from MFA verification flag
  if (claims.mfaVerified === true) {
    return 'aal2';
  }
  return 'aal1';
}

function parseUnixClaim(value: unknown): number | undefined {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const n = Number.parseInt(value, 10);
    return Number.isNaN(n) ? undefined : n;
  }
  return undefined;
}

/**
 * When `mfaStepUpMaxAgeSeconds > 0`, AAL2 sessions whose last MFA proof (`mfa_auth_time`) is older
 * than the window are treated as AAL1 for policy (time-based step-up / re-auth).
 *
 * Tokens without `mfa_auth_time` are not downgraded (backward compatibility with pre–step-up-age JWTs).
 */
export function downgradeAalIfMfaStale(
  aal: Aal,
  claims: { mfa_auth_time?: unknown; mfaVerified?: boolean },
  mfaStepUpMaxAgeSeconds: number,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): Aal {
  if (mfaStepUpMaxAgeSeconds <= 0) {
    return aal;
  }
  if (aal !== 'aal2') {
    return aal;
  }
  const t = parseUnixClaim(claims.mfa_auth_time);
  if (t === undefined) {
    return aal;
  }
  if (nowSeconds - t > mfaStepUpMaxAgeSeconds) {
    return 'aal1';
  }
  return aal;
}
