import { describe, expect, it } from 'vitest';

import {
  buildCdmImportMetadata,
  CDM_SOURCE_METADATA_KEY,
  mergeCdmImporterMetadata,
} from '@/constants/cdm-import.constants';
import {
  buildSearchDocument,
  CDM_SEARCHABLE_METADATA_KEY,
  mergeImporterMetadataWithSearchable,
} from '@/lib/search-document.lib';

describe('buildSearchDocument', () => {
  it('includes explicit searchable email and native name', () => {
    const doc = buildSearchDocument({
      kind: 'user',
      name: 'Benhur',
      searchable: {
        email: 'ben+cs@alteos.com',
        legacyId: '423342f1-9fda-4753-9041-b537c2a62e4c',
      },
    });
    expect(doc).toContain('benhur');
    expect(doc).toContain('ben+cs@alteos.com');
    expect(doc).toContain('423342f1-9fda-4753-9041-b537c2a62e4c');
  });

  it('includes displayName and global user name for project users', () => {
    const doc = buildSearchDocument({
      kind: 'user',
      name: 'Pivot Name',
      displayName: 'Display Override',
      globalUserName: 'Global Name',
    });
    expect(doc).toContain('pivot name');
    expect(doc).toContain('display override');
    expect(doc).toContain('global name');
  });

  it('extracts allowlisted metadata paths when searchable is absent', () => {
    const metadata = mergeCdmImporterMetadata(
      buildCdmImportMetadata('project-1', 'user', 'legacy-id'),
      {
        legacy: {
          email: 'agent@alteos.com',
          id: 'legacy-id',
          passwordHash: 'should-not-index',
        },
        agent: { name: 'Agent One' },
      }
    );
    const doc = buildSearchDocument({
      kind: 'user',
      name: 'User',
      metadata,
    });
    expect(doc).toContain('agent@alteos.com');
    expect(doc).toContain('agent one');
    expect(doc).not.toContain('should-not-index');
    expect(doc).not.toContain('$2a$');
  });

  it('includes role and group legacy metadata', () => {
    const metadata = mergeCdmImporterMetadata(buildCdmImportMetadata('p', 'group', 'g1'), {
      legacy: { id: 'g1', inferredRole: 'partnerAdmin', partnerId: 'partner-1' },
    });
    const doc = buildSearchDocument({
      kind: 'group',
      name: 'Partner Admin Group',
      description: 'Legacy group',
      metadata,
    });
    expect(doc).toContain('partner admin group');
    expect(doc).toContain('g1');
    expect(doc).toContain('partneradmin');
  });

  it('dedupes repeated tokens', () => {
    const doc = buildSearchDocument({
      kind: 'user',
      name: 'Benhur',
      searchable: { displayLabel: 'Benhur' },
    });
    const parts = doc.split(' ');
    expect(parts.filter((p) => p === 'benhur')).toHaveLength(1);
  });
});

describe('mergeImporterMetadataWithSearchable', () => {
  it('merges searchable into importer metadata payload', () => {
    const merged = mergeImporterMetadataWithSearchable(
      { legacy: { email: 'a@b.com' } },
      { email: 'a@b.com', legacyId: '1' }
    );
    expect(merged?.[CDM_SEARCHABLE_METADATA_KEY]).toEqual({
      email: 'a@b.com',
      legacyId: '1',
    });
  });

  it('returns metadata unchanged when searchable is empty', () => {
    const metadata = { legacy: { id: '1' } };
    expect(mergeImporterMetadataWithSearchable(metadata, undefined)).toBe(metadata);
  });
});

describe('cdmSource searchable round-trip path', () => {
  it('reads searchable nested under cdmSource via allowlist', () => {
    const metadata = {
      cdmImport: { projectId: 'p', kind: 'user', externalKey: 'k' },
      [CDM_SOURCE_METADATA_KEY]: {
        [CDM_SEARCHABLE_METADATA_KEY]: { email: 'nested@alteos.com' },
      },
    };
    const doc = buildSearchDocument({ kind: 'user', name: 'U', metadata });
    expect(doc).toContain('nested@alteos.com');
  });
});
