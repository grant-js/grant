// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const search = vi.hoisted(() => ({ params: new URLSearchParams() }));

vi.mock('next/navigation', () => ({ useSearchParams: () => search.params }));
vi.mock('next-intl', () => ({
  useLocale: () => 'de',
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

const api = vi.hoisted(() => ({
  getProjectAppPublicInfo: vi.fn(),
  peekProjectAppPublicInfo: vi.fn(),
  requestProjectPasswordReset: vi.fn(),
}));
vi.mock('@/lib/project-oauth-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/project-oauth-api')>()),
  ...api,
}));

const { default: ProjectOAuthForgotPasswordPage } = await import('./page');
const { ProjectOAuthApiError } = await import('@/lib/project-oauth-api');

function arrive(extra: Record<string, string> = {}) {
  search.params = new URLSearchParams({
    client_id: 'client-1',
    redirect_uri: 'https://app.example/cb',
    state: 'api-state',
    client_state: 'client-state',
    ...extra,
  });
}

const type = (element: HTMLElement, value: string) =>
  fireEvent.change(element, { target: { value } });

async function submit(email = 'member@example.com') {
  type(await screen.findByLabelText('auth.projectOAuth.forgotPassword.emailLabel'), email);
  fireEvent.click(
    screen.getByRole('button', { name: 'auth.projectOAuth.forgotPassword.sendLink' })
  );
}

describe('ProjectOAuthForgotPasswordPage', () => {
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

  it('asks for the email and sends the sign-in context with it', async () => {
    api.requestProjectPasswordReset.mockResolvedValue(undefined);
    render(<ProjectOAuthForgotPasswordPage />);

    await submit();

    await waitFor(() =>
      expect(api.requestProjectPasswordReset).toHaveBeenCalledWith({
        clientId: 'client-1',
        redirectUri: 'https://app.example/cb',
        email: 'member@example.com',
        locale: 'de',
        state: 'api-state',
      })
    );
  });

  it('shows the same confirmation for any accepted address, and never says whether one exists', async () => {
    api.requestProjectPasswordReset.mockResolvedValue(undefined);
    render(<ProjectOAuthForgotPasswordPage />);

    await submit('nobody@example.com');

    expect(
      await screen.findByText('auth.projectOAuth.forgotPassword.checkEmailDescription')
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('auth.projectOAuth.forgotPassword.emailLabel')).toBeNull();
  });

  it('links back to the password sign-in with the same state', async () => {
    render(<ProjectOAuthForgotPasswordPage />);

    const link = (await screen.findByText('auth.projectOAuth.forgotPassword.backToSignIn')).closest(
      'a'
    )!;
    const href = new URL(link.getAttribute('href')!, 'https://grant.example');
    expect(href.pathname).toBe('/auth/project/password');
    expect(href.searchParams.get('client_id')).toBe('client-1');
    expect(href.searchParams.get('state')).toBe('api-state');
    expect(href.searchParams.get('client_state')).toBe('client-state');
  });

  it('says so when the limiter answers, and keeps the form', async () => {
    api.requestProjectPasswordReset.mockRejectedValue(new ProjectOAuthApiError('slow', 429));
    render(<ProjectOAuthForgotPasswordPage />);

    await submit();

    expect(
      await screen.findByText('auth.projectOAuth.forgotPassword.tooManyRequests')
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('auth.projectOAuth.forgotPassword.emailLabel')
    ).toBeInTheDocument();
  });

  it('shows a generic failure for any other error', async () => {
    api.requestProjectPasswordReset.mockRejectedValue(new ProjectOAuthApiError('bad', 400));
    render(<ProjectOAuthForgotPasswordPage />);

    await submit();

    expect(
      await screen.findByText('auth.projectOAuth.forgotPassword.somethingWentWrong')
    ).toBeInTheDocument();
  });

  it('rejects an invalid address before calling the API', async () => {
    render(<ProjectOAuthForgotPasswordPage />);

    type(
      await screen.findByLabelText('auth.projectOAuth.forgotPassword.emailLabel'),
      'not-an-email'
    );
    // The browser's own `type=email` check would stop a click; submit the form itself.
    fireEvent.submit(
      screen
        .getByRole('button', { name: 'auth.projectOAuth.forgotPassword.sendLink' })
        .closest('form')!
    );

    expect(
      await screen.findByText('auth.projectOAuth.forgotPassword.invalidEmail')
    ).toBeInTheDocument();
    expect(api.requestProjectPasswordReset).not.toHaveBeenCalled();
  });

  it('shows missing-params without client_id or redirect_uri', async () => {
    search.params = new URLSearchParams();
    render(<ProjectOAuthForgotPasswordPage />);

    expect(
      await screen.findByText('auth.projectOAuth.forgotPassword.missingParams')
    ).toBeInTheDocument();
  });
});
