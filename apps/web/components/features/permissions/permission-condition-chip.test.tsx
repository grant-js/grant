// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PermissionConditionChip } from './permission-condition-chip';

vi.mock('next-intl', () => ({
  useTranslations: (namespace?: string) => (key: string) =>
    `${namespace ? `${namespace}.` : ''}${key}`,
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const CONDITION = {
  StringEquals: { 'user.metadata.department': '{{resource.department}}' },
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('PermissionConditionChip', () => {
  it.each([
    ['null', null],
    ['undefined', undefined],
    ['an empty object', {}],
  ])('is a plain "No condition" chip that opens nothing for %s', (_label, condition) => {
    render(<PermissionConditionChip condition={condition} />);
    expect(screen.getByText('permissions.conditionChip.none')).toBeDefined();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('says "Has condition" and opens after the hover delay, like the count chips', () => {
    render(<PermissionConditionChip condition={CONDITION} />);
    const chip = screen.getByRole('button', { name: 'permissions.conditionChip.has' });

    fireEvent.mouseEnter(chip);
    act(() => vi.advanceTimersByTime(299));
    expect(screen.queryByTestId('permission-condition-json')).toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByTestId('permission-condition-json')).toBeDefined();
  });

  it('opens at once on focus and shows the condition as formatted JSON', () => {
    render(<PermissionConditionChip condition={CONDITION} />);
    fireEvent.focus(screen.getByRole('button', { name: 'permissions.conditionChip.has' }));
    expect(screen.getByTestId('permission-condition-json').textContent).toBe(
      JSON.stringify(CONDITION, null, 2)
    );
  });

  it('copies the JSON to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<PermissionConditionChip condition={CONDITION} />);
    fireEvent.focus(screen.getByRole('button', { name: 'permissions.conditionChip.has' }));

    await act(async () => {
      fireEvent.click(screen.getByTitle('common.copy.title'));
    });
    expect(writeText).toHaveBeenCalledWith(JSON.stringify(CONDITION, null, 2));
  });
});
