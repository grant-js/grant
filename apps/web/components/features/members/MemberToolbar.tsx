import { Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Toolbar } from '@/components/common';
import { Button } from '@/components/ui/button';
import { useMembersStore } from '@/stores/members.store';

import { InviteMemberDialog } from './InviteMemberDialog';
import { MemberLimit } from './MemberLimit';
import { MemberSearch } from './MemberSearch';
import { MemberSorter } from './MemberSorter';
import { MemberViewSwitcher } from './MemberViewSwitcher';

interface MemberToolbarProps {
  organizationId: string;
}

export function MemberToolbar({ organizationId }: MemberToolbarProps) {
  const t = useTranslations('members');
  const isInviteDialogOpen = useMembersStore((state) => state.isInviteDialogOpen);
  const setInviteDialogOpen = useMembersStore((state) => state.setInviteDialogOpen);

  const toolbarItems = [
    <MemberSearch key="search" />,
    <MemberSorter key="sorter" />,
    <MemberLimit key="limit" />,
    <MemberViewSwitcher key="view" />,
    <Button key="invite" onClick={() => setInviteDialogOpen(true)} size="sm">
      <Mail className="mr-2 h-4 w-4" />
      {t('inviteButton')}
    </Button>,
  ];

  return (
    <>
      <Toolbar items={toolbarItems} />
      <InviteMemberDialog
        organizationId={organizationId}
        open={isInviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        // Cache eviction in mutation hook will trigger automatic refetch
      />
    </>
  );
}
