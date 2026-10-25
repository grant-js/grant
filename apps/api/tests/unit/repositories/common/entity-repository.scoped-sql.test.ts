import { permissions, projects, roles, schema, users } from '@grantjs/database';
import { Tenant } from '@grantjs/schema';
import { and, isNull, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { afterAll, describe, expect, it } from 'vitest';

import { requireAccessibleIdSource } from '@/repositories/common/scoped-id-source';

/**
 * Drizzle's relational `findMany({ where })` remaps every Column in the SQL to
 * the outer entity alias. That turns a correct pivot subquery into
 * `SELECT roles.role_id FROM organization_roles` — a column that does not exist.
 * `select().where()` does not rewrite aliases. EntityRepository must page
 * scoped lists through `select()` for this reason.
 */
const client = postgres('postgres://127.0.0.1:1/dummy');
const db = drizzle(client, { schema });
const org = { tenant: Tenant.Organization, id: '11111111-1111-4111-8111-111111111111' };

afterAll(async () => {
  await client.end({ timeout: 0 });
});

function whereFor(
  table: { id: unknown; deletedAt: unknown },
  kind: Parameters<typeof requireAccessibleIdSource>[0]
) {
  const source = requireAccessibleIdSource(kind, org);
  if (source === 'empty') {
    throw new Error(`expected sql source for ${kind}`);
  }
  return and(sql`${table.id} IN ${source}`, isNull(table.deletedAt as never));
}

describe('relational findMany remaps pivot columns onto the entity table', () => {
  it.each([
    ['roles', roles, 'roles', '"roles"."role_id"', '"organization_roles"."role_id"'],
    [
      'permissions',
      permissions,
      'permissions',
      '"permissions"."permission_id"',
      '"organization_permissions"."permission_id"',
    ],
    [
      'projects',
      projects,
      'projects',
      '"projects"."project_id"',
      '"organization_projects"."project_id"',
    ],
    ['users', users, 'users', '"users"."user_id"', '"organization_users"."user_id"'],
  ] as const)(
    '%s findMany rewrites the pivot column; select() does not',
    (name, table, kind, rewritten, intact) => {
      const where = whereFor(table, kind);
      const findManySql = (
        db.query as never as Record<
          string,
          { findMany: (c: unknown) => { toSQL: () => { sql: string } } }
        >
      )[name]
        .findMany({ where, limit: 50 })
        .toSQL().sql;
      const selectSql = db.select().from(table).where(where).toSQL().sql;

      expect(findManySql).toContain(rewritten);
      expect(findManySql).not.toContain(intact);
      expect(selectSql).toContain(intact);
      expect(selectSql).not.toContain(rewritten);
    }
  );
});
