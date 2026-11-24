'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AbstractIntlMessages } from 'next-intl';
import { DEFAULT_LOCALE } from '@grantjs/i18n';

import { FullPageLoader } from '@/components/common';
import { Header } from '@/components/layout';
import {
  ApolloProvider,
  GrantProvider,
  MessageProvider,
  RuntimeConfigProvider,
  SessionRestoreGate,
} from '@/components/providers';
import { mergeLocaleMessages } from '@/i18n/merge-locale-messages';

interface LocaleLayoutProps {
  children: React.ReactNode;
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
        // Use explicit locale imports (not `import(\`.../${locale}.json\`)`) so the bundler
        // always embeds the full JSON; template dynamic imports can omit keys at runtime (Turbopack).
        const webOnlyModule =
          locale === 'de'
            ? await import('@/i18n/locales/de.json')
            : await import('@/i18n/locales/en.json');
        const webOnly = webOnlyModule.default as Record<string, unknown>;
        setMessages(mergeLocaleMessages(sharedMessages, webOnly) as AbstractIntlMessages);
      } catch {
        const fallbackShared =
          locale === 'de'
            ? await import('@grantjs/i18n/locales/de.json')
            : await import('@grantjs/i18n/locales/en.json');
        const fallbackWeb = await import('@/i18n/locales/en.json');
        setMessages(
          mergeLocaleMessages(
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

  // The runtime config loads alongside the messages, and the loader stays up until both are in,
  // so a deployment's header colours and logo are there on first paint, not swapped in after.
  return (
    <RuntimeConfigProvider fallback={<FullPageLoader />}>
      {loading || !messages ? (
        <FullPageLoader />
      ) : (
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
      )}
    </RuntimeConfigProvider>
  );
}
