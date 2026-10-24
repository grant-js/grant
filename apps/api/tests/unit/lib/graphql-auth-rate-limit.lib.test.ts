import { describe, expect, it } from 'vitest';

import {
  AUTH_SENSITIVE_GRAPHQL_OPERATION_NAMES,
  graphqlDocumentUsesAuthSensitiveOperation,
  isAuthSensitiveGraphqlRequest,
} from '@/lib/graphql-auth-rate-limit.lib';

describe('graphql auth-sensitive rate-limit classification', () => {
  it('lists login, register, and refreshSession', () => {
    expect([...AUTH_SENSITIVE_GRAPHQL_OPERATION_NAMES]).toEqual([
      'login',
      'register',
      'refreshSession',
    ]);
  });

  it.each([
    ['named login', 'mutation login { login(input: { email: "a@b.c" }) { accessToken } }', 'login'],
    [
      'named register',
      'mutation register { register(input: { email: "a@b.c" }) { accessToken } }',
      'register',
    ],
    [
      'named refreshSession',
      'mutation refreshSession { refreshSession { accessToken } }',
      'refreshSession',
    ],
  ])('matches a %s operation', (_label, query, operationName) => {
    expect(graphqlDocumentUsesAuthSensitiveOperation(query, operationName)).toBe(true);
  });

  it('matches an unnamed document that is login', () => {
    expect(
      graphqlDocumentUsesAuthSensitiveOperation(
        'mutation { login(input: { email: "a@b.c" }) { accessToken } }'
      )
    ).toBe(true);
  });

  it('matches login selected under another operation name', () => {
    expect(
      graphqlDocumentUsesAuthSensitiveOperation(
        'mutation DoLogin { login(input: { email: "a@b.c" }) { accessToken } }',
        'DoLogin'
      )
    ).toBe(true);
  });

  it('matches login via a fragment on an unnamed mutation', () => {
    expect(
      graphqlDocumentUsesAuthSensitiveOperation(
        'fragment Auth on Mutation { login(input: { email: "a@b.c" }) { accessToken } } mutation { ...Auth }'
      )
    ).toBe(true);
  });

  it('does not match an unrelated GraphQL operation', () => {
    expect(graphqlDocumentUsesAuthSensitiveOperation('query Me { me { id } }', 'Me')).toBe(false);
  });

  it('does not match an unparseable document', () => {
    expect(graphqlDocumentUsesAuthSensitiveOperation('mutation {')).toBe(false);
  });

  it('treats POST /graphql login as auth-sensitive', () => {
    expect(
      isAuthSensitiveGraphqlRequest({
        method: 'POST',
        path: '/graphql',
        body: {
          operationName: 'login',
          query: 'mutation login { login { accessToken } }',
        },
      })
    ).toBe(true);
  });

  it('does not treat POST /graphql Me as auth-sensitive', () => {
    expect(
      isAuthSensitiveGraphqlRequest({
        method: 'POST',
        path: '/graphql',
        body: { operationName: 'Me', query: 'query Me { me { id } }' },
      })
    ).toBe(false);
  });

  it('does not treat REST login as a GraphQL auth document', () => {
    expect(
      isAuthSensitiveGraphqlRequest({
        method: 'POST',
        path: '/api/auth/login',
        body: { email: 'a@b.c' },
      })
    ).toBe(false);
  });
});
