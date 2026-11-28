'use client';

import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Permission } from '@grantjs/schema';

import { FieldInfoPopover, MetadataEditorCard } from '@/components/common';
import { useScopeFromParams } from '@/hooks/common';
import { usePermissionMutations } from '@/hooks/permissions';

interface PermissionMetadataCardProps {
  permission: Permission;
  onAfterPermissionMutation?: () => void | Promise<unknown>;
}

export function PermissionMetadataCard({
  permission,
  onAfterPermissionMutation,
}: PermissionMetadataCardProps) {
  const t = useTranslations('permission.info');
  const tForm = useTranslations('permissions.form');
  const scope = useScopeFromParams();
  const { updatePermission } = usePermissionMutations();
  const canUpdate = useGrant(ResourceSlug.Permission, ResourceAction.Update, {
    scope: scope!,
  });

  return (
    <MetadataEditorCard
      entityId={permission.id}
      metadata={permission.metadata}
      title={t('metadata')}
      description={t('metadataDescription')}
      titleAdornment={
        <FieldInfoPopover
          description={tForm('metadataInfo')}
          className="rounded-sm p-0.5"
          stopPropagation
        />
      }
      canEdit={canUpdate === true}
      onSave={async (metadata) => {
        if (!scope) return;
        await updatePermission(permission.id, { scope, metadata });
        await onAfterPermissionMutation?.();
      }}
    />
  );
}
