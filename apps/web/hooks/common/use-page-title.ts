import { useEffect } from 'react';

import { useTranslations } from 'next-intl';

export function usePageTitle(titleKey: string) {
  const t = useTranslations('common.app');
  const pageT = useTranslations(titleKey);

  useEffect(() => {
    const pageTitle = pageT('title');
    document.title = `${t('title')} - ${pageTitle}`;
  }, [t, pageT]);
}
