'use client';

import { ReactNode, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useGrant, type UseGrantResult } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { EntityCreateToolbar, FullPageLoader } from '@/components/common';
import { PermissionCreateConditionCard } from '@/components/features/permission/permission-create-condition-card';
import { PermissionCreateGeneralCard } from '@/components/features/permission/permission-create-general-card';
import { PermissionCreateTags } from '@/components/features/permission/permission-create-tags';
import { DashboardLayout, FeatureDetailLayout } from '@/components/layout';
import { Form } from '@/components/ui/form';
import { usePageTitle } from '@/hooks';
import { useRequiresEmailVerificationForMutation } from '@/hooks/auth';
import { useScopeFromParams } from '@/hooks/common';
import { usePermissionMutations } from '@/hooks/permissions';
import { useRouter } from '@/i18n/navigation';
import { getEntityDetailUrl } from '@/lib/entity-detail-url';

import { createPermissionSchema, PermissionCreateFormValues } from './permission-types';

const PERMISSION_CREATE_FORM_ID = 'permission-create-form';

interface PermissionCreateViewerProps {
  sidebar: ReactNode;
}

export function PermissionCreateViewer({ sidebar }: PermissionCreateViewerProps) {
  const t = useTranslations('permission');
  usePageTitle('permission.create');
  const scope = useScopeFromParams();
  const params = useParams();
  const router = useRouter();
  const { createPermission } = usePermissionMutations();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requiresEmailVerification = useRequiresEmailVerificationForMutation(scope);

  const createGrant = useGrant(ResourceSlug.Permission, ResourceAction.Create, {
    scope,
    returnLoading: true,
  }) as UseGrantResult;

  const isCheckingCreateGrant = createGrant.isLoading;
  const canCreate = createGrant.isGranted;
  const canRenderCreateForm =
    Boolean(scope) && !requiresEmailVerification && !isCheckingCreateGrant && canCreate;

  const form = useForm<PermissionCreateFormValues>({
    resolver: zodResolver(createPermissionSchema),
    defaultValues: {
      name: '',
      action: '',
      description: '',
      resourceId: '__none__',
      tagIds: [],
      primaryTagId: '',
      condition: {},
    },
  });

  const handleCancel = () => {
    router.back();
  };

  const handleSubmit = async (values: PermissionCreateFormValues) => {
    if (!scope || !canCreate) return;
    setIsSubmitting(true);
    try {
      const conditionValue =
        values.condition &&
        typeof values.condition === 'object' &&
        !Array.isArray(values.condition) &&
        Object.keys(values.condition).length > 0
          ? (values.condition as Record<string, unknown>)
          : null;

      const permission = await createPermission({
        scope,
        name: values.name,
        action: values.action || '',
        description: values.description,
        resourceId:
          values.resourceId === '__none__' || !values.resourceId ? null : values.resourceId,
        tagIds: values.tagIds,
        primaryTagId: values.primaryTagId,
        condition: conditionValue,
      });

      if (permission) {
        router.push(
          getEntityDetailUrl({
            organizationId: params.organizationId as string | undefined,
            accountId: params.accountId as string | undefined,
            projectId: params.projectId as string | undefined,
            entitySegment: 'permissions',
            entityId: permission.id,
          })
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderContent = () => {
    if (!scope || requiresEmailVerification) {
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
            id={PERMISSION_CREATE_FORM_ID}
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            <PermissionCreateGeneralCard />
            <PermissionCreateConditionCard />
            <PermissionCreateTags />
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
            formId={PERMISSION_CREATE_FORM_ID}
            isSubmitting={isSubmitting}
            onCancel={handleCancel}
            labelsNamespace="permissions"
          />
        ) : undefined
      }
    >
      <div className="p-4">{renderContent()}</div>
    </DashboardLayout>
  );
}
