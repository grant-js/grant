'use client';

import { redirect } from 'next/navigation';
import { usePageTitle } from '@/hooks';
import { use } from 'react';

interface PageProps {
  params: Promise<{
    locale: string;
  }>;
}

export default function DashboardPage({ params }: PageProps) {
  usePageTitle('dashboard');
  const { locale } = use(params);

  // Redirect to users page for now
  redirect(`/${locale}/dashboard/users`);
}
