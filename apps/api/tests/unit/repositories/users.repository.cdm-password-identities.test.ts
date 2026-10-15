/**
 * `UserRepository.findCdmPasswordIdentities` (ADR 0010, Amendment): the facts behind org
 * confinement, gathered for a whole import in a constant number of queries.
 *
 * The database is a recording fake keyed by the table each query selects from, so the test
 * asserts what is asked (how many queries, which soft-delete filters, no transaction) and how
 * the answers are turned into a decision. The SQL itself is plain selects with `IN` lists.
 */
import {
  organizationProjects,
  organizationUsers,
  projectUsers,
  userAuthenticationMethods,
} from '@grantjs/database';
import { PgDialect } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';

import { UserRepository } from '@/repositories/users.repository';

const IMPORTING_PROJECT = '10000000-0000-4000-8000-000000000011';
const SIBLING_PROJECT = '10000000-0000-4000-8000-000000000012';
const FOREIGN_PROJECT = '10000000-0000-4000-8000-000000000013';
const ORG_A = '10000000-0000-4000-8000-0000000000a1';
const ORG_B = '10000000-0000-4000-8000-0000000000b1';

const dialect = new PgDialect();

interface RecordedQuery {
  table: unknown;
  joinOn: string[];
  where: string;
  limit: number | null;
}

/** Answers per table; each query shifts the next answer for its table. */
function fakeDb(answers: Map<unknown, unknown[][]>) {
  const queries: RecordedQuery[] = [];
  const select = () => {
    const recorded: RecordedQuery = { table: null, joinOn: [], where: '', limit: null };
    const builder: Record<string, unknown> = {
      from: (table: unknown) => {
        recorded.table = table;
        queries.push(recorded);
        return builder;
      },
      innerJoin: (_table: unknown, on: Parameters<PgDialect['sqlToQuery']>[0]) => {
        recorded.joinOn.push(dialect.sqlToQuery(on).sql);
        return builder;
      },
      leftJoin: (_table: unknown, on: Parameters<PgDialect['sqlToQuery']>[0]) => {
        recorded.joinOn.push(dialect.sqlToQuery(on).sql);
        return builder;
      },
      where: (condition: Parameters<PgDialect['sqlToQuery']>[0]) => {
        recorded.where = dialect.sqlToQuery(condition).sql;
        return builder;
      },
      limit: (n: number) => {
        recorded.limit = n;
        return builder;
      },
      then: (resolve: (rows: unknown[]) => unknown, reject: (e: unknown) => unknown) => {
        const next = answers.get(recorded.table)?.shift();
        return Promise.resolve(next ?? []).then(resolve, reject);
      },
    };
    return builder;
  };
  return { db: { select }, queries };
}

const method = (id: string, userId: string, providerId: string, cdmImport: unknown = null) => ({
  methodId: id,
  userId,
  providerId,
  cdmImport,
});

