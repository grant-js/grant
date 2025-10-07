'use client';

import React, { useState, useRef } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { AccountType } from '@logusgraphics/grant-schema';
import { ChevronDown, Info } from 'lucide-react';
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
import { PasswordInput } from '@/components/ui/password-input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuthMutations, usePageTitle } from '@/hooks';
import { useUsernameValidation } from '@/hooks/accounts/useUsernameValidation';
import { Link } from '@/i18n/navigation';
import { slugifySafe } from '@/lib/slugify';
import {
  passwordPolicySchema,
  getPasswordStrength,
  getPasswordRequirements,
} from '@/lib/validation/password-policy';

export default function RegisterPage() {
  const t = useTranslations('auth');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [usernameManuallySet, setUsernameManuallySet] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  usePageTitle('auth.register');

  const { register: handleRegister } = useAuthMutations();
  const { isChecking, isAvailable, checkUsername } = useUsernameValidation();

  const formSchema = z
    .object({
      name: z.string().min(2, t('validation.name')),
      username: z.string().min(3, t('validation.username')).optional().or(z.literal('')),
      email: z.string().email(t('validation.email')),
      password: passwordPolicySchema,
      confirmPassword: z.string(),
      accountType: z.nativeEnum(AccountType),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('validation.passwordMatch'),
      path: ['confirmPassword'],
    })
    .refine(
      (data) => {
        // If username is provided and we've checked availability, it must be available
        if (data.username && data.username.length >= 3 && isAvailable === false) {
          return false;
        }
        return true;
      },
      {
        message: t('validation.usernameUnique'),
        path: ['username'],
      }
    );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      accountType: AccountType.Personal,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      await handleRegister({
        name: values.name,
        username: values.username || undefined,
        email: values.email,
        password: values.password,
        accountType: values.accountType,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const passwordValue = form.watch('password') || '';
  const passwordStrength = getPasswordStrength(passwordValue);
  const passwordRequirements = getPasswordRequirements();

  // Auto-slugify username when name changes (if username hasn't been manually set)
  const nameValue = form.watch('name');

  React.useEffect(() => {
    if (nameValue && !usernameManuallySet) {
      const slugifiedName = slugifySafe(nameValue);
      form.setValue('username', slugifiedName);

      // Check availability of auto-generated username
      if (slugifiedName.length >= 3) {
        checkUsername(slugifiedName);
      }
    }
  }, [nameValue, usernameManuallySet, form, checkUsername]);

  // Track when user manually changes username
  const handleUsernameChange = (value: string) => {
    setUsernameManuallySet(true);
    form.setValue('username', value);

    // Trigger debounced username availability check
    if (value && value.trim().length >= 3) {
      checkUsername(value);
    }
  };

  // Revalidate form when username availability changes
  React.useEffect(() => {
    if (isAvailable !== null) {
      form.trigger('username');
    }
  }, [isAvailable, form]);

  return (
    <Form {...form}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">{t('register.title')}</h2>
        <p className="text-muted-foreground mt-2">{t('register.description')}</p>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-2">
                {t('form.username.label')}
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center w-4 h-4 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label="Username information"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 z-[99999999]" align="start">
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-medium text-sm">{t('form.username.popover.title')}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {t('form.username.popover.description')}
                        </p>
                      </div>
                      <div className="border-t pt-3">
                        <h4 className="font-medium text-sm">
                          {t('form.username.popover.autoGeneration.title')}
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {t('form.username.popover.autoGeneration.description')}
                        </p>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </FormLabel>
              <FormControl>
                <Input
                  placeholder={t('form.username.placeholder')}
                  disabled={isSubmitting}
                  {...field}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                />
              </FormControl>
              <FormMessage />

              {/* Username Availability Status */}
              {field.value && field.value.length >= 3 && (
                <p className="text-sm">
                  {isChecking ? (
                    <span className="text-muted-foreground">
                      {t('form.username.availability.checking')}
                    </span>
                  ) : isAvailable === true ? (
                    <span className="text-green-600 dark:text-green-400">
                      {t('form.username.availability.available')}
                    </span>
                  ) : null}
                </p>
              )}
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
                <PasswordInput
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
                <PasswordInput
                  placeholder={t('form.confirmPassword.placeholder')}
                  disabled={isSubmitting}
                  {...field}
                />
              </FormControl>
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
