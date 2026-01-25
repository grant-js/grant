'use client';

import { useState } from 'react';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Key } from 'lucide-react';
import { DefaultValues } from 'react-hook-form';
import { z } from 'zod';

import { CreateDialog, DialogField } from '@/components/common';
import { useApiKeyMutations } from '@/hooks/api-keys';
import { useScopeFromParams } from '@/hooks/common';

export const createApiKeySchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  expiresAt: z
    .date()
    .optional()
    .refine(
      (val) => {
        if (!val) return true;
        return val > new Date();
      },
      {
        message: 'Expiration date must be in the future',
      }
    ),
});

export type UserApiKeyCreateFormValues = z.infer<typeof createApiKeySchema>;

interface UserApiKeyCreateDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onApiKeyCreated?: (apiKey: { clientId: string; clientSecret: string } | null) => void;
}

export function UserApiKeyCreateDialog({
  open,
  onOpenChange,
  onApiKeyCreated,
}: UserApiKeyCreateDialogProps) {
  const scope = useScopeFromParams();
  const { createApiKey } = useApiKeyMutations();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const canCreate = useGrant(ResourceSlug.ApiKey, ResourceAction.Create, {
    scope: scope!,
  });

  if (!scope || !canCreate) {
    return null;
  }

  const fields: DialogField[] = [
    {
      name: 'name',
      label: 'form.name',
      placeholder: 'form.namePlaceholder',
      type: 'text',
    },
    {
      name: 'description',
      label: 'form.description',
      placeholder: 'form.descriptionPlaceholder',
      type: 'textarea',
    },
    {
      name: 'expiresAt',
      label: 'form.expiresAt',
      placeholder: 'form.expiresAtPlaceholder',
      type: 'date',
    },
  ];

  const defaultValues: DefaultValues<UserApiKeyCreateFormValues> = {
    name: '',
    description: '',
    expiresAt: new Date(),
  };

  const handleOpenChange = (newOpen: boolean) => {
    setIsDialogOpen(newOpen);
    if (onOpenChange) {
      onOpenChange(newOpen);
    }
  };

  const handleCreate = async (values: UserApiKeyCreateFormValues) => {
    const input = {
      scope: scope!,
      name: values.name?.trim() || undefined,
      description: values.description?.trim() || undefined,
      expiresAt: values.expiresAt,
    };

    const result = await createApiKey(input);

    if (result?.clientId && result?.clientSecret && onApiKeyCreated) {
      onApiKeyCreated({
        clientId: result.clientId,
        clientSecret: result.clientSecret,
      });
    }
  };

  return (
    <>
      <CreateDialog
        open={open !== undefined ? open : isDialogOpen}
        icon={Key}
        schema={createApiKeySchema}
        defaultValues={defaultValues}
        fields={fields}
        title="createDialog.title"
        description="createDialog.description"
        triggerText="createDialog.trigger"
        confirmText="createDialog.confirm"
        cancelText="createDialog.cancel"
        translationNamespace="user.apiKeys"
        submittingText="createDialog.submitting"
        onCreate={handleCreate}
        onOpenChange={handleOpenChange}
      />
    </>
  );
}
