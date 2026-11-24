// @vitest-environment jsdom

import { createElement, type ReactNode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DeploymentBranding } from '@/lib/deployment-branding';
import { RUNTIME_CONFIG_DEFAULTS, type RuntimeConfig } from '@/lib/runtime-config';

import { Header } from './header';

let runtimeConfig: RuntimeConfig = RUNTIME_CONFIG_DEFAULTS;

vi.mock('@/components/providers/runtime-config-provider', () => ({
  useRuntimeConfig: () => runtimeConfig,
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/components/common', () => ({
  DemoModeDialogProvider: ({ children }: { children: ReactNode }) => children,
  DemoModeDialogTrigger: () => null,
  // Grant's own logo, marked so a test can tell the main slot from the small one by the version.
  Logo: ({ color, ...props }: { color?: string; role?: string; 'aria-label'?: string }) =>
    createElement('svg', {
      'data-testid': 'grant-logo',
      'data-color': color ?? 'theme',
      role: props.role,
      'aria-label': props['aria-label'],
    }),
}));

vi.mock('@/components/features/notifications', () => ({ NotificationBell: () => null }));

vi.mock('@/components/features/settings', () => ({
  LanguageSwitcher: () => null,
  ThemeToggle: () => null,
}));

vi.mock('@/components/layout/oauth-branding-context', () => ({
  useOAuthBrandingTheme: () => null,
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href }: { children: ReactNode; href: string }) =>
    createElement('a', { href }, children),
  usePathname: () => '/dashboard',
}));

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: () => ({ isAuthenticated: () => false }),
}));

/** Every rendered link with this href; the header renders a desktop and a mobile copy. */
function linksTo(href: string) {
  return screen
    .queryAllByRole('link', { hidden: true })
    .filter((a) => a.getAttribute('href') === href);
}

describe('Header navigation links', () => {
  beforeEach(() => {
    runtimeConfig = {
      ...RUNTIME_CONFIG_DEFAULTS,
      apiReferenceEnabled: true,
      graphqlPlaygroundEnabled: true,
    };
  });

  afterEach(cleanup);

  it('links to the API reference and the GraphQL sandbox when both are enabled', () => {
    render(createElement(Header));

    expect(linksTo('/api-docs')).toHaveLength(2);
    expect(linksTo('/graphql')).toHaveLength(2);
  });

  it('hides the API reference link when Swagger UI is disabled', () => {
    runtimeConfig = { ...runtimeConfig, apiReferenceEnabled: false };
    render(createElement(Header));

    expect(linksTo('/api-docs')).toHaveLength(0);
    expect(linksTo('/graphql')).toHaveLength(2);
  });

  it('hides the GraphQL link when the Apollo Sandbox is disabled', () => {
    runtimeConfig = { ...runtimeConfig, graphqlPlaygroundEnabled: false };
    render(createElement(Header));

    expect(linksTo('/graphql')).toHaveLength(0);
    expect(linksTo('/api-docs')).toHaveLength(2);
  });

  it('shows neither API link before /api/config answers (defaults)', () => {
    runtimeConfig = RUNTIME_CONFIG_DEFAULTS;
    render(createElement(Header));

    expect(linksTo('/api-docs')).toHaveLength(0);
    expect(linksTo('/graphql')).toHaveLength(0);
  });

  it('links Docs to the configured docs site, with exactly one slash before the page', () => {
    runtimeConfig = { ...runtimeConfig, docsUrl: 'https://demo.grantjs.org/docs/' };
    render(createElement(Header));

    expect(linksTo('https://demo.grantjs.org/docs/')).toHaveLength(2);
  });

  it('keeps the built-in docs link when no docs URL is configured', () => {
    // Vitest's jsdom origin is http://localhost:3000, the web dev port, so the fallback is the
    // VitePress dev server; outside dev it is same-origin /docs (lib/constants.test.ts).
    render(createElement(Header));

    expect(linksTo('http://localhost:5173/docs/')).toHaveLength(2);
  });
});

const LIGHT_LOGO = 'https://cdn.example.com/brand/logo.svg';
const DARK_LOGO = 'https://cdn.example.com/brand/logo-dark.svg';

function renderWithBranding(branding: DeploymentBranding) {
  runtimeConfig = { ...RUNTIME_CONFIG_DEFAULTS, branding };
  return render(createElement(Header));
}

