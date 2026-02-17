'use client';

import { useMemo } from 'react';

import { ApolloProvider as BaseApolloProvider } from '@apollo/client/react';
import { useLocale, useTranslations } from 'next-intl';

import { getClient } from '@/lib/apollo-client';

export function ApolloProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const t = useTranslations('session');
  const client = useMemo(
    () =>
      getClient({
        getSessionExpiredMessages: () => ({
          title: t('expiredTitle'),
          description: t('expiredDescription'),
        }),
      }),
    [locale, t]
  );

  return <BaseApolloProvider client={client}>{children}</BaseApolloProvider>;
}
