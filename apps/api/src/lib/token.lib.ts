import { MILLISECONDS_PER_MINUTE } from '@grantjs/constants';
import { compareSync, hashSync } from 'bcrypt';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'crypto';

import { config } from '@/config';

export interface Token {
  token: string;
  validUntil: number;
}

export function generateUUID(): string {
  return randomUUID();
}

export function generateRandomBytes(length: number): Buffer {
  return randomBytes(length);
}

export function generateSecureToken(
  validityMinutes: number = config.token.defaultValidityMinutes,
  tokenLength: number = config.token.defaultTokenLength
): Token {
  const token = generateRandomBytes(tokenLength).toString('hex');
  const validUntil = Date.now() + validityMinutes * MILLISECONDS_PER_MINUTE;
  return { token, validUntil };
}

export function generateSecureTokenMs(
  validityMs: number,
  tokenLength: number = config.token.defaultTokenLength
): Token {
  const token = generateRandomBytes(tokenLength).toString('hex');
  const validUntil = Date.now() + validityMs;
  return { token, validUntil };
}

export function isTokenValid(token: Token): boolean {
  return Date.now() < token.validUntil;
}

export function hashSecret(value: string, rounds: number = config.token.bcryptRounds): string {
  return hashSync(value, rounds);
}

export function verifySecret(value: string, hash: string): boolean {
  return compareSync(value, hash);
}

/**
 * Deterministic digest of a high-entropy one-time token (a password-reset token), so it can
 * be stored hashed and looked up by hash. bcrypt (`hashSecret`) is salted and cannot be
 * looked up; it is also the wrong tool for a 256-bit random value, which cannot be guessed
 * offline, so a fast digest is enough.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/** Constant-time equality of two hex digests of equal length (`false` for different lengths). */
export function tokenHashesEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  return left.length === right.length && timingSafeEqual(left, right);
}