const header = () => document.querySelector('header') as HTMLElement;
const grantLogos = () => screen.queryAllByTestId('grant-logo');

describe('Header branding', () => {
  afterEach(cleanup);

  it('looks as before when nothing is branded, in both modes', () => {
    renderWithBranding(RUNTIME_CONFIG_DEFAULTS.branding);

    // The header reads only from header tokens, whose defaults are the page tokens in light and
    // dark alike (globals.css), and keeps its translucent background.
    expect(header().className).toContain('app-header');
    expect(header().className).toContain('bg-header/95');
    expect(header().className).toContain('supports-[backdrop-filter]:bg-header/60');
    expect(header().className).toContain('text-header-foreground');
    expect(header().hasAttribute('data-branded')).toBe(false);
    expect(screen.queryAllByRole('img')).toHaveLength(0);
    // Only the main-slot logo, coloured by theme; no small mark by the version.
    expect(grantLogos()).toHaveLength(1);
    expect(grantLogos()[0].getAttribute('data-color')).toBe('theme');
  });

  it('puts the deployment logo in the main slot and Grant small by the version', () => {
    renderWithBranding({
      logo: { lightUrl: LIGHT_LOGO, darkUrl: null, alt: 'Example Co' },
      theme: { light: {}, dark: {} },
    });

    const logo = screen.getByRole('img', { name: 'Example Co' });
    expect(logo.getAttribute('src')).toBe(LIGHT_LOGO);
    // One image serves both modes when there is no dark logo.
    expect(logo.className).not.toMatch(/dark/);
    expect(logo.closest('a')?.getAttribute('href')).toBe('/');

    // Desktop and mobile copies of the version each carry the small mark, in the header's colour.
    const marks = grantLogos();
    expect(marks).toHaveLength(2);
    for (const mark of marks) {
      expect(mark.getAttribute('data-color')).toBe('currentColor');
      expect(mark.getAttribute('aria-label')).toBe('app.poweredBy');
      expect(mark.parentElement?.textContent).toMatch(/^v/);
    }
  });

  it('renders a light and a dark logo, each shown only in its mode', () => {
    renderWithBranding({
      logo: { lightUrl: LIGHT_LOGO, darkUrl: DARK_LOGO, alt: 'Example Co' },
      theme: { light: {}, dark: {} },
    });

    const light = document.querySelector('[data-brand-logo="light"]') as HTMLImageElement;
    const dark = document.querySelector('[data-brand-logo="dark"]') as HTMLImageElement;
    expect(light.getAttribute('src')).toBe(LIGHT_LOGO);
    expect(light.className).toContain('[.dark_&]:hidden');
    expect(dark.getAttribute('src')).toBe(DARK_LOGO);
    expect(dark.className).toContain('hidden [.dark_&]:block');
    expect(dark.getAttribute('alt')).toBe('Example Co');
  });

  it('uses the localised home label as alt text when the deployment sets none', () => {
    renderWithBranding({
      logo: { lightUrl: LIGHT_LOGO, darkUrl: null, alt: null },
      theme: { light: {}, dark: {} },
    });

    expect(screen.getByRole('img', { name: 'navigation.home' })).toBeTruthy();
  });

  it("falls back to Grant's logo when the deployment logo fails to load", () => {
    renderWithBranding({
      logo: { lightUrl: LIGHT_LOGO, darkUrl: DARK_LOGO, alt: 'Example Co' },
      theme: { light: {}, dark: {} },
    });

    fireEvent.error(document.querySelector('[data-brand-logo="dark"]') as HTMLImageElement);

    expect(screen.queryAllByRole('img', { name: 'Example Co' })).toHaveLength(0);
    expect(grantLogos().some((logo) => logo.getAttribute('data-color') === 'theme')).toBe(true);
  });

  it('makes the header opaque when a mode sets its background', () => {
    renderWithBranding({
      logo: null,
      theme: { light: {}, dark: { header: '#0f172a', 'header-foreground': '#e2e8f0' } },
    });

    expect(header().className).toContain('bg-header');
    expect(header().className).not.toContain('bg-header/95');
    expect(header().className).not.toContain('backdrop-blur');
    expect(header().hasAttribute('data-branded')).toBe(true);
    // Colours alone keep Grant's logo in the main slot.
    expect(grantLogos()).toHaveLength(1);
  });
});
