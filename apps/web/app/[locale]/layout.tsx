'use client';

import { useEffect, useState } from 'react';

import { useParams } from 'next/navigation';

import { AbstractIntlMessages } from 'next-intl';

import { FullPageLoader } from '@/components/common';
import { Header } from '@/components/layout';
import { MessageProvider } from '@/components/providers';

interface LocaleLayoutProps {
  children: React.ReactNode;
}

export default function LocaleLayout({ children }: LocaleLayoutProps) {
  const params = useParams();
  const locale = params.locale as string;
  const [messages, setMessages] = useState<AbstractIntlMessages | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMessages = async () => {
      try {
        const messagesModule = await import(`@/i18n/locales/${locale}.json`);
        setMessages(messagesModule.default);
      } catch (error) {
        console.error('Failed to load messages:', error);
        const fallbackMessages = await import('@/i18n/locales/en.json');
        setMessages(fallbackMessages.default);
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
      <div className="relative flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
      </div>
    </MessageProvider>
  );
}
