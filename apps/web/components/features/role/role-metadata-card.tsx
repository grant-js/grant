'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Role } from '@grantjs/schema';

import { FeatureModuleCard, FieldInfoPopover, JsonEditor } from '@/components/common';
import { Button } from '@/components/ui/button';
import { useScopeFromParams } from '@/hooks/common';
import { useRoleMutations } from '@/hooks/roles';
import { getDocsUrl } from '@/lib/constants';

interface RoleMetadataCardProps {
  role: Role;
  onAfterRoleMutation?: () => void | Promise<unknown>;
}

export function RoleMetadataCard({ role, onAfterRoleMutation }: RoleMetadataCardProps) {
  const t = useTranslations('role.info');
  const tRoles = useTranslations('roles.form');
  const tCommon = useTranslations('common');
  const scope = useScopeFromParams();
  const { updateRole } = useRoleMutations();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canUpdate = useGrant(ResourceSlug.Role, ResourceAction.Update, {
    scope: scope!,
  });

  const metadataValue =
    role.metadata != null && typeof role.metadata === 'object' && !Array.isArray(role.metadata)
      ? role.metadata
      : {};

  const [metadataDraft, setMetadataDraft] = useState<object>(metadataValue);

  useEffect(() => {
    setMetadataDraft(metadataValue);
  }, [role.id, role.metadata]);

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
      await updateRole(role.id, {
        scope,
        metadata: metadataDraft as Record<string, unknown>,
      });
      await onAfterRoleMutation?.();
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
          description={tRoles('metadataInfo')}
          link={{
            href: `${getDocsUrl()}/core-concepts/permission-conditions.html#field-paths`,
            label: tRoles('metadataDocsLink'),
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
