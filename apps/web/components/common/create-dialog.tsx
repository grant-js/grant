'use client';

import { LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { FormDialog, FormDialogProps } from '@/components/common/form-dialog';
import { Button } from '@/components/ui/button';
import { DialogTrigger } from '@/components/ui/dialog';

export interface CreateDialogProps<TFormValues extends Record<string, any>> extends Omit<
  FormDialogProps<TFormValues>,
  'trigger' | 'onSubmit'
> {
  triggerText: string;
  icon: LucideIcon;
  onCreate: (values: TFormValues) => Promise<void>;
}

export function CreateDialog<TFormValues extends Record<string, any>>({
  open,
  onOpenChange,
  title,
  description,
  triggerText,
  confirmText,
  cancelText = 'cancel',
  icon: Icon,
  schema,
  defaultValues,
  fields,
  relationships,
  onCreate,
  translationNamespace,
  submittingText,
}: CreateDialogProps<TFormValues>) {
  const t = useTranslations(translationNamespace);

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      confirmText={confirmText}
      cancelText={cancelText}
      submittingText={submittingText || 'actions.creating'}
      schema={schema}
      defaultValues={defaultValues}
      fields={fields}
      relationships={relationships}
      translationNamespace={translationNamespace}
      onSubmit={onCreate}
      trigger={
        <DialogTrigger asChild>
          <Button>
            <Icon className="size-4" />
            {t(triggerText)}
          </Button>
        </DialogTrigger>
      }
    />
  );
}
