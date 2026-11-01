// @vitest-environment jsdom

import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { FeatureModuleCard } from './feature-module-card';
import { Pagination } from './pagination';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    key === 'pagination.info' ? `Page ${values?.current} of ${values?.total}` : key,
}));

vi.mock('@/components/layout/current-organization-sync', () => ({
  CurrentOrganizationSync: () => null,
}));

vi.mock('@/components/layout/current-project-sync', () => ({
  CurrentProjectSync: () => null,
}));

vi.mock('@/components/layout/dashboard-toolbar', () => ({
  DashboardToolbar: () => <div data-testid="toolbar" />,
}));

vi.mock('@/components/ui/sidebar', () => ({
  SidebarProvider: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SidebarInset: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

const { DashboardLayout } = await import('@/components/layout/dashboard-layout');

function assertPagerOrder(root: HTMLElement | null) {
  expect(root).not.toBeNull();
  const info = root!.querySelector('[data-slot="pagination-info"]');
  const nav = root!.querySelector('[data-slot="pagination-nav"]');
  const children = Array.from(root!.children);

  expect(info).toHaveTextContent('Page 2 of 5');
  expect(nav?.querySelectorAll('button')).toHaveLength(2);
  expect(children[0]).toBe(info);
  expect(children[1]).toBe(nav);
  expect(root).toHaveClass('w-full');
  expect(root).toHaveClass('justify-between');
}

describe('Pagination footer', () => {
  it('places the page counter on the left and nav buttons on the right', () => {
    const { container } = render(<Pagination page={2} totalPages={5} onPageChange={vi.fn()} />);

    assertPagerOrder(container.querySelector('[data-slot="pagination"]'));
  });

  it('stretches a FeatureModuleCard-hosted pager across the full footer', () => {
    const { container } = render(
      <FeatureModuleCard
        title="Roles"
        footer={<Pagination page={2} totalPages={5} onPageChange={vi.fn()} />}
      >
        <div>body</div>
      </FeatureModuleCard>
    );

    const footer = container.querySelector('[data-slot="card-footer"]');
    const pager = footer?.querySelector('[data-slot="pagination"]');

    expect(footer).toHaveClass('w-full');
    expect(footer).toHaveClass('min-w-0');
    expect(pager).toHaveClass('w-full');
    assertPagerOrder((pager as HTMLElement | null) ?? null);
  });

  it('stretches a dashboard-footer pager across the full footer', () => {
    const { container } = render(
      <DashboardLayout
        title="Roles"
        footer={<Pagination page={2} totalPages={5} onPageChange={vi.fn()} />}
      >
        <div>body</div>
      </DashboardLayout>
    );

    const footer = container.querySelector('[data-slot="dashboard-footer"]');
    const pager = footer?.querySelector('[data-slot="pagination"]');

    expect(footer).toHaveClass('w-full');
    expect(footer).toHaveClass('min-w-0');
    expect(pager).toHaveClass('w-full');
    assertPagerOrder((pager as HTMLElement | null) ?? null);
  });
});
