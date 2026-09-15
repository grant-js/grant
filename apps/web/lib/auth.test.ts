import { describe, expect, it } from 'vitest';

import {
  isMfaChallengePath,
  isPublicPath,
  shouldOpenInAppMfaStepUp,
  shouldShowNotificationBell,
} from './auth';

describe('isMfaChallengePath', () => {
  it('matches locale-stripped and locale-prefixed MFA challenge paths', () => {
    expect(isMfaChallengePath('/auth/mfa')).toBe(true);
    expect(isMfaChallengePath('/en/auth/mfa')).toBe(true);
    expect(isMfaChallengePath('/en/auth/mfa?mode=challenge')).toBe(true);
    expect(isMfaChallengePath('/en/auth/mfa/')).toBe(true);
  });

  it('does not match other auth or app paths', () => {
    expect(isMfaChallengePath('/auth/login')).toBe(false);
    expect(isMfaChallengePath('/auth/mfa-recovery')).toBe(false);
    expect(isMfaChallengePath('/dashboard')).toBe(false);
    expect(isMfaChallengePath('/en/dashboard/settings/security')).toBe(false);
    expect(isMfaChallengePath('')).toBe(false);
  });
});

describe('isPublicPath keeps MFA inside the public auth shell', () => {
  it('treats locale-stripped /auth/mfa as public so Header can hide AAL2 chrome', () => {
    expect(isPublicPath('/auth/mfa')).toBe(true);
    expect(isPublicPath('/dashboard')).toBe(false);
  });
});

describe('shouldShowNotificationBell', () => {
  it('hides the bell on the login MFA challenge even when the session exists', () => {
    expect(shouldShowNotificationBell('/auth/mfa', true)).toBe(false);
    expect(shouldShowNotificationBell('/auth/login', true)).toBe(false);
  });

  it('shows the bell on authenticated app chrome', () => {
    expect(shouldShowNotificationBell('/dashboard', true)).toBe(true);
    expect(shouldShowNotificationBell('/dashboard/settings', true)).toBe(true);
  });

  it('never shows the bell when unauthenticated', () => {
    expect(shouldShowNotificationBell('/dashboard', false)).toBe(false);
    expect(shouldShowNotificationBell('/auth/mfa', false)).toBe(false);
  });
});

describe('shouldOpenInAppMfaStepUp', () => {
  it('skips the in-app dialog on the dedicated login MFA page', () => {
    expect(shouldOpenInAppMfaStepUp('/auth/mfa')).toBe(false);
    expect(shouldOpenInAppMfaStepUp('/en/auth/mfa?mode=challenge')).toBe(false);
  });

  it('still opens the dialog for dashboard AAL2 GraphQL', () => {
    expect(shouldOpenInAppMfaStepUp('/en/dashboard')).toBe(true);
    expect(shouldOpenInAppMfaStepUp('/auth/login')).toBe(true);
  });
});
