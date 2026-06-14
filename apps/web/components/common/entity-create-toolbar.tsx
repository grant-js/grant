'use client';

import { useTranslations } from 'next-intl';

import { Toolbar } from '@/components/common/toolbar';
import { Button } from '@/components/ui/button';

export interface EntityCreateToolbarProps {
  formId: string;
  isSubmitting: boolean;
  onCancel: () => void;
  /** i18n namespace for createDialog.confirm / createDialog.submitting (e.g. "roles", "projectApps"). */
  labelsNamespace: string;
}

export function EntityCreateToolbar({
  formId,
  isSubmitting,
  onCancel,
  labelsNamespace,
}: EntityCreateToolbarProps) {
  const tCommon = useTranslations('common');
  const tLabels = useTranslations(labelsNamespace);

  return (
    <Toolbar
      alwaysRow
      items={[
        <Button
          key="cancel"
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="w-full sm:w-auto"
        >
          {tCommon('actions.cancel')}
        </Button>,
        <Button
          key="submit"
          type="submit"
          form={formId}
          disabled={isSubmitting}
          className="w-full sm:w-auto"
        >
          {isSubmitting ? tLabels('createDialog.submitting') : tLabels('createDialog.confirm')}
        </Button>,
      ]}
    />
  );
}
