'use client';

import { useTranslations } from 'next-intl';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import type { DetailAttachmentFilter } from '@/lib/detail-attachment-filter';

export interface DetailAttachmentFilterToggleProps {
  value: DetailAttachmentFilter;
  onChange: (value: DetailAttachmentFilter) => void;
}

const joinedItemClassName =
  'h-9 min-w-17 px-3 rounded-none shadow-none first:rounded-l-md last:rounded-r-md not-first:border-l-0 data-[state=on]:bg-muted data-[state=on]:text-foreground data-[state=on]:shadow-none';

export function DetailAttachmentFilterToggle({
  value,
  onChange,
}: DetailAttachmentFilterToggleProps) {
  const t = useTranslations('common.detailAttachmentFilter');

  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(next) => {
        if (next) {
          onChange(next as DetailAttachmentFilter);
        }
      }}
      variant="outline"
      size="sm"
      className="shrink-0 gap-0 rounded-md shadow-xs"
      aria-label={t('label')}
    >
      <ToggleGroupItem value="all" className={joinedItemClassName} aria-label={t('all')}>
        {t('all')}
      </ToggleGroupItem>
      <ToggleGroupItem value="selected" className={joinedItemClassName} aria-label={t('selected')}>
        {t('selected')}
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
