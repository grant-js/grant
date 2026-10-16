// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const search = vi.hoisted(() => ({ params: new URLSearchParams() }));
const resetFlag = vi.hoisted(() => ({ available: false }));

vi.mock('next/navigation', () => ({ useSearchParams: () => search.params }));
vi.mock('next-intl', () => ({
  useLocale: () => 'en',
  useTranslations: (namespace: string) => (key: string, values?: Record<string, string>) =>
    `${namespace}.${key}${values ? JSON.stringify(values) : ''}`,
}));
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
vi.mock('@/lib/constants', () => ({ getApiBaseUrl: () => '' }));
vi.mock('@/lib/project-password-reset.lib', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/project-password-reset.lib')>();
  return {
    ...actual,
    get PROJECT_PASSWORD_RESET_AVAILABLE() {
      return resetFlag.available;
    },
  };
});

const api = vi.hoisted(() => ({
  getProjectAppPublicInfo: vi.fn(),
  peekProjectAppPublicInfo: vi.fn(),
  signInProjectWithPassword: vi.fn(),
  verifyProjectPasswordMfa: vi.fn(),
}));
vi.mock('@/lib/project-oauth-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/project-oauth-api')>()),
  ...api,
}));

const { default: ProjectOAuthPasswordPage } = await import('./page');
const { ProjectOAuthApiError } = await import('@/lib/project-oauth-api');
const { clearProjectOAuthPkceStorageForTests, markProjectOAuthPasswordViaAuthorize } =
  await import('@/lib/project-oauth-pkce.lib');
const { persistProjectOAuthPkceSession } = await import('@/lib/project-oauth-pkce.lib');

const assign = vi.fn();

function arrive(extra: Record<string, string> = {}) {
  search.params = new URLSearchParams({
    client_id: 'client-1',
    redirect_uri: 'https://app.example/cb',
    state: 'api-state',
    client_state: 'client-state',
    ...extra,
  });
  // The hosted flow's PKCE session, as the entry page leaves it.
  persistProjectOAuthPkceSession({
    verifier: 'v'.repeat(43),
    challenge: 'c'.repeat(43),
    clientId: 'client-1',
    redirectUri: 'https://app.example/cb',
    state: 'client-state',
  });
  markProjectOAuthPasswordViaAuthorize();
}

const type = (element: HTMLElement, value: string) =>
  fireEvent.change(element, { target: { value } });
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

async function fillAndSubmit(email = 'member@example.com', password = 'correct horse') {
  type(await screen.findByLabelText('auth.projectOAuth.password.emailLabel'), email);
  type(screen.getByPlaceholderText('auth.projectOAuth.password.passwordPlaceholder'), password);
  click('auth.projectOAuth.password.submit');
}

