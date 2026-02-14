import { randomBytes, randomUUID } from 'crypto';

import { MILLISECONDS_PER_MINUTE } from '@grantjs/constants';
import { compareSync, hashSync } from 'bcrypt';

import { config } from '@/config';

export interface Token {
  token: string;
  validUntil: number;
}

export type { Token as SecureToken };

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

export function getTokenRemainingTime(token: Token): number {
  return token.validUntil - Date.now();
}

export function hashSecret(value: string, rounds: number = config.token.bcryptRounds): string {
  return hashSync(value, rounds);
}

export function verifySecret(value: string, hash: string): boolean {
  return compareSync(value, hash);
}
