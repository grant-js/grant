import { describe, expect, it } from 'vitest';

import { isProjectOAuthThemeMode } from './project-oauth.types';

describe('isProjectOAuthThemeMode', () => {
  it('accepts the hosted OAuth appearance values', () => {
    expect(isProjectOAuthThemeMode('light')).toBe(true);
    expect(isProjectOAuthThemeMode('dark')).toBe(true);
    expect(isProjectOAuthThemeMode('system')).toBe(true);
  });

  it('rejects unset or unknown values', () => {
    expect(isProjectOAuthThemeMode(null)).toBe(false);
    expect(isProjectOAuthThemeMode(undefined)).toBe(false);
    expect(isProjectOAuthThemeMode('sepia')).toBe(false);
    expect(isProjectOAuthThemeMode('DARK')).toBe(false);
  });
});
