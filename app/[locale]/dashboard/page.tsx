'use client';

import { use } from 'react';

import { redirect } from 'next/navigation';

import { usePageTitle } from '@/hooks';

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
