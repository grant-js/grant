import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string, values?: Record<string, unknown>) =>
    values ? `${namespace}.${key}:${JSON.stringify(values)}` : `${namespace}.${key}`,
}));

// `@/components/common` reaches `@/i18n/navigation`, which the test runner cannot resolve,
// and the editor is CodeMirror. Neither is what is under test.
vi.mock('@/components/common', () => ({
  FeatureModuleCard: ({
    children,
    footer,
  }: {
    children: React.ReactNode;
    footer: React.ReactNode;
  }) => (
    <div>
      {children}
      {footer}
    </div>
  ),
  JsonEditor: ({ value }: { value: unknown }) => (
    <pre data-testid="json-editor">{JSON.stringify(value)}</pre>
  ),
}));

const { ProjectSyncJobPayloadCard } = await import('./project-sync-job-payload-card');

const noop = () => undefined;

function renderCard(payload: Record<string, unknown> | null) {
  return render(
    <ProjectSyncJobPayloadCard
      payload={payload}
      loading={false}
      error={null}
      onReload={noop}
      onDownload={noop}
    />
  );
}

describe('ProjectSyncJobPayloadCard', () => {
  it('says the document is stored by reference, with its size, instead of dumping the stub', () => {
    renderCard({ byReference: true, sizeBytes: 12 * 1024 * 1024 });

    expect(
      screen.getByText('projectSyncJobs.viewDialog.payload.byReference:{"size":"12"}')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('json-editor')).not.toBeInTheDocument();
  });

  it('has nothing to download for a by-reference job', () => {
    renderCard({ byReference: true, sizeBytes: 1024 * 1024 });

    expect(screen.getByRole('button', { name: /download/i })).toBeDisabled();
  });

  it('still shows an inline payload as JSON, downloadable', () => {
    renderCard({ version: 1, mode: { strategy: 'merge' }, roles: [], users: [] });

    expect(screen.getByTestId('json-editor')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /download/i })).toBeEnabled();
  });
});
