import { describe, expect, it } from 'vitest';

import {
  DATA_TABLE_ACTIONS_COLUMN_WIDTH,
  DATA_TABLE_UNSIZED_COLUMN_MIN_WIDTH,
  dataTableMinWidthStyle,
} from './detail-table-column-width';

describe('dataTableMinWidthStyle', () => {
  it('sums the declared column widths', () => {
    expect(dataTableMinWidthStyle([{ width: '240px' }, { width: '15rem' }])).toEqual({
      minWidth: 'calc(240px + 15rem)',
    });
  });

  it('gives unsized columns a floor and counts the actions column', () => {
    expect(dataTableMinWidthStyle([{ width: '240px' }, {}], true)).toEqual({
      minWidth: `calc(240px + ${DATA_TABLE_UNSIZED_COLUMN_MIN_WIDTH} + ${DATA_TABLE_ACTIONS_COLUMN_WIDTH})`,
    });
  });

  it('uses a single width as is', () => {
    expect(dataTableMinWidthStyle([{ width: '160px' }])).toEqual({ minWidth: '160px' });
  });

  it('returns nothing for a table without columns', () => {
    expect(dataTableMinWidthStyle([])).toBeUndefined();
  });
});
