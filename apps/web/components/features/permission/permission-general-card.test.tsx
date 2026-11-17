// @vitest-environment jsdom

import type { Permission } from '@grantjs/schema';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PermissionGeneralCard } from './permission-general-card';

let routeParams: Record<string, string | undefined> = {};

vi.mock('next/navigation', () => ({
  useParams: () => routeParams,
}));
vi.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string, values?: Record<string, unknown>) =>
    [namespace ? `${namespace}.${key}` : key, ...Object.values(values ?? {})].join(' '),
}));
vi.mock('@grantjs/client/react', () => ({ useGrant: () => false }));
vi.mock('@/hooks/common', () => ({
  useScopeFromParams: () => ({ tenant: 'organizationProject', id: 'org-1:project-1' }),
}));
vi.mock('@/hooks/permissions', () => ({
  usePermissionMutations: () => ({ updatePermission: vi.fn() }),
}));

vi.mock('@/components/common', async () => {
  const table = await vi.importActual<
    typeof import('@/components/common/entity-detail-info-table')
  >('@/components/common/entity-detail-info-table');
  const link = await vi.importActual<
    typeof import('@/components/common/detail-entity-link-column')
  >('@/components/common/detail-entity-link-column');
  return {
    Avatar: () => <span />,
    CopyToClipboard: () => <button type="button">copy</button>,
    FeatureModuleCard: ({ children }: { children: ReactNode }) => <section>{children}</section>,
    PrimaryTagSelector: () => null,
    EntityDetailInfoTable: table.EntityDetailInfoTable,
    DetailEntityLink: link.DetailEntityLink,
  };
});

const permission = {
  id: 'permission-1',
  name: 'Approve invoices',
  action: 'approve',
  tags: [],
  resource: { id: 'resource-1', name: 'Invoice', slug: 'invoice' },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
} as unknown as Permission;

describe('PermissionGeneralCard resource link', () => {
  beforeEach(() => {
    routeParams = {};
  });

  it('links the resource to its detail page inside a project', () => {
    routeParams = { organizationId: 'org-1', projectId: 'project-1' };
    render(<PermissionGeneralCard permission={permission} />);

    expect(screen.getByText('Invoice')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'common.openEntity.resource Invoice' })
    ).toHaveAttribute(
      'href',
      '/dashboard/organizations/org-1/projects/project-1/resources/resource-1'
    );
  });

  it('shows the resource without a link at organization level, where resources have no page', () => {
    routeParams = { organizationId: 'org-1' };
    render(<PermissionGeneralCard permission={permission} />);

    expect(screen.getByText('Invoice')).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
  });
});
