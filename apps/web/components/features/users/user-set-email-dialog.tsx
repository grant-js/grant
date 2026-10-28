'use client';

import { useGrant, type UseGrantResult } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { User as UserType } from '@grantjs/schema';
import { z } from 'zod';

import { DialogField, EditDialog } from '@/components/common';
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

export function UserSetEmailDialog() {
  const scope = useScopeFromParams();
  const { setProjectUserEmail } = useUserMutations();
  const userToSetEmail = useUsersStore((state) => state.userToSetEmail);
  const setUserToSetEmail = useUsersStore((state) => state.setUserToSetEmail);

  const { isGranted: canSetEmail, isLoading: isSetEmailLoading } = useGrant(
    ResourceSlug.ProjectUser,
    ResourceAction.SetEmail,
    { scope: scope!, enabled: !!userToSetEmail, returnLoading: true }
  ) as UseGrantResult;
  const requiresEmailVerification = useRequiresEmailVerificationForMutation(scope);

  if (!scope || requiresEmailVerification) return null;
  if (!isSetEmailLoading && !canSetEmail) return null;

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
    return await setProjectUserEmail({
      userId,
      email: values.email,
      scope: scope!,
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setUserToSetEmail(null);
    }
  };

  return (
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
  );
}
