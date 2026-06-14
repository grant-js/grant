'use client';

import { ReactNode, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useGrant, type UseGrantResult } from '@grantjs/client/react';
import { DEFAULT_RESOURCE_ACTIONS, ResourceAction, ResourceSlug } from '@grantjs/constants';
import { CreateResourceInput } from '@grantjs/schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { EntityCreateToolbar, FullPageLoader } from '@/components/common';
import { ResourceCreateActionsCard } from '@/components/features/resource/resource-create-actions-card';
import { ResourceCreateGeneralCard } from '@/components/features/resource/resource-create-general-card';
import { ResourceCreateTags } from '@/components/features/resource/resource-create-tags';
import { DashboardLayout, FeatureDetailLayout } from '@/components/layout';
import { Form } from '@/components/ui/form';
import { usePageTitle } from '@/hooks';
import { useRequiresEmailVerificationForMutation } from '@/hooks/auth';
import { useScopeFromParams } from '@/hooks/common';
import { useResourceMutations } from '@/hooks/resources';
import { useRouter } from '@/i18n/navigation';
import { getEntityDetailUrl } from '@/lib/entity-detail-url';

import { createResourceSchema, ResourceCreateFormValues } from './resource-types';

const RESOURCE_CREATE_FORM_ID = 'resource-create-form';

interface ResourceCreateViewerProps {
  sidebar: ReactNode;
}

export function ResourceCreateViewer({ sidebar }: ResourceCreateViewerProps) {
  const t = useTranslations('resource');
  usePageTitle('resource.create');
  const scope = useScopeFromParams();
  const params = useParams();
  const router = useRouter();
  const { createResource } = useResourceMutations();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requiresEmailVerification = useRequiresEmailVerificationForMutation(scope);

  const createGrant = useGrant(ResourceSlug.Resource, ResourceAction.Create, {
    scope,
    returnLoading: true,
  }) as UseGrantResult;

  const isCheckingCreateGrant = createGrant.isLoading;
  const canCreate = createGrant.isGranted;
  const canRenderCreateForm =
    Boolean(scope) && !requiresEmailVerification && !isCheckingCreateGrant && canCreate;

  const form = useForm<ResourceCreateFormValues>({
    resolver: zodResolver(createResourceSchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      actions: [...DEFAULT_RESOURCE_ACTIONS],
      isActive: true,
      createPermissions: false,
      tagIds: [],
      primaryTagId: '',
    },
  });

  const handleCancel = () => {
    router.back();
  };

  const handleSubmit = async (values: ResourceCreateFormValues) => {
    if (!scope || !canCreate) return;
    setIsSubmitting(true);
    try {
      const resource = await createResource({
        scope,
        name: values.name,
        slug: values.slug || undefined,
        description: values.description,
        actions: values.actions,
        isActive: values.isActive,
        createPermissions: values.createPermissions ?? false,
        tagIds: values.tagIds,
        primaryTagId: values.primaryTagId,
      } as CreateResourceInput);

      if (resource) {
        router.push(
          getEntityDetailUrl({
            organizationId: params.organizationId as string | undefined,
            accountId: params.accountId as string | undefined,
            projectId: params.projectId as string | undefined,
            entitySegment: 'resources',
            entityId: resource.id,
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
            id={RESOURCE_CREATE_FORM_ID}
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            <ResourceCreateGeneralCard />
            <ResourceCreateActionsCard />
            <ResourceCreateTags />
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
            formId={RESOURCE_CREATE_FORM_ID}
            isSubmitting={isSubmitting}
            onCancel={handleCancel}
            labelsNamespace="resources"
          />
        ) : undefined
      }
    >
      <div className="p-4">{renderContent()}</div>
    </DashboardLayout>
  );
}
