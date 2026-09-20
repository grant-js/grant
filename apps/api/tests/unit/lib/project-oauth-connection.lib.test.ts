import { describe, expect, it } from 'vitest';

import { encryptMfaSecret } from '@/lib/mfa.lib';
import {
  decryptProjectOAuthConnectionSecret,
  encryptProjectOAuthConnectionSecret,
} from '@/lib/project-oauth-connection.lib';

describe('project-oauth-connection.lib', () => {
  const key = 'test-project-oauth-connection-encryption-key';

  it('encrypts and decrypts a client secret', () => {
    const secret = 'github-oauth-app-client-secret';
    const encrypted = encryptProjectOAuthConnectionSecret(secret, key);
    expect(encrypted.encryptedSecret).not.toBe(secret);
    expect(encrypted.secretIv.length).toBeGreaterThan(0);
    expect(encrypted.secretTag.length).toBeGreaterThan(0);
    expect(decryptProjectOAuthConnectionSecret({ ...encrypted, key })).toBe(secret);
  });

  it('fails closed with the wrong key', () => {
    const encrypted = encryptProjectOAuthConnectionSecret('secret', key);
    expect(() =>
      decryptProjectOAuthConnectionSecret({ ...encrypted, key: 'different-key' })
    ).toThrow();
  });

  it('does not share ciphertext with the MFA KDF salt', () => {
    const secret = 'same-plaintext';
    const oauth = encryptProjectOAuthConnectionSecret(secret, key);
    const mfa = encryptMfaSecret(secret, key);
    expect(oauth.encryptedSecret).not.toBe(mfa.encryptedSecret);
    expect(() => decryptProjectOAuthConnectionSecret({ ...mfa, key })).toThrow();
  });
});
