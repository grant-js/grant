'use client';

import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { AccountType } from '@logusgraphics/grant-schema';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useCreateComplementaryAccount, useUsernameValidation } from '@/hooks/accounts';

const createComplementaryAccountSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'Account name is required' })
    .min(2, { message: 'Account name must be at least 2 characters' })
    .max(100, { message: 'Account name must be less than 100 characters' }),
  username: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim().length === 0) return true;
        return val.length >= 3 && val.length <= 50 && /^[a-z0-9-]+$/.test(val);
      },
      {
        message:
          'Username must be 3-50 characters and contain only lowercase letters, numbers, and hyphens',
      }
    ),
});

type CreateComplementaryAccountFormValues = z.infer<typeof createComplementaryAccountSchema>;

interface CreateComplementaryAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  complementaryType: AccountType;
}

export function CreateComplementaryAccountDialog({
  open,
  onOpenChange,
  complementaryType,
}: CreateComplementaryAccountDialogProps) {
  const t = useTranslations('settings.account');
  const tCommon = useTranslations('common');
  const tAccountTypes = useTranslations('common.accountTypes');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createComplementaryAccount } = useCreateComplementaryAccount();
  const { isChecking, isAvailable, checkUsername } = useUsernameValidation();

  const form = useForm<CreateComplementaryAccountFormValues>({
    resolver: zodResolver(createComplementaryAccountSchema),
    defaultValues: {
      name: '',
      username: '',
    },
  });

  const currentUsername = form.watch('username');

  const handleUsernameChange = (value: string) => {
    form.setValue('username', value, { shouldDirty: true, shouldValidate: true });

    if (value && value.trim().length >= 3) {
      checkUsername(value);
    }
  };

  const handleSubmit = async (values: CreateComplementaryAccountFormValues) => {
    // Check if username is unavailable before submitting
    if (values.username && values.username.trim().length >= 3 && isAvailable === false) {
      form.setError('username', {
        type: 'manual',
        message: t('information.fields.username.unavailable'),
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await createComplementaryAccount({
        name: values.name,
        username: values.username || null,
      });
      form.reset();
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const accountTypeLabel =
    complementaryType === AccountType.Organization
      ? tAccountTypes('organization')
      : tAccountTypes('personal');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t('type.complementary.dialogTitle', { type: accountTypeLabel })}
          </DialogTitle>
          <DialogDescription>
            {t('type.complementary.dialogDescription', { type: accountTypeLabel })}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('information.fields.name.label')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('information.fields.name.placeholder')}
                      {...field}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>{t('information.fields.name.description')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('information.fields.username.label')}</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <Input
                        placeholder={t('information.fields.username.placeholder')}
                        {...field}
                        onChange={(e) => handleUsernameChange(e.target.value)}
                        disabled={isSubmitting}
                      />
                      {isChecking && currentUsername && currentUsername.length >= 3 && (
                        <p className="text-sm text-muted-foreground">
                          {t('information.fields.username.checking')}
                        </p>
                      )}
                      {isAvailable === true && currentUsername && currentUsername.length >= 3 && (
                        <p className="text-sm text-green-600 dark:text-green-400">
                          {t('information.fields.username.available')}
                        </p>
                      )}
                      {isAvailable === false && currentUsername && currentUsername.length >= 3 && (
                        <p className="text-sm text-destructive">
                          {t('information.fields.username.unavailable')}
                        </p>
                      )}
                    </div>
                  </FormControl>
                  <FormDescription>{t('information.fields.username.description')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  onOpenChange(false);
                }}
                disabled={isSubmitting}
              >
                {tCommon('actions.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting || isAvailable === false}>
                {isSubmitting ? tCommon('actions.creating') : tCommon('actions.create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
