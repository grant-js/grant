'use client';

import { LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { FormDialog, FormDialogProps } from '@/components/common/form-dialog';
import { Button } from '@/components/ui/button';
import { DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface CreateDialogProps<TFormValues extends Record<string, any>> extends Omit<
  FormDialogProps<TFormValues>,
  'trigger' | 'onSubmit'
> {
  triggerText: string;
  icon: LucideIcon;
  onCreate: (values: TFormValues) => Promise<void>;
  /** When true, no trigger is rendered; dialog is opened only via open/onOpenChange (e.g. from a switcher). */
  hideTrigger?: boolean;
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
  hideTrigger = false,
}: CreateDialogProps<TFormValues>) {
  const t = useTranslations(translationNamespace);

  const trigger = hideTrigger ? null : (
    <Tooltip>
      <TooltipTrigger asChild>
        <DialogTrigger asChild>
          <Button
            className={cn(
              'w-full sm:w-auto',
              'sm:max-[1200px]:size-9 sm:max-[1200px]:min-w-9 sm:max-[1200px]:max-w-9 sm:max-[1200px]:p-2',
              'min-[1201px]:size-auto min-[1201px]:min-w-0 min-[1201px]:max-w-none'
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className="hidden max-sm:inline min-[1201px]:inline">{t(triggerText)}</span>
          </Button>
        </DialogTrigger>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>{t(triggerText)}</p>
      </TooltipContent>
    </Tooltip>
  );

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
      trigger={trigger}
    />
  );
}
