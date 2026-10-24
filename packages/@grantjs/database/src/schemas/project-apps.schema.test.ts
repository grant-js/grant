/**
 * Project-app RLS (H2): the same app.current_project_id policy sibling pivots carry.
 * Behavior on a live database is covered by API e2e; this file locks the schema.
 */
import { PgDialect } from 'drizzle-orm/pg-core';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';

import { projectAppAuditLogs, projectApps } from './project-apps.schema';
import {
  projectOAuthConnectionAuditLogs,
  projectOAuthConnections,
} from './project-oauth-connections.schema';
import { projectResources } from './project-resources.schema';

const dialect = new PgDialect();

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

describe('project_apps row level security', () => {
  it('puts the sibling project policy on project_apps, identical in every part', () => {
    expect(renderedPolicies(projectApps)).toEqual(renderedPolicies(projectResources));
  });

  it('puts the same policy on project_oauth_connections', () => {
    expect(renderedPolicies(projectOAuthConnections)).toEqual(renderedPolicies(projectResources));
  });

  it('is restrictive on select, keyed on app.current_project_id, with a permissive allow-all', () => {
    const [isolation, allow] = renderedPolicies(projectApps);
    expect(isolation).toMatchObject({
      name: 'tenant_isolation_policy',
      as: 'restrictive',
      for: 'select',
    });
    expect(isolation.using).toContain("current_setting('app.current_project_id', true)");
    expect(isolation.using).toContain('project_id =');
    expect(allow).toMatchObject({ name: 'tenant_rls_allow', as: 'permissive', for: 'all' });
  });

  it('puts no RLS on the audit tables', () => {
    for (const table of [projectAppAuditLogs, projectOAuthConnectionAuditLogs]) {
      expect(getTableConfig(table).policies).toEqual([]);
      expect(getTableConfig(table).enableRLS).toBeFalsy();
    }
  });
});
