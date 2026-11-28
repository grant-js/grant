'use client';

import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Group } from '@grantjs/schema';

import { FieldInfoPopover, MetadataEditorCard } from '@/components/common';
import { useScopeFromParams } from '@/hooks/common';
import { useGroupMutations } from '@/hooks/groups';
import { getDocsUrl } from '@/lib/constants';

interface GroupMetadataCardProps {
  group: Group;
  onAfterGroupMutation?: () => void | Promise<unknown>;
}

export function GroupMetadataCard({ group, onAfterGroupMutation }: GroupMetadataCardProps) {
  const t = useTranslations('group.info');
  const tForm = useTranslations('groups.form');
  const scope = useScopeFromParams();
  const { updateGroup } = useGroupMutations();
  const canUpdate = useGrant(ResourceSlug.Group, ResourceAction.Update, {
    scope: scope!,
  });

  return (
    <MetadataEditorCard
      entityId={group.id}
      metadata={group.metadata}
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
        await updateGroup({ id: group.id, input: { scope, metadata } });
        await onAfterGroupMutation?.();
      }}
    />
  );
}
