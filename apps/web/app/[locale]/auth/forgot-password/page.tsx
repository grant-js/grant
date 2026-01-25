'use client';

import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

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
import { Input } from '@/components/ui/input';
import { useAuthMutations, usePageTitle } from '@/hooks';
import { Link } from '@/i18n/navigation';

export default function ForgotPasswordPage() {
  const t = useTranslations('auth');
  const { requestPasswordReset } = useAuthMutations();
  usePageTitle('auth.forgotPassword');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const formSchema = z.object({
    email: z.string().email(t('validation.email')),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      await requestPasswordReset(values.email);
      setIsSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="mx-auto max-w-md space-y-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">{t('forgotPassword.title')}</h2>
          <p className="text-muted-foreground mt-2">{t('forgotPassword.description')}</p>
        </div>
        <Alert variant="success">
          <CheckCircle2 />
          <AlertTitle>{t('forgotPassword.emailSent')}</AlertTitle>
          <AlertDescription>{t('forgotPassword.emailSentDescription')}</AlertDescription>
        </Alert>
        <div className="space-y-2">
          <Link href="/auth/login" className="block">
            <Button className="w-full">{t('forgotPassword.backToLogin')}</Button>
          </Link>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              setIsSuccess(false);
              form.reset();
            }}
          >
            {t('forgotPassword.sendAnother')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">{t('forgotPassword.title')}</h2>
        <p className="text-muted-foreground mt-2">{t('forgotPassword.description')}</p>
      </div>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('form.email.label')}</FormLabel>
              <FormControl>
                <Input type="email" placeholder={t('form.email.placeholder')} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? t('forgotPassword.submitting') : t('forgotPassword.submit')}
        </Button>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('forgotPassword.rememberPassword')}{' '}
          <Link href="/auth/login" className="text-primary hover:text-primary/80">
            {t('forgotPassword.backToLogin')}
          </Link>
        </p>
      </form>
    </Form>
  );
}
