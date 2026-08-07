import { Tenant } from '@grantjs/schema';
import { describe, expect, it } from 'vitest';

import { CDM_IMPORT_METADATA_KEY } from '@/constants/cdm-import.constants';
import {
  isParentProjectScopeForPivotWrites,
  isProjectScopedUserMetadataTenant,
  isUnsupportedProjectUserMutationLeafTenant,
  mergeEffectiveUserMetadataForProject,
  mergeEffectiveUserProfileForProject,
  mergeProjectUserMetadataApplyUpdate,
} from '@/lib/effective-project-user-metadata.lib';
import { tryProjectIdFromScope } from '@/lib/scope.lib';

describe('mergeEffectiveUserMetadataForProject', () => {
  it('overrides global keys with pivot', () => {
    expect(
      mergeEffectiveUserMetadataForProject(
        { a: 1, b: 2 } as Record<string, unknown>,
        { b: 3, c: 4 } as Record<string, unknown>
      )
    ).toEqual({ a: 1, b: 3, c: 4 });
  });
});

describe('mergeProjectUserMetadataApplyUpdate', () => {
  it('rejects top-level cdmImport in incoming', () => {
    expect(() =>
      mergeProjectUserMetadataApplyUpdate({}, {
        [CDM_IMPORT_METADATA_KEY]: { projectId: 'p1', kind: 'group' },
      } as Record<string, unknown>)
    ).toThrow();
  });

  it('preserves existing cdmImport when merging', () => {
    const prev = { [CDM_IMPORT_METADATA_KEY]: { projectId: 'p', kind: 'group' }, x: 1 };
    const merged = mergeProjectUserMetadataApplyUpdate(
      prev as Record<string, unknown>,
      {
        y: 2,
      } as Record<string, unknown>
    );
    expect(merged[CDM_IMPORT_METADATA_KEY]).toEqual(prev[CDM_IMPORT_METADATA_KEY]);
    expect(merged.y).toBe(2);
  });
});

describe('isProjectScopedUserMetadataTenant', () => {
  it('matches project tenants', () => {
    expect(isProjectScopedUserMetadataTenant(Tenant.AccountProject)).toBe(true);
    expect(isProjectScopedUserMetadataTenant(Tenant.Organization)).toBe(false);
  });
});

describe('mergeEffectiveUserProfileForProject', () => {
  it('uses pivot when set', () => {
    const r = mergeEffectiveUserProfileForProject(
      'Global',
      'https://g.example/a.png',
      'Local',
      null
    );
    expect(r.name).toBe('Local');
    expect(r.pictureUrl).toBe('https://g.example/a.png');
  });

  it('falls back to global when pivot null', () => {
    const r = mergeEffectiveUserProfileForProject('Global', null, null, null);
    expect(r.name).toBe('Global');
    expect(r.pictureUrl).toBeNull();
  });
});

describe('isParentProjectScopeForPivotWrites', () => {
  it('is true only for project parent tenants', () => {
    expect(isParentProjectScopeForPivotWrites(Tenant.AccountProject)).toBe(true);
    expect(isParentProjectScopeForPivotWrites(Tenant.OrganizationProject)).toBe(true);
    expect(isParentProjectScopeForPivotWrites(Tenant.AccountProjectUser)).toBe(false);
  });
});

describe('isUnsupportedProjectUserMutationLeafTenant', () => {
  it('identifies leaf project-user tenants', () => {
    expect(isUnsupportedProjectUserMutationLeafTenant(Tenant.AccountProjectUser)).toBe(true);
    expect(isUnsupportedProjectUserMutationLeafTenant(Tenant.OrganizationProjectUser)).toBe(true);
    expect(isUnsupportedProjectUserMutationLeafTenant(Tenant.AccountProject)).toBe(false);
  });
});

describe('tryProjectIdFromScope', () => {
  it('extracts project id from composite scope', () => {
    expect(
      tryProjectIdFromScope({
        tenant: Tenant.AccountProject,
        id: 'acc-1:proj-2',
      })
    ).toBe('proj-2');
  });

  it('returns null for organization tenant', () => {
    expect(
      tryProjectIdFromScope({
        tenant: Tenant.Organization,
        id: 'org-1',
      })
    ).toBeNull();
  });
});
