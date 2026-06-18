import { describe, expect, it } from 'vitest';

import { getInvitationProofFromRedirectUrl, getInvitationTokenFromRedirectUrl } from './redirect';

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
