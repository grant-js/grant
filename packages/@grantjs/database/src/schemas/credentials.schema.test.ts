/**
 * Shape of the scoped credential tables (ADR 0011 § 2): what the migration will create,
 * checked against the sibling tables the ADR says they follow. The behaviour of the
 * indexes and the policy on a real database is covered by
 * `apps/api/tests/integration/credentials.postgres.integration.test.ts`.
 */
import { CREDENTIAL_SOURCES } from '@grantjs/core';
import { PgDialect } from 'drizzle-orm/pg-core';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';

import { projectUserApiKeys } from './project-user-api-keys.schema';
import {
  projectUserCredentialAuditLogs,
  projectUserCredentialLockouts,
  projectUserCredentials,
} from './project-user-credentials.schema';
import { projectUserGroups } from './project-user-groups.schema';
import {
  userCredentialAuditLogs,
  userCredentialLockouts,
  userCredentials,
} from './user-credentials.schema';

const dialect = new PgDialect();

function columnNames(table: Parameters<typeof getTableConfig>[0]): string[] {
  return getTableConfig(table)
    .columns.map((c) => c.name)
    .sort();
}

function renderedPolicies(table: Parameters<typeof getTableConfig>[0]) {
  return getTableConfig(table)
    .policies.map((p) => ({
      name: p.name,
      as: p.as,
      for: p.for,
      to: p.to,
      using: p.using ? dialect.sqlToQuery(p.using).sql : null,
      withCheck: p.withCheck ? dialect.sqlToQuery(p.withCheck).sql : null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function indexByName(table: Parameters<typeof getTableConfig>[0], name: string) {
  const found = getTableConfig(table).indexes.find((i) => i.config.name === name);
  if (!found) throw new Error(`index ${name} not found`);
  return found.config;
}

function checkSql(table: Parameters<typeof getTableConfig>[0], name: string): string {
  const found = getTableConfig(table).checks.find((c) => c.name === name);
  if (!found) throw new Error(`check ${name} not found`);
  return dialect.sqlToQuery(found.value).sql;
}

describe('credential table columns (ADR 0011 § 2)', () => {
  const expectedCredentialColumns = [
    'created_at',
    'deleted_at',
    'hash',
    'id',
    'last_used_at',
    'source',
    'updated_at',
    'user_id',
  ];

  it('platform credentials carry the ADR columns and nothing else', () => {
    expect(columnNames(userCredentials)).toEqual(expectedCredentialColumns);
  });

  it('project credentials are the same columns plus project_id', () => {
    expect(columnNames(projectUserCredentials)).toEqual(
      [...expectedCredentialColumns, 'project_id'].sort()
    );
  });

  it('has no email or other identifier column: the verifier takes a resolved user id', () => {
    for (const table of [
      userCredentials,
      projectUserCredentials,
      userCredentialLockouts,
      projectUserCredentialLockouts,
    ]) {
      const names = columnNames(table);
      expect(names.filter((n) => /email|identifier|username|login/.test(n))).toEqual([]);
    }
  });

  it('stores the hash as varchar(255)', () => {
    const hash = getTableConfig(userCredentials).columns.find((c) => c.name === 'hash');
    expect(hash?.getSQLType()).toBe('varchar(255)');
    expect(hash?.notNull).toBe(true);
  });

  it('restricts source to the ADR enum with a check constraint on both tables', () => {
    const expected = `("source" IN (${CREDENTIAL_SOURCES.map((s) => `'${s}'`).join(', ')}))`;
    expect(CREDENTIAL_SOURCES).toEqual([
      'register',
      'cdm-import',
      'reset',
      'change',
      'migrated',
      'migrated-import',
    ]);
    expect(checkSql(userCredentials, 'user_credentials_source_check')).toBe(expected);
    expect(checkSql(projectUserCredentials, 'project_user_credentials_source_check')).toBe(
      expected
    );
  });

  it('cascades from the user on both tables and from the project on the project table', () => {
    const userFk = (table: Parameters<typeof getTableConfig>[0]) =>
      getTableConfig(table)
        .foreignKeys.map((fk) => fk.reference())
        .filter((ref) => ref.columns.some((c) => c.name === 'user_id'));
    for (const table of [userCredentials, projectUserCredentials]) {
      const [ref] = userFk(table);
      expect(getTableConfig(table).foreignKeys[0].onDelete).toBe('cascade');
      expect(ref.foreignTable).toBeDefined();
    }
    const projectFk = getTableConfig(projectUserCredentials).foreignKeys.filter((fk) =>
      fk.reference().columns.some((c) => c.name === 'project_id')
    );
    expect(projectFk).toHaveLength(1);
    expect(projectFk[0].onDelete).toBe('cascade');
  });

  it('does not reference project_users.id, which is replaced when a member is re-added', () => {
    const referenced = getTableConfig(projectUserCredentials).foreignKeys.map(
      (fk) => getTableConfig(fk.reference().foreignTable).name
    );
    expect(referenced.sort()).toEqual(['projects', 'users']);
  });
});

describe('partial unique indexes (live rows only)', () => {
  it('allows one live platform credential per user', () => {
    const index = indexByName(userCredentials, 'user_credentials_user_id_unique');
    expect(index.unique).toBe(true);
    expect(index.columns.map((c) => (c as { name: string }).name)).toEqual(['user_id']);
    expect(dialect.sqlToQuery(index.where!).sql).toContain('"deleted_at" IS NULL');
  });

  it('allows one live project credential per (project, user)', () => {
    const index = indexByName(
      projectUserCredentials,
      'project_user_credentials_project_id_user_id_unique'
    );
    expect(index.unique).toBe(true);
    expect(index.columns.map((c) => (c as { name: string }).name)).toEqual([
      'project_id',
      'user_id',
    ]);
    expect(dialect.sqlToQuery(index.where!).sql).toContain('"deleted_at" IS NULL');
  });

  it('indexes deleted_at so the retention purge does not scan', () => {
    expect(indexByName(userCredentials, 'user_credentials_deleted_at_idx')).toBeDefined();
    expect(
      indexByName(projectUserCredentials, 'project_user_credentials_deleted_at_idx')
    ).toBeDefined();
  });
});

describe('row level security', () => {
  it('puts the sibling project policy on project_user_credentials, identical in every part', () => {
    const credentials = renderedPolicies(projectUserCredentials);
    expect(credentials).toHaveLength(2);
    expect(credentials).toEqual(renderedPolicies(projectUserApiKeys));
    expect(credentials).toEqual(renderedPolicies(projectUserGroups));
  });

  it('is restrictive on select, keyed on app.current_project_id, with a permissive allow-all', () => {
    const [isolation, allow] = renderedPolicies(projectUserCredentials);
    expect(isolation).toMatchObject({
      name: 'tenant_isolation_policy',
      as: 'restrictive',
      for: 'select',
    });
    expect(isolation.using).toContain("current_setting('app.current_project_id', true)");
    expect(isolation.using).toContain('project_id =');
    expect(allow).toMatchObject({ name: 'tenant_rls_allow', as: 'permissive', for: 'all' });
  });

  it('gives the project lockout table the same policy', () => {
    expect(renderedPolicies(projectUserCredentialLockouts)).toEqual(
      renderedPolicies(projectUserApiKeys)
    );
  });

  it('puts no RLS on the platform tables, like users and user_authentication_methods', () => {
    for (const table of [userCredentials, userCredentialAuditLogs, userCredentialLockouts]) {
      expect(getTableConfig(table).policies).toEqual([]);
      expect(getTableConfig(table).enableRLS).toBeFalsy();
    }
  });
});

describe('audit tables', () => {
  const sharedColumns = [
    'action',
    'created_at',
    'id',
    'metadata',
    'new_values',
    'old_values',
    'performed_by',
    'scope_id',
    'scope_tenant',
  ];

  it('never have a hash column; they keep the shape of the sibling audit tables', () => {
    expect(columnNames(userCredentialAuditLogs)).toEqual(
      [...sharedColumns, 'user_credential_id'].sort()
    );
    expect(columnNames(projectUserCredentialAuditLogs)).toEqual(
      [...sharedColumns, 'project_user_credential_id'].sort()
    );
  });
});
