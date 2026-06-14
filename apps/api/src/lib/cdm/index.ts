export type { CdmRoleWithGroupNaming } from './cdm-entity-builder';
export { CdmEntityBuilder } from './cdm-entity-builder';
export { assembleExportedSyncProjectInput } from './cdm-export-assemble.lib';
export {
  addPermissionRefDeduped,
  canonicalPermissionDocumentString,
  parseCdmPermissionDocumentString,
  serializePermissionRefForCdmDocument,
} from './cdm-permission-document-ref.lib';
export { isSyntheticCdmRoleKey, isSyntheticCdmRoleMetadata } from './cdm-synthetic.lib';
export { PermissionCdmEntity } from './entities/permission.cdm-entity';
export { ProjectUserApiKeyCdmEntity } from './entities/project-user-api-key.cdm-entity';
export { ResourceCdmEntity } from './entities/resource.cdm-entity';
export { RoleTemplateCdmEntity } from './entities/role-template.cdm-entity';
export { TagCdmEntity } from './entities/tag.cdm-entity';
export { UserAssignmentCdmEntity } from './entities/user-assignment.cdm-entity';
export { UserProvisionCdmEntity } from './entities/user-provision.cdm-entity';
export type { ExpandedCdmSyncPayload } from './expand-cdm-sync-input.lib';
export { expandCdmSyncInput } from './expand-cdm-sync-input.lib';
export type { CdmExternalKeyKind } from './identity.lib';
export { buildExternalKey, stableHash } from './identity.lib';
export {
  isPermissionKeyOnlyRef,
  refDedupKey,
  resolveAllPermissionRefs,
  resolveSinglePermissionRef,
} from './permission-ref.lib';
export type { CdmEntityRegistryDeps } from './registry';
export { createDefaultCdmEntities } from './registry';
