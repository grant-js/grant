import { describe, expect, it } from 'vitest';

import { vendoredOperations } from './operations.js';

describe('vendoredOperations', () => {
  it('includes the REST surface with stable operationIds', () => {
    expect(vendoredOperations.length).toBeGreaterThan(100);
    expect(vendoredOperations.some((operation) => operation.path === '/api/users')).toBe(true);
    expect(vendoredOperations.some((operation) => operation.operationId === 'getApiMe')).toBe(true);
    expect(
      vendoredOperations.every(
        (operation) => operation.operationId && operation.method && operation.path
      )
    ).toBe(true);
  });
});
