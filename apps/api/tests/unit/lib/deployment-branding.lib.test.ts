import { describe, expect, it } from 'vitest';

import {
  contrastRatio,
  DEFAULT_HEADER_COLORS,
  LOGO_ALT_MAX_LENGTH,
  parseBrandingColor,
  parseBrandingLogoUrl,
  resolveDeploymentBranding,
  WCAG_AA_MIN_CONTRAST,
} from '@/lib/deployment-branding.lib';

describe('parseBrandingColor', () => {
  it.each([
    ['#1E3A5F', '#1e3a5f'],
    ['#abc', '#aabbcc'],
    ['  #ffffff  ', '#ffffff'],
    ['rgb(30, 58, 95)', '#1e3a5f'],
    ['rgb(30 58 95)', '#1e3a5f'],
    ['RGB(100%, 0%, 50%)', '#ff0080'],
    ['hsl(0, 100%, 50%)', '#ff0000'],
    ['hsl(120deg 100% 25%)', '#008000'],
    ['hsl(240 100% 50%)', '#0000ff'],
  ])('accepts %s as %s', (raw, expected) => {
    expect(parseBrandingColor(raw)).toBe(expected);
  });

  it.each([
    'red',
    '#12345',
    '#1234',
    '#11223344',
    'rgba(0, 0, 0, 0.5)',
    'rgb(0 0 0 / 50%)',
    'hsl(0 100% 50% / 0.2)',
    'oklch(0.5 0.1 200)',
    'var(--primary)',
    '#fff; } body { display: none',
    '',
  ])('refuses %s', (raw) => {
    expect(parseBrandingColor(raw)).toBeNull();
  });
});

describe('parseBrandingLogoUrl', () => {
  it('accepts an absolute https URL', () => {
    expect(parseBrandingLogoUrl('https://cdn.example.com/brand/logo.svg')).toBe(
      'https://cdn.example.com/brand/logo.svg'
    );
  });

  it.each([
    'http://cdn.example.com/logo.svg',
    '/logo.svg',
    'logo.svg',
    'javascript:alert(1)',
    'data:image/svg+xml,<svg/>',
    'https://user:secret@cdn.example.com/logo.svg',
    'not a url',
  ])('refuses %s', (raw) => {
    expect(parseBrandingLogoUrl(raw)).toBeNull();
  });
});

describe('contrastRatio', () => {
  it('is 21:1 for black on white and 1:1 for a colour on itself', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#1e3a5f', '#1e3a5f')).toBeCloseTo(1, 5);
  });

  it('keeps the default header pairs above WCAG AA', () => {
    for (const mode of ['light', 'dark'] as const) {
      const { background, foreground } = DEFAULT_HEADER_COLORS[mode];
      expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(WCAG_AA_MIN_CONTRAST);
    }
  });
});

