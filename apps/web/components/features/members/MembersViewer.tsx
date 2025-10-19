'use client';

import { useState } from 'react';

import { Mail } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import { useMemberMutations, useMembers } from '@/hooks/members';

import { InviteMemberDialog } from './InviteMemberDialog';
import { MembersTable } from './MembersTable';

interface MembersViewerProps {
  organizationId: string;
}

export function MembersViewer({ organizationId }: MembersViewerProps) {
  const t = useTranslations('members');
  const { members, loading, refetch } = useMembers(organizationId);
  const { revokeInvitation } = useMemberMutations();

  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);

  const handleRevokeInvitation = async (id: string, email: string) => {
    await revokeInvitation(id, email);
    refetch();
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('title')}</h2>
          <p className="text-muted-foreground">{t('description')}</p>
        </div>
        <Button onClick={() => setIsInviteDialogOpen(true)}>
          <Mail className="mr-2 h-4 w-4" />
          {t('inviteButton')}
        </Button>
      </div>

      {/* Members Table */}
      <MembersTable
        members={members}
        loading={loading}
        onRevokeInvitation={handleRevokeInvitation}
      />

      {/* Invite Dialog */}
      <InviteMemberDialog
        organizationId={organizationId}
        open={isInviteDialogOpen}
        onOpenChange={setIsInviteDialogOpen}
      />
    </div>
  );
}
