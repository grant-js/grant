import { describe, it, expect } from 'vitest';

import { cn } from '@/lib/utils/merge-class-names';

describe('cn (merge-class-names)', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    const showHidden = false;
    const showVisible = true;
    expect(cn('base', showHidden && 'hidden', showVisible && 'visible')).toBe('base visible');
  });

  it('merges tailwind classes correctly', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2');
  });
});
