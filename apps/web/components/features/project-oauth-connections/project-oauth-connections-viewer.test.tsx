// @vitest-environment jsdom

import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Tenant } from '@grantjs/schema';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

/**
 * Regression for the OAuth connections detail page:
 * 1. Project Update is condition-gated (`In(resource.id, resource.scope.projects)`).
 *    Checking it without `useProjectGrantContext()` leaves client id/secret disabled.
 * 2. Sibling project detail pages wrap content in `FeatureDetailLayout` (`max-w-2xl`).
 */

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/i18n/navigation', () => ({
  Link: 'a',
  usePathname: () => '/',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const projectGrantContext = {
  resource: { id: 'project-1', scope: { projects: ['project-1'] } },
};

const useGrantMock = vi.fn((..._args: unknown[]) => true);
vi.mock('@grantjs/client/react', () => ({
  useGrant: (...args: unknown[]) => useGrantMock(...args),
}));

vi.mock('@/hooks/auth', () => ({
  useEmailVerified: () => true,
}));

vi.mock('@/hooks/common', () => ({
  useProjectGrantContext: () => projectGrantContext,
}));

vi.mock('@/hooks/project-oauth-connections', () => ({
  useProjectOAuthConnections: () => ({
    connections: [],
    loading: false,
    error: undefined,
  }),
  useProjectOAuthConnectionMutations: () => ({
    upsertProjectOAuthConnection: vi.fn(),
    clearProjectOAuthConnection: vi.fn(),
  }),
}));

vi.mock('@/lib/constants', () => ({
  getDocsUrl: () => 'https://docs.example.test',
}));

const { ProjectOAuthConnectionsViewer } = await import('./project-oauth-connections-viewer');

const scope = { tenant: Tenant.OrganizationProject, id: 'org-1:project-1' };

describe('ProjectOAuthConnectionsViewer', () => {
  it('checks Project Update with the project grant context so credential fields stay editable', () => {
    render(<ProjectOAuthConnectionsViewer scope={scope} />);

    expect(useGrantMock).toHaveBeenCalledWith(ResourceSlug.Project, ResourceAction.Update, {
      scope,
      context: projectGrantContext,
      enabled: true,
    });

    const clientIdInputs = screen.getAllByRole('textbox');
    expect(clientIdInputs.length).toBeGreaterThan(0);
    for (const input of clientIdInputs) {
      expect(input).toBeEnabled();
    }

    const secretInputs = document.querySelectorAll('input[type="password"]');
    expect(secretInputs.length).toBeGreaterThan(0);
    for (const input of secretInputs) {
      expect(input).toBeEnabled();
    }
  });

  it('uses the same constrained detail column as branding and other project forms', () => {
    const { container } = render(<ProjectOAuthConnectionsViewer scope={scope} />);
    expect(container.querySelector('.max-w-2xl')).toBeTruthy();
  });
});
