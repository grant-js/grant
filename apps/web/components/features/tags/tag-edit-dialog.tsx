'use client';

import { useGrant } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { getAvailableTagColors } from '@grantjs/constants';
import { Tag } from '@grantjs/schema';
import { useTranslations } from 'next-intl';
import { DefaultValues } from 'react-hook-form';

import {
  DialogField,
  DialogRelationship,
  EditDialog,
  TagCheckboxList,
  TagCheckboxListProps,
} from '@/components/common';
import { useRequiresEmailVerificationForMutation } from '@/hooks/auth';
import { useScopeFromParams } from '@/hooks/common';
import { useTagMutations, useTags } from '@/hooks/tags';
import { useTagsStore } from '@/stores/tags.store';

import { TagEditFormValues, editTagSchema } from './tag-types';

export function TagEditDialog() {
  const t = useTranslations('tags');
  const scope = useScopeFromParams();
  const { tags, loading: tagsLoading } = useTags({ scope: scope!, limit: -1 });
  const tagToEdit = useTagsStore((state) => state.tagToEdit);
  const setTagToEdit = useTagsStore((state) => state.setTagToEdit);
  const { handleUpdateTag } = useTagMutations();

  const canUpdate = useGrant(ResourceSlug.Tag, ResourceAction.Update, {
    scope: scope!,
    context: tagToEdit
      ? { resource: { id: tagToEdit.id, scope: { tags: [tagToEdit.id] } } }
      : undefined,
  });
  const requiresEmailVerification = useRequiresEmailVerificationForMutation(scope);

  if (!scope || !canUpdate || requiresEmailVerification) {
    return null;
  }

  const usedColors = tags.map((tag) => tag.color);
  const availableColors = getAvailableTagColors();

  const colorItems: Partial<Tag>[] = availableColors.map((color) => ({
    id: color,
    name: color,
    color: color,
    disabled: usedColors.includes(color) && color !== tagToEdit?.color,
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

  const defaultValues: DefaultValues<TagEditFormValues> = {
    name: tagToEdit?.name || '',
    color: tagToEdit?.color || '',
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

  const mapTagToFormValues = (tag: Tag): TagEditFormValues => ({
    name: tag.name,
    color: tag.color,
  });

  const handleUpdate = async (tagId: string, values: TagEditFormValues) => {
    await handleUpdateTag({
      id: tagId,
      input: {
        scope: scope!,
        name: values.name,
        color: values.color,
      },
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setTagToEdit(null);
    }
  };

  return (
    <EditDialog
      entity={tagToEdit}
      open={!!tagToEdit}
      schema={editTagSchema}
      defaultValues={defaultValues}
      fields={fields}
      relationships={relationships}
      title="editDialog.title"
      description="editDialog.description"
      confirmText="editDialog.confirm"
      cancelText="editDialog.cancel"
      translationNamespace="tags"
      updatingText="editDialog.updating"
      mapEntityToFormValues={mapTagToFormValues}
      onUpdate={handleUpdate}
      onOpenChange={handleOpenChange}
    />
  );
}
