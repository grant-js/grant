'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ApolloProvider as BaseApolloProvider } from '@apollo/client/react';

import { MfaStepUpDialog } from '@/components/features/auth/mfa-step-up-dialog';
import { getClient } from '@/lib/apollo-client';

export function ApolloProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations('session');
  const client = useMemo(
    () =>
      getClient({
        getSessionExpiredMessages: () => ({
          title: t('expiredTitle'),
          description: t('expiredDescription'),
        }),
      }),
    [t]
  );

  return (
    <BaseApolloProvider client={client}>
      <>
        {children}
        <MfaStepUpDialog />
      </>
    </BaseApolloProvider>
  );
}
