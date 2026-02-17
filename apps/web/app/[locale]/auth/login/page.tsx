'use client';

import { useMemo, useState } from 'react';

import { useSearchParams } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { FullPageLoader, GithubOAuthButton, PasswordInput } from '@/components/common';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  TranslatedFormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuthMutations, usePageTitle } from '@/hooks';
import { Link, useRouter } from '@/i18n/navigation';
import { getAuthRedirectUrl } from '@/lib/redirect';

const loginSchema = z.object({
  email: z.email('errors.validation.invalidEmail'),
  password: z.string().min(6, 'errors.validation.passwordMin6'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const t = useTranslations('auth');
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthSuccess, setIsAuthSuccess] = useState(false);
  usePageTitle('auth.login');

  const redirectParam = searchParams.get('redirect');
  const emailParam = searchParams.get('email');

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: emailParam || '',
      password: '',
    },
    mode: 'onSubmit',
  });

  const router = useRouter();
  const { login } = useAuthMutations();

  const registerUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (redirectParam) params.set('redirect', redirectParam);
    if (emailParam) params.set('email', emailParam);
    const queryString = params.toString();
    return `/auth/register${queryString ? `?${queryString}` : ''}`;
  }, [redirectParam, emailParam]);

  const onSubmit = async (values: LoginFormValues) => {
    setIsSubmitting(true);
    try {
      await login({
        email: values.email,
        password: values.password,
      });
      setIsAuthSuccess(true);
      router.push(getAuthRedirectUrl() ?? '/dashboard');
    } catch {
      setIsSubmitting(false);
    }
  };

  if (isAuthSuccess) {
    return <FullPageLoader />;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{t('login.title')}</h1>
        <p className="text-gray-500">{t('login.description')}</p>
      </div>
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">{t('github.signInWith')}</span>
        </div>
      </div>
      <GithubOAuthButton className="w-full" />
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">{t('github.or')}</span>
        </div>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('login.email')}</FormLabel>
                <FormControl>
                  <Input
                    disabled={isSubmitting}
                    type="email"
                    placeholder={t('login.emailPlaceholder')}
                    {...field}
                    className={form.formState.errors.email ? 'border-destructive' : ''}
                  />
                </FormControl>
                {form.formState.errors.email && (
                  <TranslatedFormMessage className="text-destructive text-sm mt-1">
                    {t('login.emailError')}
                  </TranslatedFormMessage>
                )}
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('login.password')}</FormLabel>
                <FormControl>
                  <PasswordInput
                    disabled={isSubmitting}
                    placeholder={t('login.passwordPlaceholder')}
                    {...field}
                    className={form.formState.errors.password ? 'border-destructive' : ''}
                  />
                </FormControl>
                {form.formState.errors.password && (
                  <TranslatedFormMessage className="text-destructive text-sm mt-1">
                    {t('login.passwordError')}
                  </TranslatedFormMessage>
                )}
              </FormItem>
            )}
          />
          <div>
            <Link
              href={`/auth/forgot-password`}
              className="text-sm text-primary hover:text-primary/80"
            >
              {t('login.forgotPassword')}
            </Link>
          </div>
          <Button disabled={isSubmitting} type="submit" className="w-full">
            {t('login.submit')}
          </Button>
        </form>
      </Form>
      <div className="text-sm">
        {t('login.noAccount')}{' '}
        <Link href={registerUrl} className="text-primary hover:text-primary/80">
          {t('login.register')}
        </Link>
      </div>
    </div>
  );
}
