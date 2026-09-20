// @vitest-environment jsdom

import { ProjectOAuthConnectionProvider } from '@grantjs/schema';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

import { Form } from '@/components/ui/form';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const { ProjectAppEnabledProvidersField } = await import('./project-app-enabled-providers-field');

const providerItems = [
  { id: 'email', name: 'Email' },
  { id: ProjectOAuthConnectionProvider.Github, name: 'GitHub' },
  { id: ProjectOAuthConnectionProvider.Google, name: 'Google' },
];

const hrefByProvider = {
  [ProjectOAuthConnectionProvider.Github]:
    '/dashboard/organizations/org-1/projects/project-1/oauth-connections#github',
  [ProjectOAuthConnectionProvider.Google]:
    '/dashboard/organizations/org-1/projects/project-1/oauth-connections#google',
};

function renderField(configuredProviders: ReadonlySet<string> = new Set()) {
  function Harness() {
    const form = useForm({
      defaultValues: { enabledProviders: ['email'] },
    });

    return (
      <Form {...form}>
        <ProjectAppEnabledProvidersField
          control={form.control}
          name="enabledProviders"
          label="Auth providers"
          items={providerItems}
          emptyText="None"
          connectionHrefByProvider={hrefByProvider}
          configuredProviders={configuredProviders}
        />
      </Form>
    );
  }

  return render(<Harness />);
}

describe('ProjectAppEnabledProvidersField', () => {
  it('links social provider gears to the project OAuth connections page without blocking toggles', () => {
    renderField();

    const socialGears = screen.getAllByRole('link', { name: 'configureConnectionAria' });
    expect(socialGears).toHaveLength(2);
    expect(socialGears[0]).toHaveAttribute('href', hrefByProvider.github);
    expect(socialGears[1]).toHaveAttribute('href', hrefByProvider.google);

    expect(screen.queryByRole('link', { name: 'Email' })).toBeNull();

    const switches = screen.getAllByRole('switch');
    expect(switches).toHaveLength(3);
    for (const providerSwitch of switches) {
      expect(providerSwitch).toBeEnabled();
    }
  });

  it('explains platform fallback only when a social provider has no project connection', () => {
    renderField(new Set([ProjectOAuthConnectionProvider.Github]));

    expect(screen.getByText('usingPlatformCredentials', { exact: false })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'configureConnection' })).toHaveAttribute(
      'href',
      hrefByProvider.google
    );

    const githubLinks = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href') === hrefByProvider.github);
    expect(githubLinks).toHaveLength(1);
  });
});
