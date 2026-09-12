import { describe, expect, it, vi } from 'vitest';

vi.mock('@/config', () => ({
  config: { security: { frontendUrl: 'https://app.example.com' } },
}));

import { determineErrorCode } from '@/rest/utils/auth';

describe('determineErrorCode', () => {
  it('maps Google userinfo failures', () => {
    expect(determineErrorCode(new Error('Failed to fetch user information from Google'))).toBe(
      'googleUserInfoFailed'
    );
  });

  it('maps Google unavailability separately from GitHub', () => {
    expect(
      determineErrorCode(
        new Error('Google is temporarily unavailable. Please try again in a moment.')
      )
    ).toBe('googleUnavailable');
    expect(
      determineErrorCode(new Error('GitHub is temporarily unavailable. Please try again.'))
    ).toBe('githubUnavailable');
  });

  it('maps a missing OAuth configuration', () => {
    expect(determineErrorCode(new Error('Google OAuth is not configured'))).toBe(
      'oauthNotConfigured'
    );
  });
});
