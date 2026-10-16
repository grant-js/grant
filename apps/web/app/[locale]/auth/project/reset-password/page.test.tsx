// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const search = vi.hoisted(() => ({ params: new URLSearchParams() }));

vi.mock('next/navigation', () => ({ useSearchParams: () => search.params }));
vi.mock('next-intl', () => ({
  useLocale: () => 'en',
  useTranslations: (namespace?: string) => (key: string, values?: Record<string, string>) =>
    `${namespace ? `${namespace}.` : ''}${key}${values ? JSON.stringify(values) : ''}`,
}));
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const api = vi.hoisted(() => ({
  getProjectAppPublicInfo: vi.fn(),
  peekProjectAppPublicInfo: vi.fn(),
  completeProjectPasswordReset: vi.fn(),
}));
vi.mock('@/lib/project-oauth-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/project-oauth-api')>()),
  ...api,
}));

const { default: ProjectOAuthResetPasswordPage } = await import('./page');
const { ProjectOAuthApiError } = await import('@/lib/project-oauth-api');

const STRONG = 'Zq7!mKp2#vXw';

function arrive(hash: string | null = '#token=reset-token', extra: Record<string, string> = {}) {
  search.params = new URLSearchParams({
    client_id: 'client-1',
    redirect_uri: 'https://app.example/cb',
    client_state: 'client-state',
    code_challenge: 'challenge',
    code_challenge_method: 'S256',
    ...extra,
  });
  window.history.replaceState(
    null,
    '',
    `/en/auth/project/reset-password?${search.params.toString()}${hash ?? ''}`
  );
}

const type = (element: HTMLElement, value: string) =>
  fireEvent.change(element, { target: { value } });

async function fillAndSubmit(password = STRONG, confirm = password) {
  type(await screen.findByLabelText('auth.projectOAuth.resetPassword.passwordLabel'), password);
  type(screen.getByLabelText('auth.projectOAuth.resetPassword.confirmPasswordLabel'), confirm);
  fireEvent.click(screen.getByRole('button', { name: 'auth.projectOAuth.resetPassword.submit' }));
}

describe('ProjectOAuthResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.peekProjectAppPublicInfo.mockReturnValue(null);
    api.getProjectAppPublicInfo.mockResolvedValue({
      name: 'Docs',
      projectName: 'Acme',
      pictureUrl: null,
      primaryColor: null,
      enabledProviders: ['password'],
      configuredProviders: [],
      scopes: [],
    });
    arrive();
  });

  afterEach(cleanup);

  it('removes the token from the address bar and submits it with the new password', async () => {
    api.completeProjectPasswordReset.mockResolvedValue(undefined);
    render(<ProjectOAuthResetPasswordPage />);

    await fillAndSubmit();

    await waitFor(() =>
      expect(api.completeProjectPasswordReset).toHaveBeenCalledWith({
        clientId: 'client-1',
        redirectUri: 'https://app.example/cb',
        token: 'reset-token',
        password: STRONG,
      })
    );
    expect(window.location.hash).toBe('');
    expect(window.location.href).not.toContain('reset-token');
  });

  it('shows success and continues to sign in with the client state and PKCE challenge', async () => {
    api.completeProjectPasswordReset.mockResolvedValue(undefined);
    render(<ProjectOAuthResetPasswordPage />);

    await fillAndSubmit();

    const link = (
      await screen.findByText('auth.projectOAuth.resetPassword.continueToSignIn')
    ).closest('a')!;
    const href = new URL(link.getAttribute('href')!, 'https://grant.example');
    expect(href.pathname).toBe('/auth/project/password');
    expect(href.searchParams.get('client_state')).toBe('client-state');
    expect(href.searchParams.get('code_challenge')).toBe('challenge');
    expect(href.searchParams.has('state')).toBe(false);
  });

  it('does not call the API when the passwords differ or break the policy', async () => {
    render(<ProjectOAuthResetPasswordPage />);

    await fillAndSubmit(STRONG, 'something else');
    expect(await screen.findByText('errors.validation.passwordMismatch')).toBeInTheDocument();

    type(screen.getByLabelText('auth.projectOAuth.resetPassword.passwordLabel'), 'short');
    type(screen.getByLabelText('auth.projectOAuth.resetPassword.confirmPasswordLabel'), 'short');
    fireEvent.click(screen.getByRole('button', { name: 'auth.projectOAuth.resetPassword.submit' }));
    expect(await screen.findByText('errors.validation.passwordMin8')).toBeInTheDocument();

    expect(api.completeProjectPasswordReset).not.toHaveBeenCalled();
  });

  it('keeps the form (the token is not spent) when the API refuses the password', async () => {
    api.completeProjectPasswordReset.mockRejectedValue(
      new ProjectOAuthApiError('rules', 400, { code: 'BAD_USER_INPUT' })
    );
    render(<ProjectOAuthResetPasswordPage />);

    await fillAndSubmit();

    expect(
      await screen.findByText('auth.projectOAuth.resetPassword.passwordRejected')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'auth.projectOAuth.resetPassword.submit' })
    ).toBeInTheDocument();
  });

  it('shows the invalid-link view when the API says the link is invalid, expired or used', async () => {
    api.completeProjectPasswordReset.mockRejectedValue(
      new ProjectOAuthApiError('invalid', 400, { code: 'BAD_REQUEST' })
    );
    render(<ProjectOAuthResetPasswordPage />);

    await fillAndSubmit();

    expect(
      await screen.findByText('auth.projectOAuth.resetPassword.invalidLink.title')
    ).toBeInTheDocument();
    const request = screen
      .getByText('auth.projectOAuth.resetPassword.requestNewLink')
      .closest('a')!;
    expect(new URL(request.getAttribute('href')!, 'https://grant.example').pathname).toBe(
      '/auth/project/forgot-password'
    );
  });

  it('shows the invalid-link view without a token in the fragment', async () => {
    arrive(null);
    render(<ProjectOAuthResetPasswordPage />);

    expect(
      await screen.findByText('auth.projectOAuth.resetPassword.invalidLink.title')
    ).toBeInTheDocument();
    expect(api.completeProjectPasswordReset).not.toHaveBeenCalled();
  });

  it('says so when the limiter answers', async () => {
    api.completeProjectPasswordReset.mockRejectedValue(new ProjectOAuthApiError('slow', 429));
    render(<ProjectOAuthResetPasswordPage />);

    await fillAndSubmit();

    expect(
      await screen.findByText('auth.projectOAuth.resetPassword.tooManyRequests')
    ).toBeInTheDocument();
  });
});
