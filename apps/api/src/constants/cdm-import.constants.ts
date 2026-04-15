/** Metadata key for roles/groups created by project CDM permission sync. */
export const CDM_IMPORT_METADATA_KEY = 'cdmImport' as const;

export type CdmImportMetadata = {
  projectId: string;
  kind: 'role' | 'group' | 'directRole';
  externalKey?: string;
};

export function buildCdmImportMetadata(
  projectId: string,
  kind: CdmImportMetadata['kind'],
  externalKey?: string
): Record<string, unknown> {
  const payload: CdmImportMetadata = externalKey
    ? { projectId, kind, externalKey }
    : { projectId, kind };
  return { [CDM_IMPORT_METADATA_KEY]: payload };
}
