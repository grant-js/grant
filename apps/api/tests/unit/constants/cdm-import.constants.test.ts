import { describe, expect, it } from 'vitest';

import {
  buildCdmImportMetadata,
  CDM_API_KEY_SECRET_FINGERPRINT_KEY,
  CDM_EXPORT_CATALOG_SNAPSHOT_KEY,
  CDM_IMPORT_METADATA_KEY,
  CDM_SOURCE_METADATA_KEY,
  extractProjectUserMetadataForCdmExport,
  isCdmCatalogSnapshotMetadata,
  isProjectCdmImportKind,
  mergeCdmImporterMetadata,
  readGrantPermissionIdFromCdmExportMetadata,
  readGrantResourceIdFromCdmExportMetadata,
} from '@/constants/cdm-import.constants';
import { ValidationError } from '@/lib/errors';

describe('cdmImport metadata', () => {
  it('builds role payload with externalKey', () => {
    expect(buildCdmImportMetadata('proj-1', 'role', 'admin')).toEqual({
      [CDM_IMPORT_METADATA_KEY]: {
        projectId: 'proj-1',
        kind: 'role',
        externalKey: 'admin',
      },
    });
  });

  it('builds group payload without externalKey', () => {
    expect(buildCdmImportMetadata('proj-1', 'group')).toEqual({
      [CDM_IMPORT_METADATA_KEY]: {
        projectId: 'proj-1',
        kind: 'group',
      },
    });
  });
});

describe('mergeCdmImporterMetadata', () => {
  it('merges importer fields under cdmSource without touching cdmImport', () => {
    const base = buildCdmImportMetadata('p1', 'role', 'admin');
    const merged = mergeCdmImporterMetadata(base, { legacyId: '99' });
    expect(merged[CDM_IMPORT_METADATA_KEY]).toEqual({
      projectId: 'p1',
      kind: 'role',
      externalKey: 'admin',
    });
    expect(merged[CDM_SOURCE_METADATA_KEY]).toEqual({ legacyId: '99' });
  });

  it('shallow-merges into existing cdmSource', () => {
    const base = {
      ...buildCdmImportMetadata('p1', 'group', 'g1'),
      [CDM_SOURCE_METADATA_KEY]: { a: 1 },
    };
    const merged = mergeCdmImporterMetadata(base, { b: 2 });
    expect(merged[CDM_SOURCE_METADATA_KEY]).toEqual({ a: 1, b: 2 });
  });

  it('rejects reserved cdmImport in importer payload', () => {
    expect(() =>
      mergeCdmImporterMetadata(buildCdmImportMetadata('p1', 'role'), {
        [CDM_IMPORT_METADATA_KEY]: { x: 1 },
      })
    ).toThrow(ValidationError);
  });

  it('rejects a CDM-supplied secret fingerprint', () => {
    expect(() =>
      mergeCdmImporterMetadata(buildCdmImportMetadata('p1', 'projectUserApiKey', 'k1'), {
        [CDM_API_KEY_SECRET_FINGERPRINT_KEY]: 'abc',
      })
    ).toThrow(/secretFingerprint/);
  });

  it('rejects non-object importer payload', () => {
    expect(() => mergeCdmImporterMetadata({}, [])).toThrow(ValidationError);
  });
});

describe('extractProjectUserMetadataForCdmExport', () => {
  it('returns null when metadata is empty', () => {
    expect(extractProjectUserMetadataForCdmExport({})).toBeNull();
  });

  it('exports flat keys from cdmSource (minus nested cdmImport)', () => {
    const md = mergeCdmImporterMetadata(buildCdmImportMetadata('p1', 'role'), {
      legacyId: '99',
    });
    expect(extractProjectUserMetadataForCdmExport(md)).toEqual({ legacyId: '99' });
  });

  it('never exports a secret fingerprint from cdmImport or cdmSource', () => {
    const md = {
      [CDM_IMPORT_METADATA_KEY]: {
        projectId: 'p1',
        kind: 'projectUserApiKey',
        externalKey: 'k1',
        [CDM_API_KEY_SECRET_FINGERPRINT_KEY]: 'should-not-export',
      },
      [CDM_SOURCE_METADATA_KEY]: {
        legacyId: '99',
        [CDM_API_KEY_SECRET_FINGERPRINT_KEY]: 'also-no',
      },
    };
    expect(extractProjectUserMetadataForCdmExport(md)).toEqual({ legacyId: '99' });
    expect(JSON.stringify(extractProjectUserMetadataForCdmExport(md))).not.toContain(
      'should-not-export'
    );
  });

  it('includes top-level metadata keys outside cdmSource (e.g. API updates)', () => {
    const md = {
      ...buildCdmImportMetadata('p1', 'role'),
      customFromApi: 'visible',
    };
    expect(extractProjectUserMetadataForCdmExport(md)).toEqual({ customFromApi: 'visible' });
  });

  it('merges cdmSource keys with top-level; top-level wins on collision', () => {
    const md = {
      ...buildCdmImportMetadata('p1', 'role'),
      [CDM_SOURCE_METADATA_KEY]: { sameKey: 'fromSource', onlySource: 1 },
      sameKey: 'fromTop',
      onlyTop: 2,
    };
    expect(extractProjectUserMetadataForCdmExport(md)).toEqual({
      sameKey: 'fromTop',
      onlySource: 1,
      onlyTop: 2,
    });
  });
});

describe('CDM catalog snapshot metadata helpers', () => {
  it('isProjectCdmImportKind matches project + kind', () => {
    const md = {
      [CDM_IMPORT_METADATA_KEY]: { projectId: 'p1', kind: 'resource' },
    };
    expect(isProjectCdmImportKind(md, 'p1', 'resource')).toBe(true);
    expect(isProjectCdmImportKind(md, 'p2', 'resource')).toBe(false);
    expect(isProjectCdmImportKind(md, 'p1', 'permission')).toBe(false);
  });

  it('isCdmCatalogSnapshotMetadata reads top-level and cdmSource', () => {
    expect(isCdmCatalogSnapshotMetadata({ [CDM_EXPORT_CATALOG_SNAPSHOT_KEY]: true })).toBe(true);
    expect(
      isCdmCatalogSnapshotMetadata({
        [CDM_SOURCE_METADATA_KEY]: { [CDM_EXPORT_CATALOG_SNAPSHOT_KEY]: true },
      })
    ).toBe(true);
    expect(isCdmCatalogSnapshotMetadata({})).toBe(false);
  });

  it('readGrant*Id reads top-level then cdmSource', () => {
    expect(readGrantResourceIdFromCdmExportMetadata({ grantResourceId: 'r1' })).toBe('r1');
    expect(
      readGrantResourceIdFromCdmExportMetadata({
        [CDM_SOURCE_METADATA_KEY]: { grantResourceId: 'r2' },
      })
    ).toBe('r2');
    expect(readGrantPermissionIdFromCdmExportMetadata({ grantPermissionId: 'p1' })).toBe('p1');
  });
});
