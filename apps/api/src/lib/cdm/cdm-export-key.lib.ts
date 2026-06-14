import { CDM_IMPORT_METADATA_KEY } from '@/constants/cdm-import.constants';

import type { CdmExternalKeyKind } from './identity.lib';
import { buildExternalKey } from './identity.lib';

export function resolveCdmExportExternalKey(
  kind: CdmExternalKeyKind,
  grantId: string,
  displayName: string,
  metadata: Record<string, unknown>,
  ...hashInputs: string[]
): string {
  const cdmImport = metadata[CDM_IMPORT_METADATA_KEY];
  if (cdmImport != null && typeof cdmImport === 'object' && !Array.isArray(cdmImport)) {
    const externalKey = (cdmImport as { externalKey?: string }).externalKey?.trim();
    if (externalKey && externalKey.length > 0) {
      return externalKey;
    }
  }
  return buildExternalKey(kind, grantId, displayName, ...hashInputs);
}
