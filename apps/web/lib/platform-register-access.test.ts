import { describe, expect, it } from 'vitest';

import { canShowPlatformRegister } from '@/lib/platform-register-access';

describe('canShowPlatformRegister', () => {
  it('shows register when public signup is on', () => {
    expect(
      canShowPlatformRegister({
        publicSignupEnabled: true,
        bootstrapOpen: false,
        hasInvitation: false,
      })
    ).toBe(true);
  });

  it('shows register during first-operator bootstrap', () => {
    expect(
      canShowPlatformRegister({
        publicSignupEnabled: false,
        bootstrapOpen: true,
        hasInvitation: false,
      })
    ).toBe(true);
  });

  it('shows register when the visitor has an invitation', () => {
    expect(
      canShowPlatformRegister({
        publicSignupEnabled: false,
        bootstrapOpen: false,
        hasInvitation: true,
      })
    ).toBe(true);
  });

  it('hides register on a closed install after bootstrap', () => {
    expect(
      canShowPlatformRegister({
        publicSignupEnabled: false,
        bootstrapOpen: false,
        hasInvitation: false,
      })
    ).toBe(false);
  });
});
