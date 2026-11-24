import { describe, expect, it } from 'vitest';

import {
  brandingStyleSheet,
  DEPLOYMENT_BRANDING_DEFAULTS,
  hasHeaderBackground,
  parseDeploymentBranding,
} from './deployment-branding';

describe('parseDeploymentBranding', () => {
  it('reads a missing or malformed payload as unbranded', () => {
    for (const value of [undefined, null, 'x', 42, [], { theme: 'x', logo: 'x' }]) {
      expect(parseDeploymentBranding(value)).toEqual(DEPLOYMENT_BRANDING_DEFAULTS);
    }
  });

  it('keeps well-formed overrides and the logo', () => {
    expect(
      parseDeploymentBranding({
        logo: {
          lightUrl: 'https://cdn.example.com/logo.svg',
          darkUrl: 'https://cdn.example.com/logo-dark.svg',
          alt: ' Example Co ',
        },
        theme: {
          light: { header: '#1E3A5F', 'header-foreground': '#ffffff' },
          dark: { header: '#0f172a' },
        },
      })
    ).toEqual({
      logo: {
        lightUrl: 'https://cdn.example.com/logo.svg',
        darkUrl: 'https://cdn.example.com/logo-dark.svg',
        alt: 'Example Co',
      },
      theme: {
        light: { header: '#1e3a5f', 'header-foreground': '#ffffff' },
        dark: { header: '#0f172a' },
      },
    });
  });

  it('drops values that could break out of a CSS rule, unknown tokens and non-https logos', () => {
    const branding = parseDeploymentBranding({
      logo: { lightUrl: 'javascript:alert(1)', darkUrl: null, alt: null },
      theme: {
        light: {
          header: '#fff;}body{display:none',
          'header-foreground': 'red',
          primary: '#123456',
        },
        dark: { header: '#0f172a', 'header-foreground': 'url(https://x)' },
      },
    });

    expect(branding.logo).toBeNull();
    expect(branding.theme).toEqual({ light: {}, dark: { header: '#0f172a' } });
  });

  it('falls back to the light logo when the dark one is not https, and to null alt when blank', () => {
    expect(
      parseDeploymentBranding({
        logo: { lightUrl: 'https://cdn.example.com/logo.svg', darkUrl: 'http://x/y.svg', alt: ' ' },
        theme: { light: {}, dark: {} },
      }).logo
    ).toEqual({ lightUrl: 'https://cdn.example.com/logo.svg', darkUrl: null, alt: null });
  });
});

describe('brandingStyleSheet', () => {
  it('is null when nothing is overridden, so an unbranded page gets no extra style', () => {
    expect(brandingStyleSheet(DEPLOYMENT_BRANDING_DEFAULTS)).toBeNull();
  });

  it('scopes light overrides away from dark mode and dark overrides to it', () => {
    const css = brandingStyleSheet({
      logo: null,
      theme: {
        light: { header: '#1e3a5f', 'header-foreground': '#ffffff' },
        dark: { header: '#0f172a', 'header-foreground': '#e2e8f0' },
      },
    });

    expect(css).toBe(
      ':root:not(.dark){--header:#1e3a5f;--header-foreground:#ffffff;--header-muted-foreground:#ffffff;}\n' +
        ':root.dark{--header:#0f172a;--header-foreground:#e2e8f0;--header-muted-foreground:#e2e8f0;}'
    );
  });

  it('writes only the mode that is set', () => {
    expect(
      brandingStyleSheet({
        logo: null,
        theme: { light: {}, dark: { 'header-foreground': '#e2e8f0' } },
      })
    ).toBe(':root.dark{--header-foreground:#e2e8f0;--header-muted-foreground:#e2e8f0;}');
  });
});

describe('hasHeaderBackground', () => {
  it('is true when either mode sets the header background', () => {
    expect(hasHeaderBackground(DEPLOYMENT_BRANDING_DEFAULTS)).toBe(false);
    expect(
      hasHeaderBackground({ logo: null, theme: { light: {}, dark: { header: '#0f172a' } } })
    ).toBe(true);
    expect(
      hasHeaderBackground({
        logo: null,
        theme: { light: { 'header-foreground': '#1e3a5f' }, dark: {} },
      })
    ).toBe(false);
  });
});
