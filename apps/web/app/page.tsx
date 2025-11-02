import { redirect } from 'next/navigation';

import { defaultLocale } from '@/i18n/routing';

export default function RootPage() {
  redirect(`/${defaultLocale}`);
}
