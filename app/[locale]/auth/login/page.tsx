'use client';

import { useSearchParams, useParams } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { gql, useMutation } from '@apollo/client';
import { useTranslations } from 'next-intl';
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
import { toast } from '@/components/ui/toast';
import { setStoredToken } from '@/lib/auth';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
    }
  }
`;

export default function LoginPage() {
  const t = useTranslations('auth');
  const searchParams = useSearchParams();
  const params = useParams();
  const locale = params.locale as string;
  const from = searchParams.get('from') || '/dashboard';

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onSubmit',
  });

  const [login] = useMutation(LOGIN_MUTATION);

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const { data } = await login({
        variables: {
          input: {
            email: values.email,
            password: values.password,
          },
        },
      });

      if (data?.login?.token) {
        setStoredToken(data.login.token);
        toast.success(t('login.success'));
        const redirectTo = from.startsWith(`/${locale}`) ? from : `/${locale}${from}`;
        window.location.href = redirectTo;
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error(t('login.error'), {
        description: error instanceof Error ? error.message : t('login.errorUnknown'),
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">{t('login.title')}</h1>
        <p className="text-gray-500">{t('login.description')}</p>
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
                    type="email"
                    placeholder={t('login.emailPlaceholder')}
                    {...field}
                    className={form.formState.errors.email ? 'border-red-500' : ''}
                  />
                </FormControl>
                {form.formState.errors.email && (
                  <FormMessage className="text-red-500 text-sm mt-1">
                    {t('login.emailError')}
                  </FormMessage>
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
                  <Input
                    type="password"
                    placeholder={t('login.passwordPlaceholder')}
                    {...field}
                    className={form.formState.errors.password ? 'border-red-500' : ''}
                  />
                </FormControl>
                {form.formState.errors.password && (
                  <FormMessage className="text-red-500 text-sm mt-1">
                    {t('login.passwordError')}
                  </FormMessage>
                )}
              </FormItem>
            )}
          />
          <div>
            <Link
              href={{
                pathname: `/${locale}/auth/forgot-password`,
              }}
              className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400"
            >
              {t('login.forgotPassword')}
            </Link>
          </div>
          <Button type="submit" className="w-full">
            {t('login.submit')}
          </Button>
        </form>
      </Form>
      <div className="text-sm">
        {t('login.noAccount')}{' '}
        <Link
          href={{
            pathname: `/${locale}/auth/register`,
          }}
          className="text-blue-600 hover:text-blue-500 dark:text-blue-400"
        >
          {t('login.register')}
        </Link>
      </div>
    </div>
  );
}
