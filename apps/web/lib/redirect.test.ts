import { describe, expect, it } from 'vitest';

import {
  buildAuthHref,
  emailFromSearchParam,
  getInvitationProofFromRedirectUrl,
  getInvitationTokenFromRedirectUrl,
} from './redirect';

describe('invitation redirect helpers', () => {
  it('extracts token and email proof from a safe invitation redirect', () => {
    const redirect = encodeURIComponent('/invitations/inv-token?emailProof=email-proof-token');

    expect(getInvitationProofFromRedirectUrl(redirect)).toEqual({
      token: 'inv-token',
      emailProofToken: 'email-proof-token',
    });
  });

  it('does not treat copied invitation links as email proof', () => {
    expect(getInvitationTokenFromRedirectUrl('/invitations/inv-token')).toBe('inv-token');
    expect(getInvitationProofFromRedirectUrl('/invitations/inv-token')).toBeNull();
  });

  it('rejects external redirects before extracting proof', () => {
    expect(
      getInvitationProofFromRedirectUrl('https://evil.example/invitations/inv-token?emailProof=x')
    ).toBeNull();
  });
});

describe('auth email query params', () => {
  it('encodes plus-addressing so URLSearchParams does not treat + as space', () => {
    const href = buildAuthHref('/auth/register', {
      email: 'ale+cdk@grantjs.org',
      redirect: '/invitations/inv-token?emailProof=proof',
    });

    expect(href).toContain('email=ale%2Bcdk%40grantjs.org');
    expect(href).not.toMatch(/email=ale\+cdk/);

    const query = href.split('?')[1] ?? '';
    expect(new URLSearchParams(query).get('email')).toBe('ale+cdk@grantjs.org');
  });

  it('restores plus-addressing when a producer left + unescaped', () => {
    const broken = new URLSearchParams('email=ale+cdk@grantjs.org').get('email');
    expect(broken).toBe('ale cdk@grantjs.org');
    expect(emailFromSearchParam(broken)).toBe('ale+cdk@grantjs.org');
  });
});
