'use client';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { getAvailableTagColors } from '@grantjs/constants';
import { Tag } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DefaultValues } from 'react-hook-form';

import {
  CreateDialog,
  DialogField,
  DialogRelationship,
  TagCheckboxList,
  TagCheckboxListProps,
} from '@/components/common';
import { useRequiresEmailVerificationForMutation } from '@/hooks/auth';
import { useScopeFromParams } from '@/hooks/common';
import { useTagMutations, useTags } from '@/hooks/tags';
import { useTagsStore } from '@/stores/tags.store';

import { TagCreateFormValues, createTagSchema } from './tag-types';

export function TagCreateDialog() {
  const t = useTranslations('tags');
  const scope = useScopeFromParams();
  const { loading: tagsLoading } = useTags({ scope: scope!, limit: -1 });
  const { handleCreateTag } = useTagMutations();
  const isCreateDialogOpen = useTagsStore((state) => state.isCreateDialogOpen);
  const setCreateDialogOpen = useTagsStore((state) => state.setCreateDialogOpen);

  const canCreate = useGrant(ResourceSlug.Tag, ResourceAction.Create, {
    scope: scope!,
  });
  const requiresEmailVerification = useRequiresEmailVerificationForMutation(scope);

  if (!scope || !canCreate || requiresEmailVerification) {
    return null;
  }

  const availableColors = getAvailableTagColors();
  const colorItems = availableColors.map((color) => ({
    id: color,
    name: color,
    color: color,
  }));

  const fields: DialogField[] = [
    {
      name: 'name',
      label: 'form.name',
      placeholder: 'form.namePlaceholder',
      type: 'text',
      required: true,
    },
  ];

  const defaultValues: DefaultValues<TagCreateFormValues> = {
    name: '',
    color: '',
  };

  const relationships: DialogRelationship[] = [
    {
      name: 'color',
      label: 'form.color',
      renderComponent: (props: TagCheckboxListProps) => (
        <TagCheckboxList
          {...props}
          items={colorItems}
          multiple={false}
          loading={tagsLoading}
          loadingText={t('colorPicker.loadingColors')}
          emptyText={t('colorPicker.noColorsAvailable')}
        />
      ),
      items: colorItems,
      loading: tagsLoading,
      loadingText: 'colorPicker.loadingColors',
      emptyText: 'colorPicker.noColorsAvailable',
    },
  ];

  const handleCreate = async (values: TagCreateFormValues) => {
    await handleCreateTag({
      name: values.name,
      color: values.color,
      scope: scope!,
    });
  };

  const handleOpenChange = (open: boolean) => {
    setCreateDialogOpen(open);
  };

  return (
    <CreateDialog
      open={isCreateDialogOpen}
      icon={Tag}
      schema={createTagSchema}
      defaultValues={defaultValues}
      fields={fields}
      relationships={relationships}
      title="createDialog.title"
      description="createDialog.description"
      triggerText="createDialog.trigger"
      confirmText="createDialog.confirm"
      cancelText="createDialog.cancel"
      translationNamespace="tags"
      submittingText="createDialog.submitting"
      onCreate={handleCreate}
      onOpenChange={handleOpenChange}
    />
  );
}
