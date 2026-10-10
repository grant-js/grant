// @vitest-environment jsdom

import { createElement } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { OAuthBrandingProvider } from '@/components/layout/oauth-branding-context';
import { clearProjectOAuthBrandingCacheForTests } from '@/lib/project-oauth-branding';

import { ProjectOAuthBrandingGate } from './project-oauth-branding-gate';

const getProjectAppPublicInfo = vi.fn();
const getProjectConsentInfo = vi.fn();

let mockPathname = '/en/auth/project';
let mockSearchParams = new URLSearchParams('client_id=app_1');

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}));

vi.mock('@/components/common', () => ({
  FullPageLoader: () => createElement('div', { 'data-testid': 'full-page-loader' }),
}));

vi.mock('@/lib/project-oauth-api', () => ({
  getProjectAppPublicInfo: (...args: unknown[]) => getProjectAppPublicInfo(...args),
  getProjectConsentInfo: (...args: unknown[]) => getProjectConsentInfo(...args),
}));

function renderGate() {
  return render(
    createElement(
      OAuthBrandingProvider,
      null,
      createElement(ProjectOAuthBrandingGate, null, createElement('div', null, 'auth children'))
    )
  );
}

describe('ProjectOAuthBrandingGate', () => {
  beforeEach(() => {
    clearProjectOAuthBrandingCacheForTests();
    getProjectAppPublicInfo.mockReset();
    getProjectConsentInfo.mockReset();
    mockPathname = '/en/auth/project';
    mockSearchParams = new URLSearchParams('client_id=app_1');
  });

  afterEach(() => {
    clearProjectOAuthBrandingCacheForTests();
  });

  it('does not paint hosted children until app-info branding resolves', async () => {
    let resolveInfo: (value: unknown) => void = () => {};
    getProjectAppPublicInfo.mockReturnValue(
      new Promise((resolve) => {
        resolveInfo = resolve;
      })
    );

    renderGate();
    expect(screen.getByTestId('full-page-loader')).toBeTruthy();
    expect(screen.queryByText('auth children')).toBeNull();

    resolveInfo({
      name: 'Docs',
      projectName: 'Acme',
      pictureUrl: null,
      primaryColor: '#112233',
      showHelpPanel: false,
      themeMode: 'dark',
    });

    await waitFor(() => {
      expect(screen.getByText('auth children')).toBeTruthy();
    });
    expect(screen.queryByTestId('full-page-loader')).toBeNull();
  });

  it('does not block Grant platform login', () => {
    mockPathname = '/en/auth/login';
    mockSearchParams = new URLSearchParams();
    renderGate();
    expect(screen.getByText('auth children')).toBeTruthy();
    expect(getProjectAppPublicInfo).not.toHaveBeenCalled();
  });
});
