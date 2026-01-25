'use client';

import { PropsWithChildren } from 'react';

import { AbstractIntlMessages, NextIntlClientProvider } from 'next-intl';

interface MessageProviderProps extends PropsWithChildren {
  locale: string;
  messages: AbstractIntlMessages;
}

export function MessageProvider({ children, locale, messages }: MessageProviderProps) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
