'use client';

import { useEffect, useState } from 'react';

import { useParams } from 'next/navigation';

import { DEFAULT_LOCALE } from '@grantjs/i18n';
import { AbstractIntlMessages } from 'next-intl';

import { FullPageLoader } from '@/components/common';
import { Header } from '@/components/layout';
import {
  ApolloProvider,
  GrantProvider,
  MessageProvider,
  SessionRestoreGate,
} from '@/components/providers';

interface LocaleLayoutProps {
  children: React.ReactNode;
}

function mergeMessages(
  shared: Record<string, unknown>,
  web: Record<string, unknown>
): Record<string, unknown> {
  const allKeys = new Set([...Object.keys(shared), ...Object.keys(web)]);
  const result: Record<string, unknown> = {};
  for (const key of allKeys) {
    const sharedVal = shared[key];
    const webVal = web[key];
    const sharedObj =
      sharedVal != null && typeof sharedVal === 'object' && !Array.isArray(sharedVal);
    const webObj = webVal != null && typeof webVal === 'object' && !Array.isArray(webVal);
    if (sharedObj && webObj) {
      result[key] = {
        ...(sharedVal as Record<string, unknown>),
        ...(webVal as Record<string, unknown>),
      };
    } else {
      result[key] = webVal !== undefined ? webVal : sharedVal;
    }
  }
  return result;
}

export default function LocaleLayout({ children }: LocaleLayoutProps) {
  const params = useParams();
  const locale = (params.locale as string) || DEFAULT_LOCALE;
  const [messages, setMessages] = useState<AbstractIntlMessages | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMessages = async () => {
      try {
        const sharedModule =
          locale === 'de'
            ? await import('@grantjs/i18n/locales/de.json')
            : await import('@grantjs/i18n/locales/en.json');
        const sharedMessages = sharedModule.default as Record<string, unknown>;
        const webOnlyModule = await import(`@/i18n/locales/${locale}.json`).catch(
          () => import('@/i18n/locales/en.json')
        );
        const webOnly = webOnlyModule.default as Record<string, unknown>;
        setMessages(mergeMessages(sharedMessages, webOnly) as AbstractIntlMessages);
      } catch {
        const fallbackShared =
          locale === 'de'
            ? await import('@grantjs/i18n/locales/de.json')
            : await import('@grantjs/i18n/locales/en.json');
        const fallbackWeb = await import('@/i18n/locales/en.json');
        setMessages(
          mergeMessages(
            fallbackShared.default as Record<string, unknown>,
            fallbackWeb.default as Record<string, unknown>
          ) as AbstractIntlMessages
        );
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [locale]);

  if (loading || !messages) {
    return <FullPageLoader />;
  }

  return (
    <MessageProvider messages={messages} locale={locale}>
      <ApolloProvider>
        <GrantProvider>
          <SessionRestoreGate>
            <div className="relative flex min-h-screen flex-col">
              <Header />
              <main className="min-w-0 flex-1">{children}</main>
            </div>
          </SessionRestoreGate>
        </GrantProvider>
      </ApolloProvider>
    </MessageProvider>
  );
}
