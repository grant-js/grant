import { CDM_IMPORT_METADATA_KEY } from '@/constants/cdm-import.constants';

/**
 * Legacy auto-generated per-user role keys from older CDM imports.
 * New documents must use `users.permissions` instead.
 */
export function isSyntheticCdmRoleKey(key: string): boolean {
  return key.startsWith('synthetic:role:user:') && key.endsWith(':direct');
}

export function isSyntheticCdmRoleMetadata(
  metadata: Record<string, unknown> | null | undefined
): boolean {
  if (metadata == null) return false;
  const cdmImport = metadata[CDM_IMPORT_METADATA_KEY];
  if (cdmImport != null && typeof cdmImport === 'object' && !Array.isArray(cdmImport)) {
    const externalKey = (cdmImport as { externalKey?: string }).externalKey;
    if (typeof externalKey === 'string' && isSyntheticCdmRoleKey(externalKey)) {
      return true;
    }
  }
  if (metadata.synthetic === true) {
    return true;
  }
  return false;
}
