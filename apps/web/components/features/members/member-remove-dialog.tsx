'use client';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Tenant } from '@grantjs/schema';
import { Trash2 } from 'lucide-react';
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

interface MemberRemoveDialogProps {
  member: MemberWithInvitation;
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function MemberRemoveDialog({
  member,
  organizationId,
  open,
  onOpenChange,
  onSuccess,
}: MemberRemoveDialogProps) {
  const t = useTranslations('members');
  const { removeMember } = useMemberMutations();

  const scope = { tenant: Tenant.Organization, id: organizationId };

  const canRemove = useGrant(ResourceSlug.OrganizationMember, ResourceAction.Remove, {
    scope,
  });

  if (!canRemove) {
    return null;
  }

  const handleRemove = async () => {
    if (!member.user?.id) {
      console.error('Member does not have a user ID');
      return;
    }

    try {
      await removeMember(member.user.id, organizationId);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            {t('removeMemberDialog.title')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('removeMemberDialog.description', { name: member.name })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('removeMemberDialog.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRemove}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t('removeMemberDialog.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
