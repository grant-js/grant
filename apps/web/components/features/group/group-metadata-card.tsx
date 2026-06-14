'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Group } from '@grantjs/schema';

import { FeatureModuleCard, FieldInfoPopover, JsonEditor } from '@/components/common';
import { Button } from '@/components/ui/button';
import { useScopeFromParams } from '@/hooks/common';
import { useGroupMutations } from '@/hooks/groups';
import { getDocsUrl } from '@/lib/constants';

interface GroupMetadataCardProps {
  group: Group;
  onAfterGroupMutation?: () => void | Promise<unknown>;
}

export function GroupMetadataCard({ group, onAfterGroupMutation }: GroupMetadataCardProps) {
  const t = useTranslations('group.info');
  const tGroups = useTranslations('groups.form');
  const tCommon = useTranslations('common');
  const scope = useScopeFromParams();
  const { updateGroup } = useGroupMutations();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canUpdate = useGrant(ResourceSlug.Group, ResourceAction.Update, {
    scope: scope!,
  });

  const metadataValue =
    group.metadata != null && typeof group.metadata === 'object' && !Array.isArray(group.metadata)
      ? group.metadata
      : {};

  const [metadataDraft, setMetadataDraft] = useState<object>(metadataValue);

  useEffect(() => {
    setMetadataDraft(metadataValue);
  }, [group.id, group.metadata]);

  const isMetadataDraftValid =
    metadataDraft &&
    typeof metadataDraft === 'object' &&
    !Array.isArray(metadataDraft) &&
    !('__invalidJson' in metadataDraft);
  const isMetadataUnchanged = JSON.stringify(metadataValue) === JSON.stringify(metadataDraft);

  const handleReset = () => setMetadataDraft(metadataValue);

  const handleSave = async () => {
    if (!scope || !isMetadataDraftValid) return;
    setIsSubmitting(true);
    try {
      await updateGroup({
        id: group.id,
        input: {
          scope,
          metadata: metadataDraft as Record<string, unknown>,
        },
      });
      await onAfterGroupMutation?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FeatureModuleCard
      title={t('metadata')}
      description={t('metadataDescription')}
      collapsible
      titleAdornment={
        <FieldInfoPopover
          description={tGroups('metadataInfo')}
          link={{
            href: `${getDocsUrl()}/core-concepts/permission-conditions.html#field-paths`,
            label: tGroups('metadataDocsLink'),
          }}
          className="rounded-sm p-0.5"
          stopPropagation
        />
      }
      footer={
        canUpdate ? (
          <div className="flex justify-end gap-3 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={isMetadataUnchanged || isSubmitting}
            >
              {tCommon('actions.cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting || !isMetadataDraftValid || isMetadataUnchanged}
            >
              {isSubmitting ? tCommon('actions.saving') : tCommon('actions.save')}
            </Button>
          </div>
        ) : undefined
      }
    >
      <JsonEditor
        value={metadataDraft}
        onChange={(value) => setMetadataDraft(value ?? {})}
        disabled={!canUpdate}
        className="min-h-[160px]"
      />
    </FeatureModuleCard>
  );
}
