'use client';

import { useState } from 'react';
import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Scope } from '@grantjs/schema';
import { KeyRound } from 'lucide-react';
import { DefaultValues } from 'react-hook-form';

import { CreateDialog, DialogField } from '@/components/common';
import { useApiKeyMutations } from '@/hooks/api-keys';
import { useRequiresEmailVerificationForMutation } from '@/hooks/auth';
import { useScopeFromParams } from '@/hooks/common';

import {
  type ApiKeyCreateFormValues,
  createApiKeySchema,
  resolveApiKeyExpiration,
} from './api-key-types';

const defaultValues: DefaultValues<ApiKeyCreateFormValues> = {
  name: '',
  description: '',
  expirationPreset: '30d',
  expiresAt: undefined,
};

const fields: DialogField[] = [
  { name: 'name', label: 'form.name', placeholder: 'form.namePlaceholder', type: 'text' },
  {
    name: 'description',
    label: 'form.description',
    placeholder: 'form.descriptionPlaceholder',
    type: 'textarea',
  },
  {
    name: 'expirationPreset',
    label: 'form.expiration',
    type: 'expiration-presets',
  },
];

export interface ApiKeyCreateDialogProps {
  scope?: Scope | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onApiKeyCreated?: (apiKey: { clientId: string; clientSecret: string } | null) => void;
  /** When true, trigger always shows the label (e.g. when used as empty-state action). */
  triggerAlwaysShowLabel?: boolean;
}

/**
 * Creates the keys that carry no role or permissions (user and project-user scopes).
 * Project keys are created in the dedicated create view, where the authorization model is chosen.
 */
export function ApiKeyCreateDialog({
  scope: scopeProp,
  open,
  onOpenChange,
  onApiKeyCreated,
  triggerAlwaysShowLabel,
}: ApiKeyCreateDialogProps) {
  const scopeFromParams = useScopeFromParams();
  const scope = scopeProp ?? scopeFromParams;
  const { createApiKey } = useApiKeyMutations();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const canCreate = useGrant(ResourceSlug.ApiKey, ResourceAction.Create, { scope: scope! });
  const requiresEmailVerification = useRequiresEmailVerificationForMutation(scope!);

  if (!scope || !canCreate || requiresEmailVerification) {
    return null;
  }

  const handleOpenChange = (newOpen: boolean) => {
    setIsDialogOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  const handleCreate = async (values: ApiKeyCreateFormValues) => {
    const result = await createApiKey({
      scope,
      name: values.name?.trim() || undefined,
      description: values.description?.trim() || undefined,
      expiresAt: resolveApiKeyExpiration(values.expirationPreset, values.expiresAt),
    });

    if (result?.clientId && result?.clientSecret && onApiKeyCreated) {
      onApiKeyCreated({ clientId: result.clientId, clientSecret: result.clientSecret });
    }
  };

  return (
    <CreateDialog<ApiKeyCreateFormValues>
      open={open !== undefined ? open : isDialogOpen}
      icon={KeyRound}
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
      triggerAlwaysShowLabel={triggerAlwaysShowLabel}
    />
  );
}
