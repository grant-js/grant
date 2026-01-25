'use client';

import { useRef, useState } from 'react';

import { useSearchParams } from 'next/navigation';

import { AccountType } from '@grantjs/schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import {
  FullPageLoader,
  GithubOAuthButton,
  PasswordInput,
  PasswordStrengthIndicator,
} from '@/components/common';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuthMutations, usePageTitle } from '@/hooks';
import { Link } from '@/i18n/navigation';
import { passwordPolicySchema } from '@/lib/validation/password-policy';

export default function RegisterPage() {
  const t = useTranslations('auth');
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthSuccess, setIsAuthSuccess] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  usePageTitle('auth.register');

  const redirectParam = searchParams.get('redirect');
  const emailParam = searchParams.get('email');

  const isInvitationRedirect = redirectParam?.includes('/invitations/');

  const defaultAccountType = isInvitationRedirect ? AccountType.Organization : AccountType.Personal;

  const { register: handleRegister } = useAuthMutations();

  const formSchema = z.object({
    email: z.email(t('validation.email')),
    password: passwordPolicySchema,
    accountType: z.enum(Object.values(AccountType) as [AccountType, ...AccountType[]]),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: emailParam || '',
      password: '',
      accountType: defaultAccountType,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      await handleRegister({
        email: values.email,
        password: values.password,
        accountType: values.accountType,
      });
      setIsAuthSuccess(true);
    } catch {
      setIsSubmitting(false);
    }
  };

  const passwordValue = form.watch('password') || '';

  if (isAuthSuccess) {
    return <FullPageLoader />;
  }

  const accountTypeValue = form.watch('accountType');

  return (
    <Form {...form}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">{t('register.title')}</h2>
        <p className="text-muted-foreground mt-2">{t('register.description')}</p>
      </div>
      <div className="mb-4">
        <FormField
          control={form.control}
          name="accountType"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                {t('form.accountType.label')}
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center w-4 h-4 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Account type information"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 z-[99999999]" align="start">
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium text-sm">
                          {t('form.accountType.explanations.personal.title')}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {t('form.accountType.explanations.personal.description')}
                        </p>
                      </div>
                      <div className="border-t pt-3">
                        <h4 className="font-medium text-sm">
                          {t('form.accountType.explanations.organization.title')}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {t('form.accountType.explanations.organization.description')}
                        </p>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </FormLabel>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <FormControl>
                    <Button
                      ref={buttonRef}
                      variant="outline"
                      className="w-full justify-between"
                      disabled={isSubmitting}
                    >
                      {field.value === AccountType.Personal
                        ? t('form.accountType.options.personal')
                        : field.value === AccountType.Organization
                          ? t('form.accountType.options.organization')
                          : t('form.accountType.placeholder')}
                      <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="min-w-full"
                  style={{ width: buttonRef.current?.offsetWidth + 'px' }}
                >
                  <DropdownMenuItem onClick={() => field.onChange(AccountType.Personal)}>
                    {t('form.accountType.options.personal')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => field.onChange(AccountType.Organization)}>
                    {t('form.accountType.options.organization')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      <div className="relative mb-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">{t('github.signUpWith')}</span>
        </div>
      </div>
      <GithubOAuthButton className="w-full mb-4" accountType={accountTypeValue} />
      <div className="relative mb-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">{t('github.or')}</span>
        </div>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.email.label')}</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder={t('form.email.placeholder')}
                  disabled={isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.password.label')}</FormLabel>
              <FormControl>
                <PasswordInput
                  placeholder={t('form.password.placeholder')}
                  disabled={isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormMessage />

              <PasswordStrengthIndicator password={passwordValue} />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? t('register.submitting') : t('register.submit')}
        </Button>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('register.haveAccount')}{' '}
          <Link
            href={`/auth/login${redirectParam || emailParam ? `?${new URLSearchParams({ ...(redirectParam && { redirect: redirectParam }), ...(emailParam && { email: emailParam }) }).toString()}` : ''}`}
            className="text-primary hover:text-primary/80"
          >
            {t('register.login')}
          </Link>
        </p>
      </form>
    </Form>
  );
}
