'use client';

import { PropsWithChildren } from 'react';

import { NextIntlClientProvider } from 'next-intl';
import { AbstractIntlMessages } from 'next-intl';

interface MessagesProviderProps extends PropsWithChildren {
  locale: string;
  messages: AbstractIntlMessages;
}

export function MessagesProvider({ children, locale, messages }: MessagesProviderProps) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
