'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useGrant, type UseGrantResult } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Tenant, User as UserType } from '@grantjs/schema';
import { Link2 } from 'lucide-react';
import { z } from 'zod';

import { DialogField, EditDialog } from '@/components/common';
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
import { useRequiresEmailVerificationForMutation } from '@/hooks/auth';
import { useScopeFromParams } from '@/hooks/common';
import { useUserMutations } from '@/hooks/users';
import { useUsersStore } from '@/stores/users.store';

const setEmailSchema = z.object({
  email: z.email('errors.validation.invalidEmail'),
});

type SetEmailFormValues = z.infer<typeof setEmailSchema>;

const mapUserToFormValues = (_user: UserType): SetEmailFormValues => ({
  email: '',
});

interface PendingLink {
  userId: string;
  email: string;
}

export function UserSetEmailDialog() {
  const t = useTranslations('users.linkIdentityDialog');
  const scope = useScopeFromParams();
  const { setProjectUserEmail, linkProjectUserIdentity } = useUserMutations();
  const userToSetEmail = useUsersStore((state) => state.userToSetEmail);
  const setUserToSetEmail = useUsersStore((state) => state.setUserToSetEmail);
  const [pendingLink, setPendingLink] = useState<PendingLink | null>(null);
  const [isLinking, setIsLinking] = useState(false);

  const { isGranted: canSetEmail, isLoading: isSetEmailLoading } = useGrant(
    ResourceSlug.ProjectUser,
    ResourceAction.SetEmail,
    { scope: scope!, enabled: !!userToSetEmail, returnLoading: true }
  ) as UseGrantResult;
  // The link exists in organization projects only.
  const canLinkIdentity = useGrant(ResourceSlug.ProjectUser, ResourceAction.LinkIdentity, {
    scope: scope!,
    enabled: !!userToSetEmail && scope?.tenant === Tenant.OrganizationProject,
  });
  const requiresEmailVerification = useRequiresEmailVerificationForMutation(scope);

  if (!scope || requiresEmailVerification) return null;
  if (!isSetEmailLoading && !canSetEmail) return null;

  const offerLink = canLinkIdentity && scope.tenant === Tenant.OrganizationProject;

  const fields: DialogField[] = [
    {
      name: 'email',
      label: 'form.email',
      placeholder: 'form.email',
      type: 'email',
      required: true,
    },
  ];

  const handleUpdate = async (userId: string, values: SetEmailFormValues) => {
    return await setProjectUserEmail(
      {
        userId,
        email: values.email,
        scope,
      },
      offerLink ? { onConflict: () => setPendingLink({ userId, email: values.email }) } : undefined
    );
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setUserToSetEmail(null);
      setPendingLink(null);
    }
  };

  const handleLink = async () => {
    if (!pendingLink) return;
    setIsLinking(true);
    try {
      await linkProjectUserIdentity({ ...pendingLink, scope });
      setPendingLink(null);
      setUserToSetEmail(null);
    } catch {
      // The mutation hook has already told the operator; the confirm stays open.
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <>
      <EditDialog
        entity={userToSetEmail}
        open={!!userToSetEmail}
        schema={setEmailSchema}
        defaultValues={{ email: '' }}
        fields={fields}
        title="setEmailDialog.title"
        description="setEmailDialog.description"
        confirmText="setEmailDialog.confirm"
        cancelText="setEmailDialog.cancel"
        updatingText="setEmailDialog.updating"
        translationNamespace="users"
        mapEntityToFormValues={mapUserToFormValues}
        onUpdate={handleUpdate}
        onOpenChange={handleOpenChange}
      />
      <AlertDialog
        open={!!pendingLink}
        onOpenChange={(open) => {
          if (!open && !isLinking) setPendingLink(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              {t('title')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('description', { email: pendingLink?.email ?? '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground">{t('consequences')}</p>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLinking}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={isLinking}
              onClick={(event) => {
                event.preventDefault();
                void handleLink();
              }}
            >
              {isLinking ? t('linking') : t('confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
