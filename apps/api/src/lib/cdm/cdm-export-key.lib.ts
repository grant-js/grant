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

/** A role's name without the `CDM: ` prefix an import gives the roles it creates. */
export function stripCdmRolePrefix(name: string): string {
  return name.startsWith('CDM: ') ? name.slice('CDM: '.length) : name;
}

/**
 * The one export key of a role: `roles[].key` and every `users[].roles` entry use it, so a
 * re-import resolves each assignment. An imported role keeps the importer's key.
 */
export function cdmExportRoleKey(
  roleId: string,
  name: string,
  metadata: Record<string, unknown>
): string {
  return resolveCdmExportExternalKey('role', roleId, stripCdmRolePrefix(name), metadata);
}

/**
 * The one export key of a group: `groups[].key`, `roles[].groups` and `users[].groups` use it.
 * An imported group keeps the importer's key.
 */
export function cdmExportGroupKey(
  groupId: string,
  name: string,
  metadata: Record<string, unknown>
): string {
  return resolveCdmExportExternalKey('group', groupId, name, metadata);
}
