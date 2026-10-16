import { describe, expect, it } from 'vitest';

import { REDACTED, redactSensitiveFields } from '@/lib/log-redaction.lib';

describe('redactSensitiveFields', () => {
  it('replaces passwords, tokens, codes and hashes, keeping the rest', () => {
    const body = {
      client_id: 'abc',
      email: 'a@b.c',
      password: 'hunter2',
      mfa_token: 't',
      code: '123456',
      code_challenge: 'x',
      nested: { currentPassword: 'p', providerData: { password: 'q', name: 'n' } },
      list: [{ hashedPassword: 'h', ok: 1 }],
    };
    expect(redactSensitiveFields(body)).toEqual({
      client_id: 'abc',
      email: 'a@b.c',
      password: REDACTED,
      mfa_token: REDACTED,
      code: REDACTED,
      code_challenge: REDACTED,
      nested: { currentPassword: REDACTED, providerData: { password: REDACTED, name: 'n' } },
      list: [{ hashedPassword: REDACTED, ok: 1 }],
    });
  });

  it('never mutates its input and passes scalars through', () => {
    const body = { password: 'hunter2' };
    redactSensitiveFields(body);
    expect(body.password).toBe('hunter2');
    expect(redactSensitiveFields('x')).toBe('x');
    expect(redactSensitiveFields(null)).toBeNull();
    expect(redactSensitiveFields(undefined)).toBeUndefined();
  });

  it('stops at a depth bound instead of walking a cycle-sized structure', () => {
    let deep: Record<string, unknown> = { leaf: 'v' };
    for (let i = 0; i < 20; i += 1) deep = { child: deep };
    expect(JSON.stringify(redactSensitiveFields(deep))).toContain(REDACTED);
  });
});
