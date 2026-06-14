'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Permission } from '@grantjs/schema';

import { FeatureModuleCard, FieldInfoPopover, JsonEditor } from '@/components/common';
import { Button } from '@/components/ui/button';
import { useScopeFromParams } from '@/hooks/common';
import { usePermissionMutations } from '@/hooks/permissions';
import { getDocsUrl } from '@/lib/constants';

interface PermissionConditionCardProps {
  permission: Permission;
  onAfterPermissionMutation?: () => void | Promise<unknown>;
}

export function PermissionConditionCard({
  permission,
  onAfterPermissionMutation,
}: PermissionConditionCardProps) {
  const t = useTranslations('permission.info');
  const tPermissionsForm = useTranslations('permissions.form');
  const tCommon = useTranslations('common');
  const scope = useScopeFromParams();
  const { updatePermission } = usePermissionMutations();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canUpdate = useGrant(ResourceSlug.Permission, ResourceAction.Update, {
    scope: scope!,
  });

  const conditionValue =
    permission.condition != null &&
    typeof permission.condition === 'object' &&
    !Array.isArray(permission.condition)
      ? permission.condition
      : {};

  const [conditionDraft, setConditionDraft] = useState<object>(conditionValue);

  useEffect(() => {
    setConditionDraft(conditionValue);
  }, [permission.id, permission.condition]);

  const isConditionDraftValid =
    conditionDraft &&
    typeof conditionDraft === 'object' &&
    !Array.isArray(conditionDraft) &&
    !('__invalidJson' in conditionDraft);
  const isConditionUnchanged = JSON.stringify(conditionValue) === JSON.stringify(conditionDraft);

  const handleReset = () => setConditionDraft(conditionValue);

  const handleSave = async () => {
    if (!scope || !isConditionDraftValid) return;
    setIsSubmitting(true);
    try {
      await updatePermission(permission.id, {
        scope,
        condition: conditionDraft as Record<string, unknown>,
      });
      await onAfterPermissionMutation?.();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FeatureModuleCard
      title={t('condition')}
      description={t('conditionDescription')}
      collapsible
      titleAdornment={
        <FieldInfoPopover
          description={t('conditionInfo')}
          link={{
            href: `${getDocsUrl()}/core-concepts/permission-conditions.html`,
            label: tPermissionsForm('conditionDocsLink'),
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
              disabled={isConditionUnchanged || isSubmitting}
            >
              {tCommon('actions.cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSubmitting || !isConditionDraftValid || isConditionUnchanged}
            >
              {isSubmitting ? tCommon('actions.saving') : tCommon('actions.save')}
            </Button>
          </div>
        ) : undefined
      }
    >
      <JsonEditor
        value={conditionDraft}
        onChange={(value) => setConditionDraft(value ?? {})}
        disabled={!canUpdate}
        className="min-h-[160px]"
      />
    </FeatureModuleCard>
  );
}