describe('ProjectOAuthPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFlag.available = false;
    api.peekProjectAppPublicInfo.mockReturnValue(null);
    api.getProjectAppPublicInfo.mockResolvedValue({
      name: 'Docs',
      projectName: 'Acme',
      pictureUrl: null,
      primaryColor: null,
      showHelpPanel: true,
      themeMode: null,
      enabledProviders: ['password'],
      configuredProviders: [],
      scopes: [],
    });
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { assign, href: 'https://grant.example/en/auth/project/password' },
    });
    clearProjectOAuthPkceStorageForTests();
    arrive();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows its own email and password form', async () => {
    render(<ProjectOAuthPasswordPage />);

    expect(await screen.findByLabelText('auth.projectOAuth.password.emailLabel')).toHaveAttribute(
      'type',
      'email'
    );
    expect(screen.getByLabelText('auth.projectOAuth.password.passwordLabel')).toHaveAttribute(
      'type',
      'password'
    );
    expect(screen.getByRole('button', { name: 'auth.projectOAuth.password.submit' })).toBeEnabled();
  });

  it('shows "Forgot password?" only while the reset views are available, and links to them with the same params', async () => {
    const first = render(<ProjectOAuthPasswordPage />);
    await screen.findByLabelText('auth.projectOAuth.password.emailLabel');
    expect(screen.queryByText('auth.projectOAuth.password.forgotPassword')).toBeNull();
    first.unmount();

    resetFlag.available = true;
    render(<ProjectOAuthPasswordPage />);
    const link = await screen.findByText('auth.projectOAuth.password.forgotPassword');
    const href = new URL(link.closest('a')!.getAttribute('href')!, 'https://grant.example');
    expect(href.pathname).toBe('/auth/project/forgot-password');
    expect(href.searchParams.get('client_id')).toBe('client-1');
    expect(href.searchParams.get('state')).toBe('api-state');
  });

  it('signs in and continues to the consent step the API returned', async () => {
    api.signInProjectWithPassword.mockResolvedValue({
      status: 'authenticated',
      redirectUrl: 'https://grant.example/en/auth/project/consent?consent_token=t',
    });
    render(<ProjectOAuthPasswordPage />);

    await fillAndSubmit();

    await waitFor(() =>
      expect(assign).toHaveBeenCalledWith(
        'https://grant.example/en/auth/project/consent?consent_token=t'
      )
    );
    expect(api.signInProjectWithPassword).toHaveBeenCalledWith({
      clientId: 'client-1',
      redirectUri: 'https://app.example/cb',
      state: 'api-state',
      email: 'member@example.com',
      password: 'correct horse',
      locale: 'en',
    });
  });

  it('shows one message for a credentials failure and clears the password field', async () => {
    api.signInProjectWithPassword.mockRejectedValue(
      new ProjectOAuthApiError('Invalid credentials', 401)
    );
    render(<ProjectOAuthPasswordPage />);

    await fillAndSubmit();

    expect(
      await screen.findByText('auth.projectOAuth.password.invalidCredentials')
    ).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('auth.projectOAuth.password.passwordPlaceholder')
    ).toHaveValue('');
    expect(assign).not.toHaveBeenCalled();
  });

  it.each([
    [429, 'tooManyRequests'],
    [400, 'sessionExpired'],
    [500, 'somethingWentWrong'],
  ])('maps a %i response to %s', async (status, key) => {
    api.signInProjectWithPassword.mockRejectedValue(new ProjectOAuthApiError('x', status));
    render(<ProjectOAuthPasswordPage />);

    await fillAndSubmit();

    expect(await screen.findByText(`auth.projectOAuth.password.${key}`)).toBeInTheDocument();
  });

  it('does not call the API for an empty form', async () => {
    render(<ProjectOAuthPasswordPage />);
    await screen.findByLabelText('auth.projectOAuth.password.emailLabel');
    click('auth.projectOAuth.password.submit');
    expect(
      await screen.findByText('auth.projectOAuth.password.passwordRequired')
    ).toBeInTheDocument();
    expect(api.signInProjectWithPassword).not.toHaveBeenCalled();
  });

  describe('MFA step', () => {
    async function reachMfa() {
      api.signInProjectWithPassword.mockResolvedValue({
        status: 'mfa_required',
        mfaToken: 'mfa-1',
      });
      render(<ProjectOAuthPasswordPage />);
      await fillAndSubmit();
      return screen.findByLabelText('auth.projectOAuth.password.mfa.codeLabel');
    }

    it('asks for a code instead of continuing, and never redirects yet', async () => {
      await reachMfa();
      expect(assign).not.toHaveBeenCalled();
      expect(screen.queryByLabelText('auth.projectOAuth.password.passwordLabel')).toBeNull();
    });

    it('verifies the code and continues', async () => {
      const input = await reachMfa();
      api.verifyProjectPasswordMfa.mockResolvedValue({
        redirectUrl: 'https://grant.example/en/auth/project/consent?consent_token=t2',
      });
      type(input, '123456');
      click('auth.projectOAuth.password.mfa.verify');

      await waitFor(() =>
        expect(assign).toHaveBeenCalledWith(
          'https://grant.example/en/auth/project/consent?consent_token=t2'
        )
      );
      expect(api.verifyProjectPasswordMfa).toHaveBeenCalledWith({
        mfaToken: 'mfa-1',
        code: '123456',
        method: 'totp',
      });
    });

    it('can switch to a recovery code', async () => {
      await reachMfa();
      click('auth.projectOAuth.password.mfa.useRecovery');
      api.verifyProjectPasswordMfa.mockResolvedValue({ redirectUrl: 'https://grant.example/c' });
      type(screen.getByLabelText('auth.projectOAuth.password.mfa.recoveryLabel'), 'abcd-efgh');
      click('auth.projectOAuth.password.mfa.verify');
      await waitFor(() =>
        expect(api.verifyProjectPasswordMfa).toHaveBeenCalledWith({
          mfaToken: 'mfa-1',
          code: 'abcd-efgh',
          method: 'recovery',
        })
      );
    });

    it('shows an invalid-code message on a 401, and starts over when the challenge is gone', async () => {
      const input = await reachMfa();
      api.verifyProjectPasswordMfa.mockRejectedValueOnce(new ProjectOAuthApiError('x', 401));
      type(input, '000000');
      click('auth.projectOAuth.password.mfa.verify');
      expect(
        await screen.findByText('auth.projectOAuth.password.mfa.invalidCode')
      ).toBeInTheDocument();

      api.verifyProjectPasswordMfa.mockRejectedValueOnce(new ProjectOAuthApiError('x', 400));
      type(screen.getByLabelText('auth.projectOAuth.password.mfa.codeLabel'), '000000');
      click('auth.projectOAuth.password.mfa.verify');
      expect(await screen.findByText('auth.projectOAuth.password.mfa.expired')).toBeInTheDocument();
      expect(screen.getByLabelText('auth.projectOAuth.password.passwordLabel')).toBeInTheDocument();
    });
  });

  it('reports missing params instead of a form', () => {
    search.params = new URLSearchParams();
    render(<ProjectOAuthPasswordPage />);
    expect(screen.getByText('auth.projectOAuth.password.missingParams')).toBeInTheDocument();
    expect(screen.queryByLabelText('auth.projectOAuth.password.emailLabel')).toBeNull();
  });
});
