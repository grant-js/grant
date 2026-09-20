import { describe, expect, it } from 'vitest';

import type { ProjectAppPublicInfo } from './project-oauth.types';
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

const SECRET_FIELD = /secret|encrypted|ciphertext|^iv$/i;

describe('ProjectAppPublicInfo', () => {
  it('does not declare secret or ciphertext fields', () => {
    const sample: ProjectAppPublicInfo = {
      name: null,
      projectName: null,
      pictureUrl: null,
      primaryColor: null,
      showHelpPanel: true,
      themeMode: null,
      enabledProviders: ['github'],
      configuredProviders: ['github'],
      scopes: [],
    };

    expect(Object.keys(sample).filter((key) => SECRET_FIELD.test(key))).toEqual([]);
  });
});
