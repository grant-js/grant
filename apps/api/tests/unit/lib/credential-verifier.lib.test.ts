import { beforeEach, describe, expect, it, vi } from 'vitest';

const verifySecretSpy = vi.hoisted(() => vi.fn());

vi.mock('@/lib/token.lib', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/token.lib')>();
  return {
    ...actual,
    hashSecret: (value: string) => actual.hashSecret(value, 4),
    verifySecret: (value: string, hash: string) => {
      verifySecretSpy(value, hash);
      return actual.verifySecret(value, hash);
    },
  };
});

const { MAX_PASSWORD_LENGTH, isAcceptablePassword, verifyCredentialPassword } =
  await import('@/lib/credential-verifier.lib');
const { hashSecret } = await import('@/lib/token.lib');

describe('verifyCredentialPassword', () => {
  const hash = hashSecret('s3cret-password');

  beforeEach(() => {
    verifySecretSpy.mockClear();
  });

  it('is true only for the matching password', () => {
    expect(verifyCredentialPassword('s3cret-password', hash)).toBe(true);
    expect(verifyCredentialPassword('wrong-password', hash)).toBe(false);
  });

  it('spends a compare against a dummy hash when there is no credential, and answers false', () => {
    expect(verifyCredentialPassword('s3cret-password', null)).toBe(false);
    expect(verifySecretSpy).toHaveBeenCalledTimes(1);
    const [, comparedAgainst] = verifySecretSpy.mock.calls[0];
    expect(comparedAgainst).toMatch(/^\$2[aby]\$\d{2}\$/);
    expect(comparedAgainst).not.toBe(hash);
  });

  it('reuses one dummy hash across misses', () => {
    verifyCredentialPassword('a', null);
    verifyCredentialPassword('b', null);
    expect(verifySecretSpy.mock.calls[0][1]).toBe(verifySecretSpy.mock.calls[1][1]);
  });

  it('does one compare on a hit and on a miss alike', () => {
    verifyCredentialPassword('s3cret-password', hash);
    verifyCredentialPassword('s3cret-password', null);
    expect(verifySecretSpy).toHaveBeenCalledTimes(2);
  });

  it('answers false, never throws, for a malformed stored hash', () => {
    expect(verifyCredentialPassword('s3cret-password', 'not-a-bcrypt-hash')).toBe(false);
  });

  it.each([
    ['empty', ''],
    ['not a string', undefined],
    ['null', null],
    ['too long', 'x'.repeat(MAX_PASSWORD_LENGTH + 1)],
  ])('refuses a %s password without skipping the compare', (_label, password) => {
    expect(verifyCredentialPassword(password, hash)).toBe(false);
    expect(verifySecretSpy).toHaveBeenCalledTimes(1);
  });

  it('never lets an unacceptable password match, even one that equals the stored secret', () => {
    const emptyHash = hashSecret('');
    expect(verifyCredentialPassword('', emptyHash)).toBe(false);
  });
});

describe('isAcceptablePassword', () => {
  it('bounds the length', () => {
    expect(isAcceptablePassword('x')).toBe(true);
    expect(isAcceptablePassword('x'.repeat(MAX_PASSWORD_LENGTH))).toBe(true);
    expect(isAcceptablePassword('x'.repeat(MAX_PASSWORD_LENGTH + 1))).toBe(false);
    expect(isAcceptablePassword('')).toBe(false);
  });
});
