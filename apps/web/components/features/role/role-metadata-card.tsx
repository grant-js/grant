'use client';

import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Role } from '@grantjs/schema';

import { FieldInfoPopover, MetadataEditorCard } from '@/components/common';
import { useScopeFromParams } from '@/hooks/common';
import { useRoleMutations } from '@/hooks/roles';
import { getDocsUrl } from '@/lib/constants';

interface RoleMetadataCardProps {
  role: Role;
  onAfterRoleMutation?: () => void | Promise<unknown>;
}

export function RoleMetadataCard({ role, onAfterRoleMutation }: RoleMetadataCardProps) {
  const t = useTranslations('role.info');
  const tForm = useTranslations('roles.form');
  const scope = useScopeFromParams();
  const { updateRole } = useRoleMutations();
  const canUpdate = useGrant(ResourceSlug.Role, ResourceAction.Update, {
    scope: scope!,
  });

  return (
    <MetadataEditorCard
      entityId={role.id}
      metadata={role.metadata}
      title={t('metadata')}
      description={t('metadataDescription')}
      titleAdornment={
        <FieldInfoPopover
          description={tForm('metadataInfo')}
          link={{
            href: `${getDocsUrl()}/core-concepts/permission-conditions.html#field-paths`,
            label: tForm('metadataDocsLink'),
          }}
          className="rounded-sm p-0.5"
          stopPropagation
        />
      }
      canEdit={canUpdate === true}
      onSave={async (metadata) => {
        if (!scope) return;
        await updateRole(role.id, { scope, metadata });
        await onAfterRoleMutation?.();
      }}
    />
  );
}
