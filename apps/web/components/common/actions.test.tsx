// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Actions } from './actions';

vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    namespace ? `${namespace}.${key}` : key,
}));

const entity = { id: 'entity-1' };

function open() {
  const trigger = screen.getByRole('button', { name: 'common.accessibility.openMenu' });
  fireEvent.keyDown(trigger, { key: 'Enter' });
  return trigger;
}

describe('Actions', () => {
  it('keeps the trigger enabled while the actions are loading', () => {
    render(<Actions entity={entity} actions={[]} isLoading />);
    const trigger = screen.getByRole('button', { name: 'common.accessibility.openMenu' });
    expect(trigger.hasAttribute('disabled')).toBe(false);
  });

  it('opens on a loading row while the actions are not known yet', () => {
    const onOpenChange = vi.fn();
    render(<Actions entity={entity} actions={[]} isLoading onOpenChange={onOpenChange} />);
    open();

    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.getByTestId('actions-loading').textContent).toContain('common.loading');
    expect(screen.queryByTestId('actions-empty')).toBeNull();
  });

  it('says no actions are available when there are none, instead of an empty menu', () => {
    render(<Actions entity={entity} actions={[]} />);
    open();

    const empty = screen.getByTestId('actions-empty');
    expect(empty.textContent).toContain('common.noActionsAvailable');
    expect(empty.getAttribute('data-disabled')).not.toBeNull();
  });

  it('lists the actions and runs one with the entity', () => {
    const onEdit = vi.fn();
    render(
      <Actions
        entity={entity}
        actions={[{ key: 'edit', label: 'Edit', icon: null, onClick: onEdit }]}
      />
    );
    open();

    expect(screen.queryByTestId('actions-empty')).toBeNull();
    fireEvent.click(screen.getByText('Edit'));
    expect(onEdit).toHaveBeenCalledWith(entity);
  });
});