describe('UserRepository.findCdmPasswordIdentities', () => {
  it('asks a constant number of questions for any number of addresses', async () => {
    const { db, queries } = fakeDb(
      new Map<unknown, unknown[][]>([
        [organizationProjects, [[{ organizationId: ORG_A }]]],
        [userAuthenticationMethods, [[method('m1', 'u1', 'ada@example.test')]]],
        [projectUsers, [[{ userId: 'u1', projectId: SIBLING_PROJECT, organizationId: ORG_A }]]],
        [organizationUsers, [[]]],
      ])
    );
    const emails = Array.from({ length: 800 }, (_, i) => `person${i}@example.test`);

    await new UserRepository(db as never).findCdmPasswordIdentities({
      projectId: IMPORTING_PROJECT,
      emails,
    });

    // The importing project's organization, the methods, the users' OAuth methods, then the
    // two membership tables.
    expect(queries.map((q) => q.table)).toEqual([
      organizationProjects,
      userAuthenticationMethods,
      userAuthenticationMethods,
      projectUsers,
      organizationUsers,
    ]);
  });

  it('chunks the IN lists of a very large import instead of binding every address at once', async () => {
    const { db, queries } = fakeDb(
      new Map([[organizationProjects, [[{ organizationId: ORG_A }]]]])
    );
    const emails = Array.from({ length: 12_000 }, (_, i) => `person${i}@example.test`);

    await new UserRepository(db as never).findCdmPasswordIdentities({
      projectId: IMPORTING_PROJECT,
      emails,
    });

    expect(queries.filter((q) => q.table === userAuthenticationMethods)).toHaveLength(3);
  });

  it('does nothing for an import without addresses', async () => {
    const { db, queries } = fakeDb(new Map());

    await expect(
      new UserRepository(db as never).findCdmPasswordIdentities({
        projectId: IMPORTING_PROJECT,
        emails: [],
      })
    ).resolves.toEqual([]);
    expect(queries).toEqual([]);
  });

  it('reads only active rows: soft-deleted memberships, projects links, methods and users do not count', async () => {
    const { db, queries } = fakeDb(
      new Map<unknown, unknown[][]>([
        [organizationProjects, [[{ organizationId: ORG_A }]]],
        [userAuthenticationMethods, [[method('m1', 'u1', 'ada@example.test')]]],
      ])
    );

    await new UserRepository(db as never).findCdmPasswordIdentities({
      projectId: IMPORTING_PROJECT,
      emails: ['Ada@Example.test'],
    });

    const sqlOf = (table: unknown) => queries.find((q) => q.table === table)!.where;
    expect(sqlOf(organizationProjects)).toContain('"organization_projects"."deleted_at" is null');
    expect(sqlOf(userAuthenticationMethods)).toContain(
      '"user_authentication_methods"."deleted_at" is null'
    );
    expect(sqlOf(userAuthenticationMethods)).toContain('"users"."deleted_at" is null');
    expect(sqlOf(userAuthenticationMethods)).toContain('lower(');
    expect(sqlOf(projectUsers)).toContain('"project_users"."deleted_at" is null');
    expect(sqlOf(organizationUsers)).toContain('"organization_users"."deleted_at" is null');
    // The soft-delete filter of the project link sits in the join, not the WHERE: a link that
    // was removed must read as "no organization", not drop the membership row.
    const projectJoin = queries.find((q) => q.table === projectUsers)!.joinOn;
    expect(projectJoin).toHaveLength(1);
    expect(projectJoin[0]).toContain('"organization_projects"."deleted_at" is null');
  });

  it('decides confinement from every membership of the user', async () => {
    const { db } = fakeDb(
      new Map<unknown, unknown[][]>([
        [organizationProjects, [[{ organizationId: ORG_A }]]],
        [
          userAuthenticationMethods,
          [
            [
              method('m-confined', 'u-confined', 'confined@example.test', {
                projectId: SIBLING_PROJECT,
                kind: 'user',
                externalKey: 'confined@example.test',
              }),
              method('m-foreign-project', 'u-foreign-project', 'fp@example.test'),
              method('m-foreign-org', 'u-foreign-org', 'fo@example.test'),
              method('m-none', 'u-none', 'none@example.test'),
              method('m-org-only', 'u-org-only', 'oo@example.test'),
              method('m-no-link', 'u-no-link', 'nl@example.test'),
              method('m-oauth', 'u-oauth', 'oauth@example.test'),
            ],
            // The users' GitHub and Google methods.
            [{ userId: 'u-oauth' }],
          ],
        ],
        [
          projectUsers,
          [
            [
              { userId: 'u-confined', projectId: SIBLING_PROJECT, organizationId: ORG_A },
              { userId: 'u-confined', projectId: IMPORTING_PROJECT, organizationId: ORG_A },
              { userId: 'u-foreign-project', projectId: SIBLING_PROJECT, organizationId: ORG_A },
              { userId: 'u-foreign-project', projectId: FOREIGN_PROJECT, organizationId: ORG_B },
              { userId: 'u-foreign-org', projectId: SIBLING_PROJECT, organizationId: ORG_A },
              { userId: 'u-no-link', projectId: SIBLING_PROJECT, organizationId: null },
              { userId: 'u-oauth', projectId: SIBLING_PROJECT, organizationId: ORG_A },
            ],
          ],
        ],
        [
          organizationUsers,
          [
            [
              { userId: 'u-foreign-org', organizationId: ORG_B },
              { userId: 'u-org-only', organizationId: ORG_A },
            ],
          ],
        ],
      ])
    );

    const identities = await new UserRepository(db as never).findCdmPasswordIdentities({
      projectId: IMPORTING_PROJECT,
      emails: ['confined@example.test'],
    });

    const confined = Object.fromEntries(
      identities.map((i) => [i.userId, i.confinedToImportingOrganization])
    );
    expect(confined).toEqual({
      'u-confined': true,
      'u-foreign-project': false,
      'u-foreign-org': false,
      'u-none': false,
      'u-org-only': true,
      'u-no-link': false,
      'u-oauth': true,
    });
    expect(Object.fromEntries(identities.map((i) => [i.userId, i.hasOAuthMethod]))).toMatchObject({
      'u-confined': false,
      'u-oauth': true,
    });
    expect(identities.find((i) => i.userId === 'u-confined')).toMatchObject({
      methodId: 'm-confined',
      providerId: 'confined@example.test',
      cdmImport: { projectId: SIBLING_PROJECT, kind: 'user', externalKey: 'confined@example.test' },
    });
    expect(identities.find((i) => i.userId === 'u-none')?.cdmImport).toBeNull();
  });

  it.each([
    ['no organization', []],
    ['two organizations', [{ organizationId: ORG_A }, { organizationId: ORG_B }]],
  ])(
    'confines nothing, and skips the membership reads, when the project has %s',
    async (_l, orgRows) => {
      const { db, queries } = fakeDb(
        new Map<unknown, unknown[][]>([
          [organizationProjects, [orgRows]],
          [userAuthenticationMethods, [[method('m1', 'u1', 'ada@example.test')]]],
        ])
      );

      const identities = await new UserRepository(db as never).findCdmPasswordIdentities({
        projectId: IMPORTING_PROJECT,
        emails: ['ada@example.test'],
      });

      expect(identities.map((i) => i.confinedToImportingOrganization)).toEqual([false]);
      // The methods and their OAuth methods are still read; project and organization
      // memberships are not.
      expect(queries.map((q) => q.table)).toEqual([
        organizationProjects,
        userAuthenticationMethods,
        userAuthenticationMethods,
      ]);
    }
  );
});
