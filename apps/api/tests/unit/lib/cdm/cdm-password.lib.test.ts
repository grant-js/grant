import { describe, expect, it } from 'vitest';

import {
  BCRYPT_HASH_COST_MESSAGE,
  BCRYPT_HASH_FORMAT_MESSAGE,
  bcryptHashProblem,
  cdmPasswordProblem,
  redactCdmPasswordHashes,
  withCdmPasswordHashesRedacted,
} from '@/lib/cdm/cdm-password.lib';

const SALT_AND_HASH = 'NnYC771KbJNAJLrrFr5PD.A0KJg1eS9vxvLCiZyJ2WYfW6tAS6tzG'.slice(0, 53);
const GO_HASH = '$2a$10$NnYC771KbJNAJLrrFr5PD.A0KJg1eS9vxvLCiZyJ2WYfW6tAS6tzG';
const withCost = (cost: string, prefix = '2a') => `$${prefix}$${cost}$${SALT_AND_HASH}`;

describe('bcryptHashProblem', () => {
  it('accepts a hash from Go bcrypt.GenerateFromPassword', () => {
    expect(bcryptHashProblem(GO_HASH)).toBeNull();
  });

  it.each(['2a', '2b', '2y'])('accepts the $%s$ prefix', (prefix) => {
    expect(bcryptHashProblem(withCost('10', prefix))).toBeNull();
  });

  it.each(['04', '10', '12', '15'])('accepts cost %s, inside the 4 to 15 range', (cost) => {
    expect(bcryptHashProblem(withCost(cost))).toBeNull();
  });

  it.each(['03', '00', '16', '31'])('refuses cost %s, outside the range', (cost) => {
    expect(bcryptHashProblem(withCost(cost))).toBe(BCRYPT_HASH_COST_MESSAGE);
  });

  it.each([
    ['an unknown version', withCost('10', '2x')],
    ['the pre-2a $2$ prefix', `$2$10$${SALT_AND_HASH}`],
    ['a one-digit cost', `$2a$5$${SALT_AND_HASH}`],
    ['a short hash', GO_HASH.slice(0, -1)],
    ['a long hash', `${GO_HASH}x`],
    ['an illegal character', `${GO_HASH.slice(0, -1)}!`],
    ['surrounding whitespace', ` ${GO_HASH}`],
    ['a trailing newline', `${GO_HASH}\n`],
    ['a plaintext password', 'Legacy-Passw0rd!'],
    [
      'an argon2 hash',
      '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$RdescudvJCsgt3ub+b+dWRWJTmaaJObG',
    ],
    ['an empty string', ''],
  ])('refuses %s', (_label, hash) => {
    expect(bcryptHashProblem(hash)).toBe(BCRYPT_HASH_FORMAT_MESSAGE);
  });

  it.each([null, undefined, 42, {}, []])('refuses a non-string (%j)', (value) => {
    expect(bcryptHashProblem(value)).toBe(BCRYPT_HASH_FORMAT_MESSAGE);
  });

  it('never puts the value in the reason', () => {
    for (const hash of [GO_HASH.slice(0, -1), withCost('03'), 'plaintext-secret']) {
      expect(bcryptHashProblem(hash)).not.toContain(hash);
    }
  });
});

describe('cdmPasswordProblem', () => {
  it('accepts no password', () => {
    expect(cdmPasswordProblem(undefined)).toBeNull();
    expect(cdmPasswordProblem(null)).toBeNull();
  });

  it('accepts bcrypt with a valid hash', () => {
    expect(cdmPasswordProblem({ algorithm: 'bcrypt', hash: GO_HASH })).toBeNull();
  });

  it.each(['argon2id', 'BCRYPT', 'md5', '', undefined])('refuses algorithm %j', (algorithm) => {
    const problem = cdmPasswordProblem({ algorithm, hash: GO_HASH });
    expect(problem).toContain("password.algorithm must be 'bcrypt'");
    expect(problem).not.toContain(GO_HASH);
  });
});

describe('redactCdmPasswordHashes', () => {
  const document = () => ({
    version: 1,
    users: [
      {
        key: { value: 'a@example.test', findBy: 'email' },
        password: { algorithm: 'bcrypt', hash: GO_HASH },
      },
      { key: { value: 'b@example.test', findBy: 'email' } },
      { key: { value: 'c@example.test', findBy: 'email' }, password: null },
    ],
  });

  it('replaces every hash with a placeholder and leaves the rest of the document', () => {
    const redacted = redactCdmPasswordHashes(document())!;

    expect(JSON.stringify(redacted)).not.toContain(GO_HASH);
    expect(redacted).toEqual({
      version: 1,
      users: [
        {
          key: { value: 'a@example.test', findBy: 'email' },
          password: { algorithm: 'bcrypt', hash: '[redacted]' },
        },
        { key: { value: 'b@example.test', findBy: 'email' } },
        { key: { value: 'c@example.test', findBy: 'email' }, password: null },
      ],
    });
  });

  it('does not modify its input', () => {
    const input = document();
    redactCdmPasswordHashes(input);
    expect(input.users[0].password?.hash).toBe(GO_HASH);
  });

  it('returns null when there is nothing to redact, so the caller can skip the write', () => {
    expect(redactCdmPasswordHashes({ version: 1, users: [{ name: 'x' }] })).toBeNull();
    expect(redactCdmPasswordHashes({ version: 1 })).toBeNull();
    expect(redactCdmPasswordHashes(null)).toBeNull();
    expect(redactCdmPasswordHashes([])).toBeNull();
    expect(redactCdmPasswordHashes(redactCdmPasswordHashes(document()))).toBeNull();
  });

  it('produces a document that fails import validation instead of importing without credentials', () => {
    const redacted = redactCdmPasswordHashes(document())!;
    const hash = (redacted.users as { password?: { hash: string } }[])[0].password!.hash;
    expect(bcryptHashProblem(hash)).toBe(BCRYPT_HASH_FORMAT_MESSAGE);
  });

  it('withCdmPasswordHashesRedacted returns the input itself when there is nothing to redact', () => {
    const input = { version: 1, users: [] };
    expect(withCdmPasswordHashesRedacted(input)).toBe(input);
    expect(JSON.stringify(withCdmPasswordHashesRedacted(document()))).not.toContain(GO_HASH);
  });
});
