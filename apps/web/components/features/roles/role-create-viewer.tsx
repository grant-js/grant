'use client';

import { ReactNode, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useGrant, type UseGrantResult } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { EntityCreateToolbar, FullPageLoader } from '@/components/common';
import { RoleCreateGeneralCard } from '@/components/features/role/role-create-general-card';
import { RoleCreateGroups } from '@/components/features/role/role-create-groups';
import { RoleCreateMetadataCard } from '@/components/features/role/role-create-metadata-card';
import { RoleCreatePermissions } from '@/components/features/role/role-create-permissions';
import { RoleCreateTags } from '@/components/features/role/role-create-tags';
import { DashboardLayout, FeatureDetailLayout } from '@/components/layout';
import { Form } from '@/components/ui/form';
import { usePageTitle } from '@/hooks';
import { useRequiresEmailVerificationForMutation } from '@/hooks/auth';
import { useScopeFromParams } from '@/hooks/common';
import { useRoleMutations } from '@/hooks/roles';
import { useRouter } from '@/i18n/navigation';
import { getEntityDetailUrl } from '@/lib/entity-detail-url';

import { createRoleSchema, type RoleCreateFormValues } from './role-types';

const ROLE_CREATE_FORM_ID = 'role-create-form';

interface RoleCreateViewerProps {
  sidebar: ReactNode;
}

export function RoleCreateViewer({ sidebar }: RoleCreateViewerProps) {
  const t = useTranslations('role');
  usePageTitle('role.create');
  const scope = useScopeFromParams();
  const params = useParams();
  const router = useRouter();
  const { createRole } = useRoleMutations();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requiresEmailVerification = useRequiresEmailVerificationForMutation(scope);

  const createGrant = useGrant(ResourceSlug.Role, ResourceAction.Create, {
    scope,
    returnLoading: true,
  }) as UseGrantResult;

  const isCheckingCreateGrant = createGrant.isLoading;
  const canCreate = createGrant.isGranted;
  const canRenderCreateForm =
    Boolean(scope) && !requiresEmailVerification && !isCheckingCreateGrant && canCreate;

  const form = useForm<RoleCreateFormValues>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: {
      name: '',
      description: '',
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

  const handleSubmit = async (values: RoleCreateFormValues) => {
    if (!scope || !canCreate) return;
    setIsSubmitting(true);
    try {
      const role = await createRole({
        scope,
        name: values.name,
        description: values.description,
        groupIds: values.groupIds?.length ? values.groupIds : undefined,
        permissionIds: values.permissionIds?.length ? values.permissionIds : undefined,
        tagIds: values.tagIds,
        primaryTagId: values.primaryTagId || undefined,
        metadata:
          values.metadata &&
          typeof values.metadata === 'object' &&
          !Array.isArray(values.metadata) &&
          Object.keys(values.metadata).length > 0
            ? values.metadata
            : undefined,
      });

      if (role) {
        router.push(
          getEntityDetailUrl({
            organizationId: params.organizationId as string | undefined,
            accountId: params.accountId as string | undefined,
            projectId: params.projectId as string | undefined,
            entitySegment: 'roles',
            entityId: role.id,
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
            id={ROLE_CREATE_FORM_ID}
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            <RoleCreateGeneralCard />
            <RoleCreateMetadataCard />
            <RoleCreateGroups />
            <RoleCreatePermissions />
            <RoleCreateTags />
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
            formId={ROLE_CREATE_FORM_ID}
            isSubmitting={isSubmitting}
            onCancel={handleCancel}
            labelsNamespace="roles"
          />
        ) : undefined
      }
    >
      <div className="p-4">{renderContent()}</div>
    </DashboardLayout>
  );
}
