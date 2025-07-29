import { Header } from '@/components/layout/Header';
import { MessagesProvider } from '@/components/providers/MessagesProvider';

interface RootLayoutProps {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function RootLayout({ children, params }: RootLayoutProps) {
  const { locale } = await params;
  const messages = (await import(`@/i18n/locales/${locale}.json`)).default;

  return (
    <MessagesProvider locale={locale} messages={messages}>
      <div className="relative flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
      </div>
    </MessagesProvider>
  );
}
