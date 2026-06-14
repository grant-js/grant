'use client';

import { ReactNode, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useGrant, type UseGrantResult } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { EntityCreateToolbar, FullPageLoader } from '@/components/common';
import { ProjectAppCreateGeneralCard } from '@/components/features/project-app/project-app-create-general-card';
import { ProjectAppCreateOauthCard } from '@/components/features/project-app/project-app-create-oauth-card';
import { ProjectAppCreateScopes } from '@/components/features/project-app/project-app-create-scopes';
import { ProjectAppCreateTags } from '@/components/features/project-app/project-app-create-tags';
import { DashboardLayout, FeatureDetailLayout } from '@/components/layout';
import { Form } from '@/components/ui/form';
import { usePageTitle } from '@/hooks';
import { useRequiresEmailVerificationForMutation } from '@/hooks/auth';
import { useScopeFromParams } from '@/hooks/common';
import { useProjectAppMutations } from '@/hooks/project-apps';
import { useRouter } from '@/i18n/navigation';
import { getEntityDetailUrl } from '@/lib/entity-detail-url';

import { createProjectAppSchema, type ProjectAppCreateFormValues } from './project-app-types';

const PROJECT_APP_CREATE_FORM_ID = 'project-app-create-form';

interface ProjectAppCreateViewerProps {
  sidebar: ReactNode;
}

export function ProjectAppCreateViewer({ sidebar }: ProjectAppCreateViewerProps) {
  const t = useTranslations('projectApp');
  usePageTitle('projectApp.create');
  const scope = useScopeFromParams();
  const params = useParams();
  const router = useRouter();
  const { createProjectApp } = useProjectAppMutations();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requiresEmailVerification = useRequiresEmailVerificationForMutation(scope);

  const createGrant = useGrant(ResourceSlug.ProjectApp, ResourceAction.Create, {
    scope,
    returnLoading: true,
  }) as UseGrantResult;

  const isCheckingCreateGrant = createGrant.isLoading;
  const canCreate = createGrant.isGranted;
  const canRenderCreateForm =
    Boolean(scope) && !requiresEmailVerification && !isCheckingCreateGrant && canCreate;

  const form = useForm<ProjectAppCreateFormValues>({
    resolver: zodResolver(createProjectAppSchema),
    defaultValues: {
      name: '',
      redirectUris: [],
      scopes: [],
      enabledProviders: [],
      allowSignUp: true,
      signUpRoleId: '',
      tagIds: [],
      primaryTagId: '',
    },
  });

  const handleCancel = () => {
    router.back();
  };

  const handleSubmit = async (values: ProjectAppCreateFormValues) => {
    if (!scope || !canCreate) return;
    setIsSubmitting(true);
    try {
      const result = await createProjectApp({
        scope,
        name: values.name?.trim() || undefined,
        redirectUris: values.redirectUris,
        scopes: values.scopes ?? [],
        enabledProviders: values.enabledProviders?.length ? values.enabledProviders : undefined,
        allowSignUp: values.allowSignUp,
        signUpRoleId:
          values.allowSignUp === false
            ? null
            : values.signUpRoleId
              ? values.signUpRoleId
              : undefined,
        tagIds: values.tagIds?.length ? values.tagIds : undefined,
        primaryTagId: values.primaryTagId || undefined,
      });

      if (result) {
        router.push(
          getEntityDetailUrl({
            organizationId: params.organizationId as string | undefined,
            accountId: params.accountId as string | undefined,
            projectId: params.projectId as string | undefined,
            entitySegment: 'apps',
            entityId: result.id,
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
            id={PROJECT_APP_CREATE_FORM_ID}
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            <ProjectAppCreateGeneralCard />
            <ProjectAppCreateOauthCard />
            <ProjectAppCreateScopes />
            <ProjectAppCreateTags />
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
            formId={PROJECT_APP_CREATE_FORM_ID}
            isSubmitting={isSubmitting}
            onCancel={handleCancel}
            labelsNamespace="projectApps"
          />
        ) : undefined
      }
    >
      <div className="p-4">{renderContent()}</div>
    </DashboardLayout>
  );
}
