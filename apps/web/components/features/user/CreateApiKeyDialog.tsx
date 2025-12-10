'use client';

import { useMemo, useState } from 'react';

import { useParams } from 'next/navigation';

import { Tenant } from '@logusgraphics/grant-schema';
import { Key } from 'lucide-react';
import { z } from 'zod';

import { CreateDialog, CreateDialogField } from '@/components/common/CreateDialog';
import { useApiKeyMutations } from '@/hooks/api-keys';

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

export type CreateApiKeyFormValues = z.infer<typeof createApiKeySchema>;

interface CreateApiKeyDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onApiKeyCreated?: (apiKey: { clientId: string; clientSecret: string } | null) => void;
}

export function CreateApiKeyDialog({
  open,
  onOpenChange,
  onApiKeyCreated,
}: CreateApiKeyDialogProps) {
  const { createApiKey } = useApiKeyMutations();
  const params = useParams();
  const projectId = params.projectId as string;
  const userId = params.userId as string;
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const scope = useMemo(
    () => ({
      tenant: Tenant.ProjectUser,
      id: `${projectId}:${userId}`,
    }),
    [projectId, userId]
  );

  const handleOpenChange = (newOpen: boolean) => {
    setIsDialogOpen(newOpen);
    if (onOpenChange) {
      onOpenChange(newOpen);
    }
  };

  const handleCreate = async (values: CreateApiKeyFormValues) => {
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

    return result;
  };

  const fields: CreateDialogField[] = [
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

  return (
    <>
      <CreateDialog
        open={open !== undefined ? open : isDialogOpen}
        onOpenChange={handleOpenChange}
        title="createDialog.title"
        description="createDialog.description"
        triggerText="createDialog.trigger"
        confirmText="createDialog.confirm"
        cancelText="createDialog.cancel"
        icon={Key}
        schema={createApiKeySchema}
        defaultValues={{
          name: '',
          description: '',
          expiresAt: undefined,
        }}
        fields={fields}
        onCreate={handleCreate}
        translationNamespace="user.apiKeys"
        submittingText="createDialog.submitting"
      />
    </>
  );
}
