import { describe, expect, it } from 'vitest';

import { hasGraphQLErrorCode } from './graphql-error-code';

describe('hasGraphQLErrorCode', () => {
  it('finds the code in a combined error and in graphQLErrors', () => {
    expect(
      hasGraphQLErrorCode({ errors: [{ extensions: { code: 'CONFLICT' } }] }, 'CONFLICT')
    ).toBe(true);
    expect(
      hasGraphQLErrorCode({ graphQLErrors: [{ extensions: { code: 'CONFLICT' } }] }, 'CONFLICT')
    ).toBe(true);
  });

  it('answers false for another code, no extensions, or not an error object', () => {
    expect(
      hasGraphQLErrorCode({ errors: [{ extensions: { code: 'NOT_FOUND' } }] }, 'CONFLICT')
    ).toBe(false);
    expect(hasGraphQLErrorCode({ errors: [{ message: 'x' }, null] }, 'CONFLICT')).toBe(false);
    expect(hasGraphQLErrorCode(new Error('CONFLICT'), 'CONFLICT')).toBe(false);
    expect(hasGraphQLErrorCode(undefined, 'CONFLICT')).toBe(false);
  });
});
