'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Tenant } from '@grantjs/schema';
import { Mail } from 'lucide-react';

import { PageTableColumnToggle, RefreshButton, Toolbar } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
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
    <PageTableColumnToggle key="columns" />,
    <MemberViewSwitcher key="view" />,
    ...(canInvite
      ? [
          <Tooltip key="invite">
            <TooltipTrigger asChild>
              <Button
                className={cn(
                  'w-full sm:w-auto',
                  'min-[640px]:max-[1199px]:size-9 min-[640px]:max-[1199px]:min-w-9 min-[640px]:max-[1199px]:max-w-9 min-[640px]:max-[1199px]:p-2',
                  'min-[1200px]:size-auto min-[1200px]:min-w-0 min-[1200px]:max-w-none'
                )}
                onClick={() => setInviteDialogOpen(true)}
                aria-label={t('inviteButton')}
              >
                <Mail className="size-4 shrink-0" />
                <span className="inline min-[640px]:max-[1199px]:hidden min-[1200px]:inline">
                  {t('inviteButton')}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{t('inviteButton')}</p>
            </TooltipContent>
          </Tooltip>,
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
