'use client';

import { useMemo, useState } from 'react';

import { useSearchParams } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { useLocale, useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

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
import { Link } from '@/i18n/navigation';
import { getApiBaseUrl } from '@/lib/constants';

type FormValues = { email: string };

export default function ProjectOAuthEmailPage() {
  const t = useTranslations('auth.projectOAuth.email');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const state = searchParams.get('state');
  const clientState = searchParams.get('client_state');
  const scopeParam = searchParams.get('scope');

  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const schema = useMemo(
    () =>
      z.object({
        email: z.email(t('invalidEmail')).min(1, t('emailRequired')),
      }),
    [t]
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
    mode: 'onSubmit',
  });

  const onSubmit = async (values: FormValues) => {
    if (!clientId || !redirectUri) {
      setError(t('missingParams'));
      return;
    }
    setError(null);
    try {
      const apiBase = getApiBaseUrl();
      const res = await fetch(`${apiBase}/api/auth/project/email/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          redirect_uri: redirectUri,
          ...(state?.trim() && { state: state.trim() }),
          email: values.email,
          ...(clientState && { client_state: clientState }),
          ...(scopeParam?.trim() && { scope: scopeParam.trim() }),
          locale,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
          details?: string;
          message?: string;
        };
        const message = data.details ?? data.error ?? data.message ?? t('requestFailed');
        throw new Error(message);
      }
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('somethingWentWrong'));
    }
  };

  if (!clientId || !redirectUri) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-destructive">{t('missingParams')}</p>
        <Link href="/auth/login">
          <Button variant="outline">{t('backToLogin')}</Button>
        </Link>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">{t('checkEmailTitle')}</h1>
        <p className="text-muted-foreground">{t('checkEmailDescription')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('emailLabel')}</FormLabel>
                <FormControl>
                  <Input type="email" placeholder={t('emailPlaceholder')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? t('sending') : t('sendLink')}
          </Button>
        </form>
      </Form>
    </div>
  );
}
