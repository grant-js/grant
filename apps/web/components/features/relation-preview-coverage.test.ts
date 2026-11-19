import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Every relationship count a list shows ("3 roles", "2 tags") previews what it counts on
 * hover. A count rendered in a plain badge looks the same but opens nothing, so each one is
 * checked here, from the source: the element that wraps it must be a count chip.
 */

const FEATURES = join(__dirname);
const COUNT_KEYS = ['tagCount', 'roleCount', 'groupCount', 'permissionCount', 'permissionsCount'];

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return name.endsWith('.tsx') && !name.includes('.test.') ? [path] : [];
  });
}

const counts = sources(FEATURES).flatMap((path) => {
  const source = readFileSync(path, 'utf8');
  const pattern = new RegExp(`\\('(${COUNT_KEYS.join('|')})'`, 'g');
  return [...source.matchAll(pattern)].map((match) => {
    const before = source.slice(0, match.index);
    const wrapper = [...before.matchAll(/<([A-Z]\w*)/g)].at(-1)?.[1];
    return { site: `${relative(FEATURES, path)} ${match[1]}`, wrapper };
  });
});

describe('relationship counts in lists', () => {
  it('finds the counts', () => {
    expect(counts.length).toBeGreaterThanOrEqual(20);
  });

  it.each(counts.map((count) => [count.site, count.wrapper]))(
    '%s is a count chip with a preview',
    (_site, wrapper) => {
      expect(wrapper).toMatch(/^(RelationCountChip|LoadedCountChip)$/);
    }
  );
});
