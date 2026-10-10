import { describe, expect, it } from 'vitest';

import { parseOutputFormat } from './output.js';

describe('parseOutputFormat', () => {
  it('accepts json and text', () => {
    expect(parseOutputFormat('json')).toBe('json');
    expect(parseOutputFormat('text')).toBe('text');
    expect(parseOutputFormat('table')).toBe('text');
  });

  it('rejects unknown formats', () => {
    expect(() => parseOutputFormat('yaml')).toThrow(/Unknown --output/);
  });
});
