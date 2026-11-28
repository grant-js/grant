// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { JSON_EDITOR_MAX_HEIGHT } from './json-editor';
import { MetadataEditorCard } from './metadata-editor-card';

const editor = vi.hoisted(() => ({
  props: null as null | {
    value?: unknown;
    onChange?: (value: object | null) => void;
    disabled?: boolean;
    maxHeight?: string;
  },
}));

vi.mock('./json-editor', () => ({
  JSON_EDITOR_MAX_HEIGHT: 'min(32rem, 70vh)',
  JsonEditor: (props: typeof editor.props) => {
    editor.props = props;
    return <div data-testid="json-editor">{JSON.stringify(props?.value)}</div>;
  },
}));
vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    `${namespace ? `${namespace}.` : ''}${key}`,
}));

const renderCard = (props: Partial<Parameters<typeof MetadataEditorCard>[0]> = {}) =>
  render(
    <MetadataEditorCard
      entityId="r-1"
      metadata={{ department: 'finance' }}
      title="Metadata"
      description="Optional JSON"
      canEdit
      onSave={vi.fn(async () => undefined)}
      {...props}
    />
  );

describe('MetadataEditorCard', () => {
  it('starts collapsed and shows the editor once opened', () => {
    renderCard();
    expect(screen.queryByTestId('json-editor')).toBeNull();

    fireEvent.click(screen.getByText('Metadata'));
    expect(screen.getByTestId('json-editor').textContent).toBe('{"department":"finance"}');
  });

  it('caps the editor at the shared JSON editor height', () => {
    renderCard();
    fireEvent.click(screen.getByText('Metadata'));
    expect(editor.props?.maxHeight).toBe(JSON_EDITOR_MAX_HEIGHT);
  });

  it('saves the edited metadata', async () => {
    const onSave = vi.fn(async () => undefined);
    renderCard({ onSave });
    fireEvent.click(screen.getByText('Metadata'));

    act(() => editor.props?.onChange?.({ department: 'sales' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'common.actions.save' }));
    });
    expect(onSave).toHaveBeenCalledWith({ department: 'sales' });
  });

  it('is read-only, with no Save, for a viewer who may not edit', () => {
    renderCard({ canEdit: false });
    fireEvent.click(screen.getByText('Metadata'));
    expect(editor.props?.disabled).toBe(true);
    expect(screen.queryByRole('button', { name: 'common.actions.save' })).toBeNull();
  });

  it('reads metadata stored as a JSON string', () => {
    renderCard({ metadata: '{"region":"eu"}' });
    fireEvent.click(screen.getByText('Metadata'));
    expect(screen.getByTestId('json-editor').textContent).toBe('{"region":"eu"}');
  });
});
