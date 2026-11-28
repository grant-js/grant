// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChipPopover } from './chip-popover';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('ChipPopover', () => {
  it('is a plain chip without content', () => {
    const onOpen = vi.fn();
    render(
      <ChipPopover label="Nothing" hasContent={false} onOpen={onOpen}>
        <p>Body</p>
      </ChipPopover>
    );
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('Nothing')).toBeDefined();
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('opens after the hover delay, calls onOpen, and closes after the pointer leaves', () => {
    const onOpen = vi.fn();
    render(
      <ChipPopover label="Something" hasContent onOpen={onOpen}>
        <p>Body</p>
      </ChipPopover>
    );
    const chip = screen.getByRole('button', { name: 'Something' });

    fireEvent.mouseEnter(chip);
    act(() => vi.advanceTimersByTime(300));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(screen.getByText('Body')).toBeDefined();

    fireEvent.mouseLeave(chip);
    act(() => vi.advanceTimersByTime(150));
    expect(screen.queryByText('Body')).toBeNull();
  });

  it('does not open when the pointer passes over the chip quickly', () => {
    render(
      <ChipPopover label="Something" hasContent>
        <p>Body</p>
      </ChipPopover>
    );
    const chip = screen.getByRole('button', { name: 'Something' });
    fireEvent.mouseEnter(chip);
    act(() => vi.advanceTimersByTime(100));
    fireEvent.mouseLeave(chip);
    act(() => vi.advanceTimersByTime(400));
    expect(screen.queryByText('Body')).toBeNull();
  });
});
