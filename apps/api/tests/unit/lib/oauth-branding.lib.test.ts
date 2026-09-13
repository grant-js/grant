import { describe, expect, it } from 'vitest';

import { resolveOAuthBranding } from '@/lib/oauth-branding.lib';

describe('resolveOAuthBranding', () => {
  const project = {
    name: 'Acme',
    pictureUrl: 'https://cdn.example/project.png',
    primaryColor: '#112233',
    showHelpPanel: false,
  };

  it('uses app fields when set', () => {
    expect(
      resolveOAuthBranding(
        {
          pictureUrl: 'https://cdn.example/app.png',
          primaryColor: '#AABBCC',
          showHelpPanel: true,
        },
        project
      )
    ).toEqual({
      pictureUrl: 'https://cdn.example/app.png',
      primaryColor: '#AABBCC',
      showHelpPanel: true,
      themeMode: null,
      projectName: 'Acme',
    });
  });

  it('falls back to project when app fields are unset', () => {
    expect(resolveOAuthBranding({}, project)).toEqual({
      pictureUrl: 'https://cdn.example/project.png',
      primaryColor: '#112233',
      showHelpPanel: false,
      themeMode: null,
      projectName: 'Acme',
    });
  });

  it('uses Grant defaults when neither app nor project is branded', () => {
    expect(resolveOAuthBranding({}, { name: 'Solo' })).toEqual({
      pictureUrl: null,
      primaryColor: null,
      showHelpPanel: true,
      themeMode: null,
      projectName: 'Solo',
    });
  });

  it('uses the app theme mode and ignores an invalid value', () => {
    expect(resolveOAuthBranding({ themeMode: 'dark' }, project).themeMode).toBe('dark');
    expect(resolveOAuthBranding({ themeMode: 'sepia' }, project).themeMode).toBeNull();
  });

  it('does not inherit themeMode from the project', () => {
    expect(resolveOAuthBranding({}, { ...project, themeMode: 'light' }).themeMode).toBeNull();
  });
});
