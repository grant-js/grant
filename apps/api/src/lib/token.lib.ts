import { randomBytes, randomUUID } from 'crypto';

import { MILLISECONDS_PER_MINUTE } from '@grantjs/constants';
import { compareSync, hashSync } from 'bcrypt';

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

export function generateSecureToken(validityMinutes: number = 60, tokenLength: number = 32): Token {
  const token = generateRandomBytes(tokenLength).toString('hex');
  const validUntil = Date.now() + validityMinutes * MILLISECONDS_PER_MINUTE;
  return { token, validUntil };
}

export function generateSecureTokenMs(validityMs: number, tokenLength: number = 32): Token {
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

export function hashSecret(value: string, rounds: number = 10): string {
  return hashSync(value, rounds);
}

export function verifySecret(value: string, hash: string): boolean {
  return compareSync(value, hash);
}
