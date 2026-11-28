'use client';

import { useTranslations } from 'next-intl';

import { ChipPopover } from '@/components/common/chip-popover';
import { CopyToClipboard } from '@/components/common/copy-to-clipboard';

interface PermissionConditionChipProps {
  /** The permission's condition, as the list query returns it. */
  condition: unknown;
}

/** A condition is set when it is anything but null or an empty object. */
function hasPermissionCondition(condition: unknown): boolean {
  if (condition === null || condition === undefined) return false;
  if (typeof condition === 'object' && !Array.isArray(condition)) {
    return Object.keys(condition).length > 0;
  }
  return true;
}

/**
 * "Has condition" or "No condition" in a permission list. With a condition, it opens like the
 * relationship count chips and shows the condition as read-only JSON to scroll and copy; it is
 * edited on the permission's own page.
 */
export function PermissionConditionChip({ condition }: PermissionConditionChipProps) {
  const t = useTranslations('permissions.conditionChip');
  const hasCondition = hasPermissionCondition(condition);
  const json = hasCondition ? JSON.stringify(condition, null, 2) : '';

  return (
    <ChipPopover
      label={hasCondition ? t('has') : t('none')}
      hasContent={hasCondition}
      contentClassName="w-96 max-w-[calc(100vw-2rem)]"
    >
      <div className="flex items-center justify-between gap-2 px-1 pb-1">
        <span className="text-sm font-medium">{t('title')}</span>
        <CopyToClipboard text={json} />
      </div>
      <pre
        className="max-h-72 overflow-auto rounded bg-muted p-2 font-mono text-xs select-text"
        data-testid="permission-condition-json"
      >
        {json}
      </pre>
    </ChipPopover>
  );
}
