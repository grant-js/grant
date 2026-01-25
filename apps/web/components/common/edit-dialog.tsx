'use client';

import { useMemo } from 'react';

import { DefaultValues } from 'react-hook-form';

import { FormDialog, FormDialogProps } from '@/components/common/form-dialog';

export interface EditDialogProps<TFormValues extends Record<string, any>, TEntity> extends Omit<
  FormDialogProps<TFormValues>,
  'onSubmit' | 'resetValues' | 'submittingText' | 'trigger'
> {
  entity: TEntity | null;
  updatingText?: string;
  mapEntityToFormValues: (entity: TEntity) => TFormValues;
  onUpdate: (entityId: string, values: TFormValues) => Promise<any>;
}

export function EditDialog<TFormValues extends Record<string, any>, TEntity>({
  open,
  onOpenChange,
  entity,
  title,
  description,
  confirmText,
  cancelText = 'cancel',
  updatingText = 'updating',
  schema,
  defaultValues,
  fields,
  relationships,
  mapEntityToFormValues,
  onUpdate,
  translationNamespace,
}: EditDialogProps<TFormValues, TEntity>) {
  const resetValues = useMemo((): DefaultValues<TFormValues> => {
    if (entity) {
      const formValues = mapEntityToFormValues(entity);
      return { ...defaultValues, ...formValues };
    }
    return defaultValues;
  }, [entity, mapEntityToFormValues, defaultValues]);

  const handleSubmit = async (values: TFormValues) => {
    if (!entity) return;
    await onUpdate((entity as any).id, values);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      confirmText={confirmText}
      cancelText={cancelText}
      submittingText={updatingText}
      schema={schema}
      defaultValues={defaultValues}
      fields={fields}
      relationships={relationships}
      translationNamespace={translationNamespace}
      onSubmit={handleSubmit}
      resetValues={resetValues}
    />
  );
}
