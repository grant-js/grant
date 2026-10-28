'use client';

import { ReactNode, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useGrant, type UseGrantResult } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { Tenant } from '@grantjs/schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { EntityCreateToolbar, FullPageLoader } from '@/components/common';
import { UserCreateGeneralCard } from '@/components/features/user/user-create-general-card';
import { UserCreateGroups } from '@/components/features/user/user-create-groups';
import { UserCreateMetadataCard } from '@/components/features/user/user-create-metadata-card';
import { UserCreatePermissions } from '@/components/features/user/user-create-permissions';
import { UserCreateRoles } from '@/components/features/user/user-create-roles';
import { UserCreateTags } from '@/components/features/user/user-create-tags';
import { DashboardLayout, FeatureDetailLayout } from '@/components/layout';
import { Form } from '@/components/ui/form';
import { usePageTitle } from '@/hooks';
import { useRequiresEmailVerificationForMutation } from '@/hooks/auth';
import { useScopeFromParams } from '@/hooks/common';
import { useUserMutations } from '@/hooks/users';
import { useRouter } from '@/i18n/navigation';
import { getEntityDetailUrl } from '@/lib/entity-detail-url';

import { createUserSchema, UserCreateFormValues } from './user-types';

const USER_CREATE_FORM_ID = 'user-create-form';

interface UserCreateViewerProps {
  sidebar: ReactNode;
}

export function UserCreateViewer({ sidebar }: UserCreateViewerProps) {
  const t = useTranslations('user');
  usePageTitle('user.create');
  const scope = useScopeFromParams();
  const params = useParams();
  const router = useRouter();
  const { createUser } = useUserMutations();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requiresEmailVerification = useRequiresEmailVerificationForMutation(scope);

  const createGrant = useGrant(ResourceSlug.User, ResourceAction.Create, {
    scope,
    returnLoading: true,
  }) as UseGrantResult;

  const isProjectCreateScope =
    scope?.tenant === Tenant.OrganizationProject || scope?.tenant === Tenant.AccountProject;
  const setEmailGrant = useGrant(ResourceSlug.ProjectUser, ResourceAction.SetEmail, {
    scope,
    enabled: isProjectCreateScope,
    returnLoading: true,
  }) as UseGrantResult;
  const canSetEmail = Boolean(isProjectCreateScope && setEmailGrant.isGranted);

  const isCheckingCreateGrant = createGrant.isLoading;
  const canCreate = createGrant.isGranted;
  const canRenderCreateForm =
    Boolean(scope) && !requiresEmailVerification && !isCheckingCreateGrant && canCreate;

  const form = useForm<UserCreateFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: '',
      email: '',
      roleIds: [],
      groupIds: [],
      permissionIds: [],
      tagIds: [],
      primaryTagId: '',
      metadata: {},
    },
  });

  const handleCancel = () => {
    router.back();
  };

  const handleSubmit = async (values: UserCreateFormValues) => {
    if (!scope || !canCreate) return;
    setIsSubmitting(true);
    try {
      const metadataValue =
        values.metadata &&
        typeof values.metadata === 'object' &&
        !Array.isArray(values.metadata) &&
        Object.keys(values.metadata).length > 0
          ? values.metadata
          : undefined;

      const email = canSetEmail && values.email?.trim() ? values.email.trim() : undefined;

      const user = await createUser({
        scope,
        name: values.name,
        ...(email ? { email } : {}),
        roleIds: values.roleIds?.length ? values.roleIds : undefined,
        groupIds: values.groupIds?.length ? values.groupIds : undefined,
        permissionIds: values.permissionIds?.length ? values.permissionIds : undefined,
        tagIds: values.tagIds?.length ? values.tagIds : undefined,
        primaryTagId: values.primaryTagId || undefined,
        metadata: metadataValue,
      });

      if (user) {
        router.push(
          getEntityDetailUrl({
            organizationId: params.organizationId as string | undefined,
            accountId: params.accountId as string | undefined,
            projectId: params.projectId as string | undefined,
            entitySegment: 'users',
            entityId: user.id,
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
            id={USER_CREATE_FORM_ID}
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            <UserCreateGeneralCard showEmailField={canSetEmail} />
            <UserCreateMetadataCard />
            <UserCreateRoles />
            <UserCreateGroups />
            <UserCreatePermissions />
            <UserCreateTags />
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
            formId={USER_CREATE_FORM_ID}
            isSubmitting={isSubmitting}
            onCancel={handleCancel}
            labelsNamespace="users"
          />
        ) : undefined
      }
    >
      <div className="p-4">{renderContent()}</div>
    </DashboardLayout>
  );
}
