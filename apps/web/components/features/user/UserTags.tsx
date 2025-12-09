'use client';

import { useTranslations } from 'next-intl';

interface UserTagsProps {
  userId: string;
}

export function UserTags({ userId }: UserTagsProps) {
  const t = useTranslations('user.tags');
  // TODO: Implement user tags display
  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="text-lg font-semibold mb-4">{t('title')}</h3>
      <p className="text-sm text-muted-foreground">{t('empty')}</p>
    </div>
  );
}
