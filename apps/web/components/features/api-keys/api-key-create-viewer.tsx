'use client';

import { ReactNode, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useGrant, type UseGrantResult } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { EntityCreateToolbar, FullPageLoader } from '@/components/common';
import { ApiKeyCreateGeneralCard } from '@/components/features/api-key/api-key-create-general-card';
import { ApiKeyCreateGrantKindCard } from '@/components/features/api-key/api-key-create-grant-kind-card';
import { ApiKeyCreateRoleCard } from '@/components/features/api-key/api-key-create-role-card';
import { ApiKeyCreateScopes } from '@/components/features/api-key/api-key-create-scopes';
import { DashboardLayout, FeatureDetailLayout } from '@/components/layout';
import { Form } from '@/components/ui/form';
import { usePageTitle } from '@/hooks';
import { useApiKeyMutations } from '@/hooks/api-keys';
import { useRequiresEmailVerificationForMutation } from '@/hooks/auth';
import { useScopeFromParams } from '@/hooks/common';
import { useRouter } from '@/i18n/navigation';
import { isProjectApiKeyScope } from '@/lib/api-key-grants';
import { getEntityDetailUrl } from '@/lib/entity-detail-url';

import { ApiKeySecretDialog } from './api-key-secret-dialog';
import {
  createProjectApiKeySchema,
  type ProjectApiKeyCreateFormValues,
  resolveApiKeyExpiration,
} from './api-key-types';

const API_KEY_CREATE_FORM_ID = 'api-key-create-form';

interface ApiKeyCreateViewerProps {
  sidebar: ReactNode;
}

interface CreatedApiKey {
  id: string;
  clientId: string;
  clientSecret: string;
}

export function ApiKeyCreateViewer({ sidebar }: ApiKeyCreateViewerProps) {
  const t = useTranslations('user.apiKeys');
  usePageTitle('user.apiKeys.create');
  const scope = useScopeFromParams();
  const params = useParams();
  const router = useRouter();
  const { createApiKey } = useApiKeyMutations();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdApiKey, setCreatedApiKey] = useState<CreatedApiKey | null>(null);

  const requiresEmailVerification = useRequiresEmailVerificationForMutation(scope);

  const createGrant = useGrant(ResourceSlug.ApiKey, ResourceAction.Create, {
    scope: scope!,
    returnLoading: true,
  }) as UseGrantResult;

  const isCheckingCreateGrant = createGrant.isLoading;
  const canCreate = createGrant.isGranted;
  const isProjectScope = isProjectApiKeyScope(scope);
  const canRenderCreateForm =
    isProjectScope && !requiresEmailVerification && !isCheckingCreateGrant && canCreate;

  const form = useForm<ProjectApiKeyCreateFormValues>({
    resolver: zodResolver(createProjectApiKeySchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
      expirationPreset: '30d',
      expiresAt: undefined,
      grantKind: undefined,
      roleId: undefined,
      permissionIds: [],
    },
  });

  const grantKind = form.watch('grantKind');

  const handleCancel = () => {
    router.back();
  };

  const handleSubmit = async (values: ProjectApiKeyCreateFormValues) => {
    if (!scope || !canCreate || !values.grantKind) return;
    setIsSubmitting(true);
    try {
      const result = await createApiKey({
        scope,
        name: values.name?.trim() || undefined,
        description: values.description?.trim() || undefined,
        expiresAt: resolveApiKeyExpiration(values.expirationPreset, values.expiresAt),
        ...(values.grantKind === 'role'
          ? { roleId: values.roleId }
          : { permissionIds: values.permissionIds }),
      });

      if (result?.clientId && result?.clientSecret) {
        setCreatedApiKey({
          id: result.id,
          clientId: result.clientId,
          clientSecret: result.clientSecret,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSecretDialogOpenChange = (open: boolean) => {
    if (open || !createdApiKey) return;
    const { id } = createdApiKey;
    setCreatedApiKey(null);
    router.push(
      getEntityDetailUrl({
        organizationId: params.organizationId as string | undefined,
        accountId: params.accountId as string | undefined,
        projectId: params.projectId as string | undefined,
        entitySegment: 'api-keys',
        entityId: id,
      })
    );
  };

  const renderContent = () => {
    if (!scope || !isProjectScope || requiresEmailVerification) {
      return null;
    }

    if (isCheckingCreateGrant) {
      return <FullPageLoader />;
    }

    if (!canCreate) {
      return null;
    }

    return (
      <FeatureDetailLayout>
        <Form {...form}>
          <form
            id={API_KEY_CREATE_FORM_ID}
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            <ApiKeyCreateGeneralCard />
            <ApiKeyCreateGrantKindCard />
            {grantKind === 'role' && <ApiKeyCreateRoleCard />}
            {grantKind === 'scopes' && <ApiKeyCreateScopes />}
          </form>
        </Form>
      </FeatureDetailLayout>
    );
  };

  return (
    <DashboardLayout
      title={t('create.title')}
      sidebar={sidebar}
      actions={
        canRenderCreateForm ? (
          <EntityCreateToolbar
            formId={API_KEY_CREATE_FORM_ID}
            isSubmitting={isSubmitting}
            submitDisabled={!form.formState.isValid || createdApiKey !== null}
            onCancel={handleCancel}
            labelsNamespace="user.apiKeys"
          />
        ) : undefined
      }
    >
      <div className="p-4">{renderContent()}</div>
      {createdApiKey && (
        <ApiKeySecretDialog
          open
          onOpenChange={handleSecretDialogOpenChange}
          clientId={createdApiKey.clientId}
          clientSecret={createdApiKey.clientSecret}
          scope={scope ? { tenant: scope.tenant, id: scope.id } : null}
          mode="created"
        />
      )}
    </DashboardLayout>
  );
}
