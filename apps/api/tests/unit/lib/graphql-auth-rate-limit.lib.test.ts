import { describe, expect, it } from 'vitest';

import {
  AUTH_SENSITIVE_GRAPHQL_OPERATION_NAMES,
  countSetEmailGraphqlOperations,
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

  it('treats leftover GraphQL mount paths as GraphQL', () => {
    expect(
      isAuthSensitiveGraphqlRequest({
        method: 'POST',
        path: '/graphql/foo',
        body: {
          operationName: 'login',
          query: 'mutation login { login { accessToken } }',
        },
      })
    ).toBe(true);
    expect(
      isAuthSensitiveGraphqlRequest({
        method: 'POST',
        path: '/graphql//',
        body: { query: 'mutation { login { accessToken } }' },
      })
    ).toBe(true);
  });

  it('does not treat /graphql-admin as the GraphQL mount', () => {
    expect(
      isAuthSensitiveGraphqlRequest({
        method: 'POST',
        path: '/graphql-admin',
        body: {
          operationName: 'login',
          query: 'mutation login { login { accessToken } }',
        },
      })
    ).toBe(false);
  });

  it('does not hang on a cyclic fragment document', () => {
    const cyclic =
      'fragment A on Mutation { ...B } fragment B on Mutation { ...A } mutation { ...A }';
    expect(graphqlDocumentUsesAuthSensitiveOperation(cyclic)).toBe(false);
    expect(
      isAuthSensitiveGraphqlRequest({
        method: 'POST',
        path: '/graphql',
        body: { query: cyclic },
      })
    ).toBe(false);
  });

  it('still sees login through an acyclic fragment after the cycle guard', () => {
    const cyclicWithLogin =
      'fragment A on Mutation { login { accessToken } ...B } fragment B on Mutation { ...A } mutation { ...A }';
    expect(graphqlDocumentUsesAuthSensitiveOperation(cyclicWithLogin)).toBe(true);
  });
});

describe('countSetEmailGraphqlOperations', () => {
  const post = (body: unknown, path = '/graphql') => ({ method: 'POST', path, body });
  const count = (body: unknown, path?: string) => countSetEmailGraphqlOperations(post(body, path));

  const setEmail =
    'setProjectUserEmail(input: { userId: "u", email: "a@b.c", scope: { tenant: project, id: "p" } }) { id }';

  it('counts setProjectUserEmail, named, unnamed, or under another operation name', () => {
    expect(count({ query: `mutation { ${setEmail} }` })).toBe(1);
    expect(count({ query: `mutation SetEmail { ${setEmail} }`, operationName: 'SetEmail' })).toBe(
      1
    );
    expect(count({ query: `mutation Harmless { ${setEmail} }`, operationName: 'Harmless' })).toBe(
      1
    );
  });

  it('counts the operation reached through a fragment, an inline fragment or an alias', () => {
    expect(count({ query: `fragment F on Mutation { ${setEmail} } mutation { ...F }` })).toBe(1);
    expect(count({ query: `mutation { ... on Mutation { ${setEmail} } }` })).toBe(1);
    expect(count({ query: `mutation { harmless: ${setEmail} }` })).toBe(1);
  });

  it('counts every set-email field of one document', () => {
    expect(count({ query: `mutation { a: ${setEmail} b: ${setEmail} }` })).toBe(2);
  });

  it('reads the operation selected by operationName', () => {
    const query = `mutation A { ${setEmail} } mutation B { me2: updateUser(input: { id: "u" }) { id } }`;
    expect(count({ query, operationName: 'A' })).toBe(1);
    expect(count({ query, operationName: 'B' })).toBe(0);
  });

  describe('createUser', () => {
    const createUser = (input: string) => `mutation { createUser(input: ${input}) { id } }`;
    const scope = 'scope: { tenant: project, id: "p" }';

    it('counts an inline input with an email and not one without, or with a literal null', () => {
      expect(count({ query: createUser(`{ name: "N", email: "a@b.c", ${scope} }`) })).toBe(1);
      expect(count({ query: createUser(`{ name: "N", ${scope} }`) })).toBe(0);
      expect(count({ query: createUser(`{ name: "N", email: null, ${scope} }`) })).toBe(0);
    });

    it('reads an input passed as a variable', () => {
      const query = 'mutation C($i: CreateUserInput!) { createUser(input: $i) { id } }';
      expect(count({ query, variables: { i: { name: 'N', email: 'a@b.c' } } })).toBe(1);
      expect(count({ query, variables: { i: { name: 'N' } } })).toBe(0);
      expect(count({ query, variables: { i: { name: 'N', email: null } } })).toBe(0);
    });

    it('reads an email passed as a variable inside an inline input', () => {
      const query = `mutation C($e: String) { createUser(input: { name: "N", email: $e, ${scope} }) { id } }`;
      expect(count({ query, variables: { e: 'a@b.c' } })).toBe(1);
      expect(count({ query, variables: { e: null } })).toBe(0);
      expect(count({ query, variables: {} })).toBe(0);
      expect(count({ query })).toBe(0);
    });

    it('honours a default value of the variable', () => {
      const query = `mutation C($e: String = "a@b.c") { createUser(input: { name: "N", email: $e, ${scope} }) { id } }`;
      expect(count({ query, variables: {} })).toBe(1);
      expect(count({ query, variables: { e: null } })).toBe(0);
    });
  });

  it('does not count other mutations, queries, a non-GraphQL path or a GET', () => {
    expect(count({ query: 'mutation { updateUser(input: { id: "u" }) { id } }' })).toBe(0);
    expect(count({ query: 'query { me { id } }' })).toBe(0);
    expect(count({ query: `mutation { ${setEmail} }` }, '/api/other')).toBe(0);
    expect(
      countSetEmailGraphqlOperations({
        method: 'GET',
        path: '/graphql',
        body: { query: `mutation { ${setEmail} }` },
      })
    ).toBe(0);
  });

  it('matches the GraphQL path the way the router does: case-insensitive, sub-path', () => {
    expect(count({ query: `mutation { ${setEmail} }` }, '/GraphQL')).toBe(1);
    expect(count({ query: `mutation { ${setEmail} }` }, '/graphql/foo')).toBe(1);
  });

  it('counts each item of a batched body', () => {
    expect(
      count([
        { query: `mutation { ${setEmail} }` },
        { query: 'query { me { id } }' },
        { query: `mutation { ${setEmail} }` },
      ])
    ).toBe(2);
  });

  it('counts a hash-only persisted query, which cannot be classified', () => {
    expect(count({ extensions: { persistedQuery: { version: 1, sha256Hash: 'abc' } } })).toBe(1);
    expect(count({})).toBe(0);
  });

  it('does not count an unparseable document (nothing runs) and survives a cyclic fragment', () => {
    expect(count({ query: 'mutation {' })).toBe(0);
    expect(
      count({
        query: `fragment A on Mutation { ...B } fragment B on Mutation { ...A ${setEmail} } mutation { ...A }`,
      })
    ).toBe(1);
  });
});
