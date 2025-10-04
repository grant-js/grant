'use client';

import { redirect, useParams } from 'next/navigation';
import { useLocale } from 'next-intl';

export default function AccountPage() {
  const currentLocale = useLocale();
  const params = useParams();
  const accountId = params.accountId as string;
  return redirect(`/${currentLocale}/dashboard/accounts/${accountId}/projects`);
}
