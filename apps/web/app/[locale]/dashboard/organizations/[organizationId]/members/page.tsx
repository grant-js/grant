'use client';

import { useParams } from 'next/navigation';

import { useTranslations } from 'next-intl';

import { MemberPagination, MemberToolbar, MemberViewer } from '@/components/features/members';
import { DashboardLayout } from '@/components/layout';
import { OrganizationSidebar } from '@/components/navigation';
import { usePageTitle } from '@/hooks';

export default function OrganizationMembersPage() {
  const t = useTranslations('members');
  const params = useParams();
  const organizationId = params.organizationId as string;
  usePageTitle('members');

  return (
    <DashboardLayout
      title={t('title')}
      sidebar={<OrganizationSidebar />}
      actions={<MemberToolbar />}
      footer={<MemberPagination />}
    >
      <MemberViewer organizationId={organizationId} />
    </DashboardLayout>
  );
}
