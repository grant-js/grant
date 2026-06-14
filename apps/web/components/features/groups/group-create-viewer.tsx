'use client';

import { ReactNode, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useGrant, type UseGrantResult } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { EntityCreateToolbar, FullPageLoader } from '@/components/common';
import { GroupCreateGeneralCard } from '@/components/features/group/group-create-general-card';
import { GroupCreateMetadataCard } from '@/components/features/group/group-create-metadata-card';
import { GroupCreatePermissions } from '@/components/features/group/group-create-permissions';
import { GroupCreateTags } from '@/components/features/group/group-create-tags';
import { DashboardLayout, FeatureDetailLayout } from '@/components/layout';
import { Form } from '@/components/ui/form';
import { usePageTitle } from '@/hooks';
import { useRequiresEmailVerificationForMutation } from '@/hooks/auth';
import { useScopeFromParams } from '@/hooks/common';
import { useGroupMutations } from '@/hooks/groups';
import { useRouter } from '@/i18n/navigation';
import { getEntityDetailUrl } from '@/lib/entity-detail-url';

import { createGroupSchema, type GroupCreateFormValues } from './group-types';

const GROUP_CREATE_FORM_ID = 'group-create-form';

interface GroupCreateViewerProps {
  sidebar: ReactNode;
}

export function GroupCreateViewer({ sidebar }: GroupCreateViewerProps) {
  const t = useTranslations('group');
  usePageTitle('group.create');
  const scope = useScopeFromParams();
  const params = useParams();
  const router = useRouter();
  const { createGroup } = useGroupMutations();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requiresEmailVerification = useRequiresEmailVerificationForMutation(scope);

  const createGrant = useGrant(ResourceSlug.Group, ResourceAction.Create, {
    scope,
    returnLoading: true,
  }) as UseGrantResult;

  const isCheckingCreateGrant = createGrant.isLoading;
  const canCreate = createGrant.isGranted;
  const canRenderCreateForm =
    Boolean(scope) && !requiresEmailVerification && !isCheckingCreateGrant && canCreate;

  const form = useForm<GroupCreateFormValues>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      name: '',
      description: '',
      permissionIds: [],
      tagIds: [],
      primaryTagId: '',
      metadata: {},
    },
  });

  const handleCancel = () => {
    router.back();
  };

  const handleSubmit = async (values: GroupCreateFormValues) => {
    if (!scope || !canCreate) return;
    setIsSubmitting(true);
    try {
      const group = await createGroup({
        name: values.name,
        description: values.description,
        scope,
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

      if (group) {
        router.push(
          getEntityDetailUrl({
            organizationId: params.organizationId as string | undefined,
            accountId: params.accountId as string | undefined,
            projectId: params.projectId as string | undefined,
            entitySegment: 'groups',
            entityId: group.id,
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
            id={GROUP_CREATE_FORM_ID}
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            <GroupCreateGeneralCard />
            <GroupCreateMetadataCard />
            <GroupCreatePermissions />
            <GroupCreateTags />
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
            formId={GROUP_CREATE_FORM_ID}
            isSubmitting={isSubmitting}
            onCancel={handleCancel}
            labelsNamespace="groups"
          />
        ) : undefined
      }
    >
      <div className="p-4">{renderContent()}</div>
    </DashboardLayout>
  );
}
