import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Every card view with body fields lets the user show, hide and reorder them
 * (`usePageCardFields`). A body item whose key is not declared as a field is never listed by
 * the toolbar picker (it is kept, at the end, but cannot be hidden), and a declared field
 * without an item is a picker row that does nothing. Both are easy to introduce by editing
 * one list and not the other, so the two are compared here, per card view, from the source.
 */

const FEATURES = join(__dirname);

function cardViews(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return cardViews(path);
    return name.endsWith('-cards.tsx') ? [path] : [];
  });
}

const keysOf = (source: string, pattern: RegExp) =>
  [...source.matchAll(pattern)].map((match) => match[1]).sort();

const views = cardViews(FEATURES)
  .map((path) => ({ path, source: readFileSync(path, 'utf8') }))
  .filter(({ source }) => source.includes('<CardBody'));

describe('card views and their body fields', () => {
  it('finds the card views with a body', () => {
    expect(views.length).toBeGreaterThanOrEqual(11);
  });

  it.each(views.map(({ path, source }) => [relative(FEATURES, path), source]))(
    '%s declares exactly the fields its body items carry',
    (_name, source) => {
      expect(source).toContain('usePageCardFields(');
      const declared = keysOf(source, /\{ key: '([^']+)', label: /g);
      const items = keysOf(source, /\n\s+key: '([^']+)',\n\s+label: \{/g);
      expect(declared.length).toBeGreaterThan(0);
      expect(items).toEqual(declared);
    }
  );
});
