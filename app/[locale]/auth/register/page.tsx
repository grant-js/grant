'use client';

import { useState, useRef } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown } from 'lucide-react';
import { useParams, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

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
import { AccountType } from '@/graphql/generated/types';
import { useAuthMutations, usePageTitle } from '@/hooks';
import { Link } from '@/i18n/navigation';
import { setStoredTokens } from '@/lib/auth';
import {
  passwordPolicySchema,
  getPasswordStrength,
  getPasswordRequirements,
} from '@/lib/validation/password-policy';

export default function RegisterPage() {
  const t = useTranslations('auth');
  const searchParams = useSearchParams();
  const params = useParams();
  const locale = params.locale as string;
  const from = searchParams.get('from') || '/dashboard';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  usePageTitle('auth.register');

  const { register: handleRegister } = useAuthMutations();

  const formSchema = z
    .object({
      name: z.string().min(2, t('validation.name')),
      email: z.string().email(t('validation.email')),
      password: passwordPolicySchema,
      confirmPassword: z.string(),
      accountType: z.nativeEnum(AccountType),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('validation.passwordMatch'),
      path: ['confirmPassword'],
    });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      accountType: AccountType.Personal,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const data = await handleRegister({
        name: values.name,
        email: values.email,
        password: values.password,
        accountType: values.accountType,
      });

      if (data?.accessToken && data?.refreshToken) {
        setStoredTokens(data.accessToken, data.refreshToken);
        const redirectTo = from.startsWith(`/${locale}`) ? from : `/${locale}${from}`;
        window.location.href = redirectTo;
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordValue = form.watch('password') || '';
  const passwordStrength = getPasswordStrength(passwordValue);
  const passwordRequirements = getPasswordRequirements();

  return (
    <Form {...form}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">{t('register.title')}</h2>
        <p className="text-muted-foreground mt-2">{t('register.description')}</p>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.name.label')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('form.name.placeholder')}
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
                <Input
                  type="password"
                  placeholder={t('form.password.placeholder')}
                  disabled={isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormMessage />

              {/* Password Strength Indicator */}
              {passwordValue && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Strength:</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map((bar) => (
                        <div
                          key={bar}
                          className={`h-2 w-8 rounded transition-colors ${
                            passwordStrength.score >= bar * 2
                              ? passwordStrength.strength === 'weak'
                                ? 'bg-red-500'
                                : passwordStrength.strength === 'fair'
                                  ? 'bg-yellow-500'
                                  : passwordStrength.strength === 'good'
                                    ? 'bg-blue-500'
                                    : 'bg-green-500'
                              : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                        />
                      ))}
                    </div>
                    <span
                      className={`text-sm font-medium capitalize ${
                        passwordStrength.strength === 'weak'
                          ? 'text-red-600'
                          : passwordStrength.strength === 'fair'
                            ? 'text-yellow-600'
                            : passwordStrength.strength === 'good'
                              ? 'text-blue-600'
                              : 'text-green-600'
                      }`}
                    >
                      {passwordStrength.strength}
                    </span>
                  </div>

                  {/* Password Requirements */}
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Password must have:</p>
                    <ul className="text-sm space-y-1">
                      {passwordRequirements.map((requirement, index) => {
                        const isMet = Object.values(passwordStrength.checks)[index];
                        return (
                          <li
                            key={index}
                            className={`flex items-center gap-2 ${
                              isMet ? 'text-green-600' : 'text-gray-500'
                            }`}
                          >
                            <span className={isMet ? 'text-green-500' : 'text-gray-400'}>
                              {isMet ? '✓' : '○'}
                            </span>
                            {requirement}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              )}
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
                <Input
                  type="password"
                  placeholder={t('form.confirmPassword.placeholder')}
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
          name="accountType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.accountType.label')}</FormLabel>
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
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? t('register.submitting') : t('register.submit')}
        </Button>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('register.haveAccount')}{' '}
          <Link href="/auth/login" className="text-blue-600 hover:text-blue-500 dark:text-blue-400">
            {t('register.login')}
          </Link>
        </p>
      </form>
    </Form>
  );
}
