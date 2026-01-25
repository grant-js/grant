'use client';

import { useState } from 'react';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useForm, useWatch } from 'react-hook-form';
import * as z from 'zod';

import { PasswordInput, PasswordStrengthIndicator } from '@/components/common';
import { AuthLayout } from '@/components/layout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useAuthMutations, usePageTitle } from '@/hooks';
import { passwordPolicySchema } from '@/lib/validation/password-policy';

type ResetPasswordStatus = 'form' | 'submitting' | 'success' | 'error' | 'invalid-token';

export default function ResetPasswordPage() {
  const t = useTranslations('auth');
  const params = useParams();
  const locale = params.locale as string;
  const searchParams = useSearchParams();
  const { resetPassword } = useAuthMutations();
  usePageTitle('auth.resetPassword');

  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState<ResetPasswordStatus>(token ? 'form' : 'invalid-token');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const formSchema = z
    .object({
      password: passwordPolicySchema,
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('validation.passwordMatch'),
      path: ['confirmPassword'],
    });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!token) {
      setStatus('invalid-token');
      return;
    }

    setStatus('submitting');

    try {
      await resetPassword(token, values.password);
      setStatus('success');
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred');
    }
  };

  const passwordValue = useWatch({
    control: form.control,
    name: 'password',
    defaultValue: '',
  });

  const renderContent = () => {
    switch (status) {
      case 'invalid-token':
        return (
          <div className="space-y-8">
            <Alert variant="destructive">
              <XCircle />
              <AlertTitle>{t('resetPassword.invalidToken.title')}</AlertTitle>
              <AlertDescription>{t('resetPassword.invalidToken.description')}</AlertDescription>
            </Alert>
            <div>
              <Link href={`/${locale}/auth/forgot-password`}>
                <Button className="w-full">{t('resetPassword.requestNewLink')}</Button>
              </Link>
            </div>
          </div>
        );

      case 'success':
        return (
          <div className="space-y-8">
            <Alert variant="success">
              <CheckCircle2 />
              <AlertTitle>{t('resetPassword.success.title')}</AlertTitle>
              <AlertDescription>{t('resetPassword.success.description')}</AlertDescription>
            </Alert>
            <div>
              <Link href={`/${locale}/auth/login`}>
                <Button className="w-full">{t('resetPassword.continueToLogin')}</Button>
              </Link>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="space-y-8">
            <Alert variant="destructive">
              <XCircle />
              <AlertTitle>{t('resetPassword.error.title')}</AlertTitle>
              <AlertDescription>
                {errorMessage || t('resetPassword.error.description')}
              </AlertDescription>
            </Alert>
            <div>
              <Link href={`/${locale}/auth/forgot-password`}>
                <Button className="w-full">{t('resetPassword.tryAgain')}</Button>
              </Link>
            </div>
          </div>
        );

      case 'form':
      case 'submitting':
        return (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('form.password.label')}</FormLabel>
                    <FormControl>
                      <PasswordInput
                        placeholder={t('form.password.placeholder')}
                        disabled={status === 'submitting'}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                    <PasswordStrengthIndicator password={passwordValue} />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('form.confirmPassword.label')}</FormLabel>
                    <FormControl>
                      <PasswordInput
                        placeholder={t('form.confirmPassword.placeholder')}
                        disabled={status === 'submitting'}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={status === 'submitting'}>
                {status === 'submitting'
                  ? t('resetPassword.submitting')
                  : t('resetPassword.submit')}
              </Button>
              <p className="text-sm text-center text-gray-600 dark:text-gray-400">
                {t('resetPassword.rememberPassword')}{' '}
                <Link href={`/${locale}/auth/login`} className="text-primary hover:text-primary/80">
                  {t('resetPassword.backToLogin')}
                </Link>
              </p>
            </form>
          </Form>
        );

      default:
        return null;
    }
  };

  return (
    <AuthLayout title={t('resetPassword.title')} description={t('resetPassword.description')}>
      {renderContent()}
    </AuthLayout>
  );
}
