'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

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
import { usePageTitle } from '@/hooks';
import { Link } from '@/i18n/navigation';

export default function ForgotPasswordPage() {
  const t = useTranslations('auth');
  usePageTitle('auth.forgotPassword');

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
    // TODO: Implement password recovery logic
    console.log(values);
  };

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
        <Button type="submit" className="w-full">
          {t('forgotPassword.submit')}
        </Button>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {t('forgotPassword.rememberPassword')}{' '}
          <Link href="/auth/login" className="text-blue-600 hover:text-blue-500 dark:text-blue-400">
            {t('forgotPassword.backToLogin')}
          </Link>
        </p>
      </form>
    </Form>
  );
}
