'use client';

import { useParams } from 'next/navigation';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Tenant } from '@grantjs/schema';
import { Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { RefreshButton, Toolbar } from '@/components/common';
import { Button } from '@/components/ui/button';
import { useMembersStore } from '@/stores/members.store';

import { MemberInviteDialog } from './member-invite-dialog';
import { MemberLimit } from './member-limit';
import { MemberSearch } from './member-search';
import { MemberSorter } from './member-sorter';
import { MemberViewSwitcher } from './member-view-switcher';

export function MemberToolbar() {
  const t = useTranslations('members');
  const params = useParams();
  const organizationId = params.organizationId as string;
  const isInviteDialogOpen = useMembersStore((state) => state.isInviteDialogOpen);
  const setInviteDialogOpen = useMembersStore((state) => state.setInviteDialogOpen);
  const refetch = useMembersStore((state) => state.refetch);
  const loading = useMembersStore((state) => state.loading);

  // Scope permissions to this organization
  const scope = { tenant: Tenant.Organization, id: organizationId };

  // Check Create permission for invitations
  const canInvite = useGrant(ResourceSlug.OrganizationInvitation, ResourceAction.Create, {
    scope,
  });

  const toolbarItems = [
    <RefreshButton key="refresh" onRefresh={refetch ?? undefined} loading={loading} />,
    <MemberSearch key="search" />,
    <MemberSorter key="sorter" />,
    <MemberLimit key="limit" />,
    <MemberViewSwitcher key="view" />,
    ...(canInvite
      ? [
          <Button key="invite" onClick={() => setInviteDialogOpen(true)} size="sm">
            <Mail className="mr-2 h-4 w-4" />
            {t('inviteButton')}
          </Button>,
        ]
      : []),
  ];

  return (
    <>
      <Toolbar items={toolbarItems} />
      {canInvite && (
        <MemberInviteDialog open={isInviteDialogOpen} onOpenChange={setInviteDialogOpen} />
      )}
    </>
  );
}
