import { describe, expect, it } from 'vitest';

import { isProjectProviderEnabled } from '@/lib/project-oauth-providers.lib';

describe('isProjectProviderEnabled', () => {
  it.each([[null], [undefined], [[]]])(
    'an empty list (%j) enables every provider except password',
    (list) => {
      expect(isProjectProviderEnabled(list, 'email')).toBe(true);
      expect(isProjectProviderEnabled(list, 'github')).toBe(true);
      expect(isProjectProviderEnabled(list, 'google')).toBe(true);
      expect(isProjectProviderEnabled(list, 'password')).toBe(false);
    }
  );

  it('enables exactly the providers a non-empty list names, password included', () => {
    expect(isProjectProviderEnabled(['password'], 'password')).toBe(true);
    expect(isProjectProviderEnabled(['password'], 'email')).toBe(false);
    expect(isProjectProviderEnabled(['email', 'github'], 'password')).toBe(false);
    expect(isProjectProviderEnabled(['email', 'password'], 'password')).toBe(true);
  });

  it('compares case-insensitively', () => {
    expect(isProjectProviderEnabled(['Password', 'EMAIL'], 'password')).toBe(true);
    expect(isProjectProviderEnabled(['password'], 'PASSWORD')).toBe(true);
    expect(isProjectProviderEnabled(['github'], 'Github')).toBe(true);
  });
});
