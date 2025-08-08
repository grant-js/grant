'use client';

import { use } from 'react';

import { OrganizationProjectsPage } from '@/components/features/organizations/OrganizationProjectsPage';
import { usePageTitle } from '@/hooks';

interface PageProps {
  params: Promise<{
    locale: string;
    organizationId: string;
  }>;
}

export default function OrganizationPage({ params }: PageProps) {
  usePageTitle('organization.projects');
  const { locale, organizationId } = use(params);

  return <OrganizationProjectsPage organizationId={organizationId} />;
}
