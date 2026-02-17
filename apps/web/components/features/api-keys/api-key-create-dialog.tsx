'use client';

import { useMemo, useState } from 'react';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { canAssignRole } from '@grantjs/constants';
import { Scope, Tenant } from '@grantjs/schema';
import { KeyRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DefaultValues } from 'react-hook-form';
import { z } from 'zod';

import { CreateDialog, DialogField, type DialogFieldOption } from '@/components/common';
import { useApiKeyMutations } from '@/hooks/api-keys';
import { useRequiresEmailVerificationForMutation } from '@/hooks/auth';
import { useScopeFromParams } from '@/hooks/common';
import { useMembers } from '@/hooks/members';
import { useRoles } from '@/hooks/roles';
import { useAuthStore } from '@/stores/auth.store';

const baseCreateApiKeySchema = z.object({
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
      { message: 'errors.validation.expirationMustBeFuture' }
    ),
});

export type ApiKeyCreateFormValues = z.infer<typeof baseCreateApiKeySchema> & {
  roleId?: string;
};

export interface ApiKeyCreateDialogProps {
  scope?: Scope | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onApiKeyCreated?: (apiKey: { clientId: string; clientSecret: string } | null) => void;
}

export function ApiKeyCreateDialog({
  scope: scopeProp,
  open,
  onOpenChange,
  onApiKeyCreated,
}: ApiKeyCreateDialogProps) {
  const t = useTranslations();
  const scopeFromParams = useScopeFromParams();
  const scope = scopeProp ?? scopeFromParams;
  const { createApiKey } = useApiKeyMutations();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const canCreate = useGrant(ResourceSlug.ApiKey, ResourceAction.Create, { scope: scope! });
  const requiresEmailVerification = useRequiresEmailVerificationForMutation(scope!);

  const isProjectScope =
    scope?.tenant === Tenant.AccountProject || scope?.tenant === Tenant.OrganizationProject;
  const isOrganizationProject = scope?.tenant === Tenant.OrganizationProject;
  const parentScope = useMemo(() => {
    if (!scope?.id || !isProjectScope) return null;
    const [parentId] = scope.id.split(':');
    return {
      tenant: scope.tenant === Tenant.AccountProject ? Tenant.Account : Tenant.Organization,
      id: parentId,
    } as Scope;
  }, [scope, isProjectScope]);

  const organizationId = isOrganizationProject ? (scope?.id?.split(':')[0] ?? '') : '';
  const { members } = useMembers({
    organizationId,
    page: 1,
    limit: 50,
  });
  const currentAccount = useAuthStore((state) => state.getCurrentAccount());
  const currentUserRoleName = useMemo(() => {
    const ownerId = currentAccount?.ownerId;
    if (!ownerId || !members.length) return null;
    const currentMember = members.find((m) => m.type === 'member' && m.user?.id === ownerId);
    return currentMember?.role?.name ?? null;
  }, [currentAccount, members]);

  const { roles } = useRoles({
    scope: parentScope ?? ({ tenant: Tenant.Account, id: '' } as Scope),
    limit: 100,
    page: 1,
  });

  const roleOptions = useMemo((): DialogFieldOption[] => {
    if (isOrganizationProject && currentUserRoleName !== undefined) {
      return roles.map((r) => ({
        value: r.id,
        label: t(r.name),
        description: r.description ? t(r.description as string) : undefined,
        disabled: currentUserRoleName ? !canAssignRole(currentUserRoleName, r.name) : false,
      }));
    }
    return roles.map((r) => ({ value: r.id, label: t(r.name) }));
  }, [isOrganizationProject, roles, currentUserRoleName, t]);

  const showRoleField = isProjectScope && roleOptions.length > 0;

  const createApiKeySchema = useMemo(() => {
    if (showRoleField) {
      return baseCreateApiKeySchema.extend({
        roleId: z
          .string()
          .min(1, 'errors.validation.roleRequired')
          .uuid('errors.validation.invalidRoleId'),
      });
    }
    return baseCreateApiKeySchema;
  }, [showRoleField]);

  const defaultRoleId = useMemo(() => {
    if (!showRoleField || roleOptions.length === 0) return undefined;
    const firstAssignable = roleOptions.find((o) => !o.disabled);
    return (firstAssignable ?? roleOptions[0]).value;
  }, [showRoleField, roleOptions]);

  const defaultValues: DefaultValues<ApiKeyCreateFormValues> = useMemo(
    () => ({
      name: '',
      description: '',
      expiresAt: new Date(),
      ...(showRoleField && defaultRoleId ? { roleId: defaultRoleId } : {}),
    }),
    [showRoleField, defaultRoleId]
  );

  if (!scope || !canCreate || requiresEmailVerification) {
    return null;
  }

  const baseFields: DialogField[] = [
    { name: 'name', label: 'form.name', placeholder: 'form.namePlaceholder', type: 'text' },
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

  const roleField: DialogField[] = showRoleField
    ? [
        {
          name: 'roleId',
          label: 'form.roleId',
          placeholder: 'form.roleIdPlaceholder',
          type: 'select',
          options: roleOptions,
          required: true,
        },
      ]
    : [];

  const fields = [...baseFields, ...roleField];

  const handleOpenChange = (newOpen: boolean) => {
    setIsDialogOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  const handleCreate = async (values: ApiKeyCreateFormValues) => {
    const input = {
      scope: scope!,
      name: values.name?.trim() || undefined,
      description: values.description?.trim() || undefined,
      expiresAt: values.expiresAt,
      ...(showRoleField && values.roleId ? { roleId: values.roleId } : {}),
    };

    const result = await createApiKey(input);

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
    />
  );
}
