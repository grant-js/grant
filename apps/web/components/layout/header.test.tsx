// @vitest-environment jsdom

import { createElement, type ReactNode } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
  Logo: () => null,
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
