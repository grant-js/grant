/**
 * Port for JWT codec operations (decode, verify, sign).
 * Core defines the contract; implementations (e.g. jsonwebtoken-based) live in the API layer.
 */

export interface TokenDecodeResult {
  header?: { kid?: string; alg?: string; [key: string]: unknown };
  payload?: Record<string, unknown>;
}

export interface TokenVerifyOptions {
  algorithms?: string[];
  ignoreExpiration?: boolean;
}

export interface TokenSignOptions {
  algorithm?: string;
  keyid?: string;
}

export interface ITokenProvider {
  /** Decode a JWT without verification. Returns header + payload or null if malformed. */
  decode(token: string): TokenDecodeResult | null;

  /** Verify a JWT against a public key. Returns the decoded payload or throws. */
  verify(token: string, publicKey: string, options?: TokenVerifyOptions): Record<string, unknown>;

  /** Sign a payload into a JWT string. */
  sign(payload: Record<string, unknown>, privateKey: string, options?: TokenSignOptions): string;
}
