// @vitest-environment jsdom

import { ProjectOAuthConnection, ProjectOAuthConnectionProvider } from '@grantjs/schema';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

const { ProjectOAuthConnectionProviderSection } =
  await import('./project-oauth-connection-provider-section');

const configuredConnection: ProjectOAuthConnection = {
  id: 'conn-1',
  projectId: 'project-1',
  provider: ProjectOAuthConnectionProvider.Github,
  clientId: 'github-client',
  isConfigured: true,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('ProjectOAuthConnectionProviderSection', () => {
  it('styles a stored connection as success and an empty one as muted', () => {
    const { rerender } = render(
      <ProjectOAuthConnectionProviderSection
        provider={ProjectOAuthConnectionProvider.Github}
        connection={configuredConnection}
        disabled={false}
        onSave={vi.fn()}
        onClear={vi.fn()}
      />
    );

    const configured = screen.getByText('configuredBadge');
    expect(configured.className).toContain('bg-success');
    expect(document.getElementById('github')).toBeTruthy();

    rerender(
      <ProjectOAuthConnectionProviderSection
        provider={ProjectOAuthConnectionProvider.Google}
        connection={undefined}
        disabled={false}
        onSave={vi.fn()}
        onClear={vi.fn()}
      />
    );

    const unconfigured = screen.getByText('notConfiguredBadge');
    expect(unconfigured.className).not.toContain('bg-success');
    expect(unconfigured.className).toContain('text-foreground');
  });
});
