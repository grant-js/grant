import { describe, expect, it } from 'vitest';

import { mapOperations } from './map-commands.js';
import { vendoredOperations } from './operations.js';

describe('vendoredOperations', () => {
  it('includes the REST surface used by named commands', () => {
    expect(vendoredOperations.length).toBeGreaterThan(100);
    expect(vendoredOperations.some((operation) => operation.path === '/api/users')).toBe(true);
    expect(vendoredOperations.some((operation) => operation.operationId === 'getApiMe')).toBe(true);
    const mapped = mapOperations(vendoredOperations);
    expect(mapped.some((item) => item.group === 'users' && item.verb === 'list')).toBe(true);
  });
});