describe('resolveDeploymentBranding', () => {
  it('returns no overrides and no warnings when nothing is set', () => {
    expect(resolveDeploymentBranding({})).toEqual({
      branding: { logo: null, theme: { light: {}, dark: {} } },
      warnings: [],
    });
  });

  it('keeps a valid pair per mode, normalised to #rrggbb', () => {
    const { branding, warnings } = resolveDeploymentBranding({
      BRANDING_HEADER_BACKGROUND_LIGHT: '#1E3A5F',
      BRANDING_HEADER_FOREGROUND_LIGHT: '#fff',
      BRANDING_HEADER_BACKGROUND_DARK: 'rgb(15, 23, 42)',
      BRANDING_HEADER_FOREGROUND_DARK: 'hsl(0 0% 90%)',
    });

    expect(warnings).toEqual([]);
    expect(branding.theme).toEqual({
      light: { header: '#1e3a5f', 'header-foreground': '#ffffff' },
      dark: { header: '#0f172a', 'header-foreground': '#e6e6e6' },
    });
  });

  it('pairs a background with the default foreground when that passes', () => {
    const { branding, warnings } = resolveDeploymentBranding({
      BRANDING_HEADER_BACKGROUND_LIGHT: '#e0f2fe',
    });

    expect(warnings).toEqual([]);
    expect(branding.theme.light).toEqual({
      header: '#e0f2fe',
      'header-foreground': DEFAULT_HEADER_COLORS.light.foreground,
    });
    expect(branding.theme.dark).toEqual({});
  });

  it('picks white when the default foreground fails on a dark light-mode background, and warns', () => {
    const { branding, warnings } = resolveDeploymentBranding({
      BRANDING_HEADER_BACKGROUND_LIGHT: '#1e3a5f',
    });

    expect(branding.theme.light).toEqual({ header: '#1e3a5f', 'header-foreground': '#ffffff' });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/BRANDING_HEADER_BACKGROUND_LIGHT #1e3a5f/);
    expect(warnings[0]).toMatch(/using #ffffff/);
    expect(warnings[0]).toMatch(/Set BRANDING_HEADER_FOREGROUND_LIGHT/);
  });

  it('drops a failing foreground for the default one, and warns with the ratio', () => {
    const { branding, warnings } = resolveDeploymentBranding({
      BRANDING_HEADER_BACKGROUND_DARK: '#0f172a',
      BRANDING_HEADER_FOREGROUND_DARK: '#1e293b',
    });

    expect(branding.theme.dark).toEqual({
      header: '#0f172a',
      'header-foreground': DEFAULT_HEADER_COLORS.dark.foreground,
    });
    expect(warnings).toEqual([
      expect.stringMatching(
        /^BRANDING_HEADER_FOREGROUND_DARK is ignored: #1e293b on #0f172a has contrast 1\.\d\d:1, below WCAG AA 4\.5:1\.$/
      ),
    ]);
  });

  it('keeps a foreground set alone when it passes against the default background', () => {
    const { branding, warnings } = resolveDeploymentBranding({
      BRANDING_HEADER_FOREGROUND_LIGHT: '#1e3a5f',
    });

    expect(warnings).toEqual([]);
    expect(branding.theme.light).toEqual({ 'header-foreground': '#1e3a5f' });
  });

  it('drops a foreground set alone that fails against the default background', () => {
    const { branding, warnings } = resolveDeploymentBranding({
      BRANDING_HEADER_FOREGROUND_DARK: '#222222',
    });

    expect(branding.theme.dark).toEqual({});
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/^BRANDING_HEADER_FOREGROUND_DARK is ignored/);
  });

  it('ignores an invalid colour with a warning that names the variable', () => {
    const { branding, warnings } = resolveDeploymentBranding({
      BRANDING_HEADER_BACKGROUND_LIGHT: 'rgba(0,0,0,0.5)',
    });

    expect(branding.theme.light).toEqual({});
    expect(warnings).toEqual([
      expect.stringMatching(/^BRANDING_HEADER_BACKGROUND_LIGHT is ignored: "rgba\(0,0,0,0\.5\)"/),
    ]);
  });

  it('returns the light logo, the dark logo and the alt text', () => {
    const { branding, warnings } = resolveDeploymentBranding({
      BRANDING_LOGO_URL_LIGHT: 'https://cdn.example.com/logo.svg',
      BRANDING_LOGO_URL_DARK: 'https://cdn.example.com/logo-dark.svg',
      BRANDING_LOGO_ALT: 'Example Co',
    });

    expect(warnings).toEqual([]);
    expect(branding.logo).toEqual({
      lightUrl: 'https://cdn.example.com/logo.svg',
      darkUrl: 'https://cdn.example.com/logo-dark.svg',
      alt: 'Example Co',
    });
  });

  it('leaves darkUrl and alt null when only the light logo is set', () => {
    const { branding } = resolveDeploymentBranding({
      BRANDING_LOGO_URL_LIGHT: 'https://cdn.example.com/logo.svg',
    });

    expect(branding.logo).toEqual({
      lightUrl: 'https://cdn.example.com/logo.svg',
      darkUrl: null,
      alt: null,
    });
  });

  it('ignores a dark logo without a light one', () => {
    const { branding, warnings } = resolveDeploymentBranding({
      BRANDING_LOGO_URL_DARK: 'https://cdn.example.com/logo-dark.svg',
    });

    expect(branding.logo).toBeNull();
    expect(warnings).toEqual([expect.stringMatching(/^BRANDING_LOGO_URL_DARK is ignored/)]);
  });

  it('ignores a non-https logo and keeps the default', () => {
    const { branding, warnings } = resolveDeploymentBranding({
      BRANDING_LOGO_URL_LIGHT: 'http://cdn.example.com/logo.svg',
    });

    expect(branding.logo).toBeNull();
    expect(warnings).toEqual([expect.stringMatching(/^BRANDING_LOGO_URL_LIGHT is ignored/)]);
  });

  it('falls back to the light logo when the dark one is invalid', () => {
    const { branding, warnings } = resolveDeploymentBranding({
      BRANDING_LOGO_URL_LIGHT: 'https://cdn.example.com/logo.svg',
      BRANDING_LOGO_URL_DARK: 'ftp://cdn.example.com/logo-dark.svg',
    });

    expect(branding.logo?.darkUrl).toBeNull();
    expect(warnings).toEqual([expect.stringMatching(/^BRANDING_LOGO_URL_DARK is ignored/)]);
  });

  it('warns about alt text with no logo, and cuts overlong alt text', () => {
    expect(resolveDeploymentBranding({ BRANDING_LOGO_ALT: 'Example Co' }).warnings).toEqual([
      expect.stringMatching(/^BRANDING_LOGO_ALT is ignored/),
    ]);

    const { branding, warnings } = resolveDeploymentBranding({
      BRANDING_LOGO_URL_LIGHT: 'https://cdn.example.com/logo.svg',
      BRANDING_LOGO_ALT: 'x'.repeat(LOGO_ALT_MAX_LENGTH + 10),
    });
    expect(branding.logo?.alt).toHaveLength(LOGO_ALT_MAX_LENGTH);
    expect(warnings).toEqual([expect.stringMatching(/^BRANDING_LOGO_ALT is cut/)]);
  });
});
