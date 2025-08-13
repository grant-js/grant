'use client';

import { redirect, useParams } from 'next/navigation';
import { useLocale } from 'next-intl';

export default function OrganizationPage() {
  const currentLocale = useLocale();
  const params = useParams();
  const organizationId = params.organizationId as string;
  return redirect(`/${currentLocale}/dashboard/organizations/${organizationId}/projects`);
}
