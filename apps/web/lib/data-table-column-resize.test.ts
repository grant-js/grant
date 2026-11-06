import { describe, expect, it } from 'vitest';

import {
  clampColumnWidth,
  isChromeDataTableColumn,
  isDataTableColumnResizable,
  parseColumnWidthPx,
  resolveColumnBounds,
  shrinkFittedWidths,
} from './data-table-column-resize';

describe('resolveColumnBounds / clampColumnWidth', () => {
  it('defaults to 64..640 and clamps to it', () => {
    const bounds = resolveColumnBounds({});
    expect(bounds).toEqual({ min: 64, max: 640 });
    expect(clampColumnWidth(10, bounds)).toBe(64);
    expect(clampColumnWidth(9999, bounds)).toBe(640);
    expect(clampColumnWidth(200.4, bounds)).toBe(200);
  });

  it('uses the column bounds and never lets max fall below min', () => {
    expect(resolveColumnBounds({ minWidth: 100, maxWidth: 300 })).toEqual({ min: 100, max: 300 });
    expect(resolveColumnBounds({ minWidth: 100, maxWidth: 50 })).toEqual({ min: 100, max: 100 });
  });
});

describe('isDataTableColumnResizable', () => {
  it('resizes ordinary text columns', () => {
    expect(isDataTableColumnResizable({ header: 'Name', width: '200px' })).toBe(true);
  });

  it('infers chrome columns as not resizable', () => {
    expect(isChromeDataTableColumn({ width: '2.5rem' })).toBe(true);
    expect(isChromeDataTableColumn({ className: 'w-10 min-w-10' })).toBe(true);
    expect(isDataTableColumnResizable({ header: 'Select', width: '2.75rem' })).toBe(false);
    expect(isDataTableColumnResizable({ header: 'Select', className: 'w-11 min-w-11' })).toBe(
      false
    );
    expect(isDataTableColumnResizable({ header: '', width: '60px' })).toBe(false);
  });

  it('lets enableResizing override the inference either way', () => {
    expect(isDataTableColumnResizable({ header: 'Name', enableResizing: false })).toBe(false);
    expect(
      isDataTableColumnResizable({ header: 'Pick', width: '2.5rem', enableResizing: true })
    ).toBe(true);
  });
});

describe('parseColumnWidthPx', () => {
  it('reads px and rem and ignores other units', () => {
    expect(parseColumnWidthPx('240px')).toBe(240);
    expect(parseColumnWidthPx('15rem')).toBe(240);
    expect(parseColumnWidthPx('20%')).toBeUndefined();
    expect(parseColumnWidthPx(undefined)).toBeUndefined();
  });
});

describe('shrinkFittedWidths', () => {
  const items = [
    { width: 200, floor: 100 },
    { width: 300, floor: 200 },
    { width: 40, floor: 40 },
  ];

  it('leaves widths alone when everything fits', () => {
    expect(shrinkFittedWidths(items, 600)).toEqual([200, 300, 40]);
    expect(shrinkFittedWidths(items, 0)).toEqual([200, 300, 40]);
  });

  it('shrinks proportionally to the room above the floor', () => {
    // 540 total, container 440: 100 excess over 200 room, half of it each.
    expect(shrinkFittedWidths(items, 440)).toEqual([150, 250, 40]);
  });

  it('never goes below the floor; the rest is left to scroll', () => {
    expect(shrinkFittedWidths(items, 100)).toEqual([100, 200, 40]);
  });

  it('counts the reserved width', () => {
    expect(shrinkFittedWidths(items, 540, 100)).toEqual([150, 250, 40]);
  });
});
