import { describe, expect, it } from 'vitest';

import { toScopeSlugOptions } from './project-app-scope-slugs';

function permission(id: string, resourceSlug: string | null, action: string, name = id) {
  return {
    id,
    name,
    description: null,
    action,
    resource: resourceSlug ? { slug: resourceSlug } : null,
  };
}

describe('toScopeSlugOptions', () => {
  it('gives each resource:action slug its permission id when one permission has it', () => {
    expect(
      toScopeSlugOptions([permission('p-1', 'invoice', 'approve', 'Approve invoices')])
    ).toEqual([
      {
        slug: 'invoice:approve',
        name: 'Approve invoices',
        description: null,
        permissionId: 'p-1',
      },
    ]);
  });

  it('keeps one option, with no permission id, when several permissions share a slug', () => {
    const options = toScopeSlugOptions([
      permission('p-1', 'invoice', 'read', 'Read own invoices'),
      permission('p-2', 'invoice', 'read', 'Read all invoices'),
      permission('p-3', 'invoice', 'approve'),
    ]);

    expect(options.map(({ slug, name, permissionId }) => ({ slug, name, permissionId }))).toEqual([
      { slug: 'invoice:read', name: 'Read own invoices', permissionId: null },
      { slug: 'invoice:approve', name: 'p-3', permissionId: 'p-3' },
    ]);
  });

  it('skips permissions without a resource or a name', () => {
    expect(
      toScopeSlugOptions([
        null,
        permission('p-1', null, 'read'),
        permission('p-2', 'invoice', 'read', ''),
      ])
    ).toEqual([]);
  });
});
