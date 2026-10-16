// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const search = vi.hoisted(() => ({ params: new URLSearchParams() }));

vi.mock('next/navigation', () => ({ useSearchParams: () => search.params }));
vi.mock('next-intl', () => ({
  useLocale: () => 'en',
  useTranslations: (namespace: string) => (key: string, values?: Record<string, string>) =>
    `${namespace}.${key}${values ? JSON.stringify(values) : ''}`,
}));
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock('@/components/layout', () => ({
  AuthLayoutStandalone: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock('@/lib/constants', () => ({ getApiBaseUrl: () => '' }));

const api = vi.hoisted(() => ({
  getProjectAppPublicInfo: vi.fn(),
  peekProjectAppPublicInfo: vi.fn(),
}));
vi.mock('@/lib/project-oauth-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/project-oauth-api')>()),
  ...api,
}));

const { default: ProjectOAuthEntryPage } = await import('./page');
const { isProjectOAuthPasswordViaAuthorize, clearProjectOAuthPkceStorageForTests } =
  await import('@/lib/project-oauth-pkce.lib');

const appInfo = (enabledProviders: string[] | null) => ({
  name: 'Docs',
  projectName: 'Acme',
  pictureUrl: null,
  primaryColor: null,
  showHelpPanel: true,
  themeMode: null,
  enabledProviders,
  configuredProviders: ['github', 'google'],
  scopes: [],
});

const assign = vi.fn();
let hrefSet: string | null = null;

describe('ProjectOAuthEntryPage password provider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearProjectOAuthPkceStorageForTests();
    hrefSet = null;
    api.peekProjectAppPublicInfo.mockReturnValue(null);
    search.params = new URLSearchParams({
      client_id: 'client-1',
      redirect_uri: 'https://app.example/cb',
      state: 'client-state',
      code_challenge: 'c'.repeat(43),
      code_challenge_method: 'S256',
    });
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        assign,
        set href(value: string) {
          hrefSet = value;
        },
        get href() {
          return 'https://grant.example/en/auth/project';
        },
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  const renderWith = async (enabledProviders: string[] | null) => {
    api.getProjectAppPublicInfo.mockResolvedValue(appInfo(enabledProviders));
    render(<ProjectOAuthEntryPage />);
    return screen.findByText('auth.projectOAuth.entry.signInWith');
  };

  it('lists a Password button, with the key icon, next to the other providers when enabled', async () => {
    await renderWith(['email', 'password', 'github']);

    const button = await screen.findByRole('button', { name: 'auth.projectOAuth.entry.password' });
    expect(button.querySelector('svg.lucide-key-round')).not.toBeNull();
    expect(
      screen.getByRole('button', { name: 'auth.projectOAuth.entry.email' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'auth.projectOAuth.entry.github' })
    ).toBeInTheDocument();
  });

  it.each([[[]], [null], [['email', 'github']]])(
    'does not list Password when enabledProviders is %j (opt-in only)',
    async (list) => {
      await renderWith(list);

      await waitFor(() =>
        expect(
          screen.queryAllByRole('button', { name: /auth\.projectOAuth\.entry\./ }).length
        ).toBeGreaterThan(0)
      );
      expect(screen.queryByRole('button', { name: 'auth.projectOAuth.entry.password' })).toBeNull();
    }
  );

  it('starts authorize with provider=password and marks the password flow', async () => {
    await renderWith(['password']);

    fireEvent.click(
      await screen.findByRole('button', { name: 'auth.projectOAuth.entry.password' })
    );

    await waitFor(() => expect(hrefSet).not.toBeNull());
    const url = new URL(hrefSet!, 'https://grant.example');
    expect(url.pathname).toBe('/api/auth/project/authorize');
    expect(url.searchParams.get('provider')).toBe('password');
    expect(url.searchParams.get('client_id')).toBe('client-1');
    expect(isProjectOAuthPasswordViaAuthorize()).toBe(true);
  });
});
