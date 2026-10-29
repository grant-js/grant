'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useGrant, type UseGrantResult } from '@grantjs/client/react';
import { ResourceAction, ResourceSlug } from '@grantjs/constants';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';

import { PasswordInput, PasswordStrengthIndicator } from '@/components/common';
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
  FormField,
  FormItem,
  FormLabel,
  TranslatedFormMessage,
} from '@/components/ui/form';
import { useRequiresEmailVerificationForMutation } from '@/hooks/auth';
import { useScopeFromParams } from '@/hooks/common';
import { useUserMutations } from '@/hooks/users';
import { useUsersStore } from '@/stores/users.store';

import { type SetProjectUserPasswordFormValues, setProjectUserPasswordSchema } from './user-types';

const emptyValues: SetProjectUserPasswordFormValues = { password: '', confirmPassword: '' };

/**
 * Lets an operator set a project user's password. The password lives only in the form
 * state while the dialog is open: the form is cleared on every close and after a
 * successful submit, nothing is put in the store, and no toast repeats the value.
 */
export function UserSetPasswordDialog() {
  const t = useTranslations('users.setPasswordDialog');
  const scope = useScopeFromParams();
  const { setProjectUserPassword } = useUserMutations();
  const userToSetPassword = useUsersStore((state) => state.userToSetPassword);
  const setUserToSetPassword = useUsersStore((state) => state.setUserToSetPassword);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SetProjectUserPasswordFormValues>({
    resolver: zodResolver(setProjectUserPasswordSchema),
    defaultValues: emptyValues,
    mode: 'onSubmit',
    reValidateMode: 'onBlur',
  });

  const passwordValue = useWatch({ control: form.control, name: 'password', defaultValue: '' });

  const isOpen = !!userToSetPassword;

  // Whatever closes the dialog (cancel, escape, overlay, navigating away from the user),
  // the typed values do not survive it.
  useEffect(() => {
    if (!isOpen) {
      form.reset(emptyValues);
    }
  }, [isOpen, form]);

  const { isGranted: canSetPassword, isLoading: isSetPasswordLoading } = useGrant(
    ResourceSlug.ProjectUser,
    ResourceAction.SetPassword,
    { scope: scope!, enabled: isOpen, returnLoading: true }
  ) as UseGrantResult;
  const requiresEmailVerification = useRequiresEmailVerificationForMutation(scope);

  if (!scope || requiresEmailVerification) return null;
  if (!isSetPasswordLoading && !canSetPassword) return null;

  const handleOpenChange = (open: boolean) => {
    if (isSubmitting && !open) return;
    if (!open) {
      form.reset(emptyValues);
      setUserToSetPassword(null);
    }
  };

  const handleSubmit = async (values: SetProjectUserPasswordFormValues) => {
    if (!userToSetPassword) return;
    setIsSubmitting(true);
    try {
      await setProjectUserPassword({
        userId: userToSetPassword.id,
        password: values.password,
        scope,
      });
      form.reset(emptyValues);
      setUserToSetPassword(null);
    } catch {
      // The mutation hook has already shown the error toast. The form keeps the typed
      // values so the operator can correct them and retry.
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-[425px] flex max-h-[calc(100vh-4rem)] flex-col"
        onPointerDownOutside={(event) => isSubmitting && event.preventDefault()}
        onInteractOutside={(event) => isSubmitting && event.preventDefault()}
        onEscapeKeyDown={(event) => isSubmitting && event.preventDefault()}
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex min-h-0 flex-1 flex-col"
            autoComplete="off"
          >
            <div className="flex-1 space-y-4 overflow-y-auto border-t py-4 pr-1">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('password')}</FormLabel>
                    <FormControl>
                      <PasswordInput
                        {...field}
                        autoComplete="new-password"
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <TranslatedFormMessage />
                    <PasswordStrengthIndicator password={passwordValue} />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('confirmPassword')}</FormLabel>
                    <FormControl>
                      <PasswordInput
                        {...field}
                        autoComplete="new-password"
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <TranslatedFormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="flex-shrink-0 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isSubmitting}
              >
                {t('cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? t('updating') : t('confirm')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
