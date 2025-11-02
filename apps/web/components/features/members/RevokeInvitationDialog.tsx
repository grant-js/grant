'use client';

import { Ban } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { MemberWithInvitation, useMemberMutations } from '@/hooks/members';

interface RevokeInvitationDialogProps {
  member: MemberWithInvitation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RevokeInvitationDialog({
  member,
  open,
  onOpenChange,
}: RevokeInvitationDialogProps) {
  const t = useTranslations('members');
  const { revokeInvitation } = useMemberMutations();

  const handleRevoke = async () => {
    if (!member.email) {
      console.error('Member does not have an email');
      return;
    }

    try {
      await revokeInvitation(member.id, member.email);
      onOpenChange(false);
      // Cache eviction in mutation hook will trigger automatic refetch
    } catch (error) {
      // Error is handled by the mutation hook
      console.error('Failed to revoke invitation:', error);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5" />
            {t('revokeInvitationDialog.title')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('revokeInvitationDialog.description', { email: member.email || '' })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('revokeInvitationDialog.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRevoke}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            <Ban className="mr-2 h-4 w-4" />
            {t('revokeInvitationDialog.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
