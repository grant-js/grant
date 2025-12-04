'use client';

import { useEffect, useState } from 'react';

import { UserAuthenticationMethodProvider } from '@logusgraphics/grant-schema';
import { Github, Mail, Shield } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { AddEmailAuthMethodForm } from '@/components/settings/AddEmailAuthMethodForm';
import { AuthenticationMethodActions } from '@/components/settings/AuthenticationMethodActions';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserAuthenticationMethodMutations } from '@/hooks/users/useUserAuthenticationMethodMutations';
import { useUserAuthenticationMethods } from '@/hooks/users/useUserAuthenticationMethods';
import { getApiBaseUrl } from '@/lib/constants';

interface AuthenticationMethodsListProps {
  userId: string;
  loading?: boolean;
  onChangePassword?: () => void;
}

export function AuthenticationMethodsList({
  userId,
  loading: externalLoading,
  onChangePassword,
}: AuthenticationMethodsListProps) {
  const t = useTranslations('settings.security.authenticationMethods');
  const {
    authenticationMethods,
    loading: methodsLoading,
    refetch,
  } = useUserAuthenticationMethods(userId);
  const { createEmailAuthenticationMethod, deleteAuthenticationMethod, setPrimaryMethod } =
    useUserAuthenticationMethodMutations(userId);
  const loading = externalLoading || methodsLoading;
  const [showAddEmailForm, setShowAddEmailForm] = useState(false);

  // Available providers
  const availableProviders: UserAuthenticationMethodProvider[] = [
    UserAuthenticationMethodProvider.Email,
    UserAuthenticationMethodProvider.Github,
  ];

  // Show all providers, mark which ones are connected
  const providerStatus = availableProviders.map((provider) => {
    const method = authenticationMethods.find((m) => m.provider === provider);
    return {
      provider,
      connected: !!method,
      method,
      isPrimary: method?.isPrimary || false,
    };
  });

  // Handle OAuth callback result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected');
    const success = params.get('success');
    const error = params.get('error');

    if (connected === 'github') {
      if (success === 'true') {
        toast.success(t('githubConnected'));
      } else if (error) {
        toast.error(t('githubConnectError'), {
          description: decodeURIComponent(error),
        });
      }

      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      refetch(); // Refresh list - UI will toggle to "Disconnect" state
    }
  }, [refetch, t]);

  const handleConnect = (provider: UserAuthenticationMethodProvider) => {
    if (provider === UserAuthenticationMethodProvider.Github) {
      // Redirect to OAuth initiation endpoint with connect=true
      const apiBaseUrl = getApiBaseUrl();
      const urlParams = new URLSearchParams();

      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
      const redirectUrl = `${origin}${pathname}`;

      urlParams.set('action', 'connect');
      urlParams.set('redirect', redirectUrl);

      const githubAuthUrl = `${apiBaseUrl}/api/auth/github?${urlParams.toString()}`;
      if (typeof window !== 'undefined') {
        window.location.assign(githubAuthUrl);
      }
    } else if (provider === UserAuthenticationMethodProvider.Email) {
      setShowAddEmailForm(true);
    }
  };

  const handleDisconnect = async (methodId: string, isPrimary: boolean, isLastMethod: boolean) => {
    await deleteAuthenticationMethod(methodId, isPrimary, isLastMethod);
  };

  const handleSetPrimary = async (methodId: string) => {
    await setPrimaryMethod(methodId);
  };

  const handleAddEmailAuthMethod = async (values: {
    email: string;
    password: string;
    confirmPassword: string;
  }) => {
    await createEmailAuthenticationMethod(values.email, values.password);
    setShowAddEmailForm(false);
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case UserAuthenticationMethodProvider.Email:
        return <Mail className="h-4 w-4" />;
      case UserAuthenticationMethodProvider.Google:
        return <Shield className="h-4 w-4" />;
      case UserAuthenticationMethodProvider.Github:
        return <Github className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getProviderLabel = (provider: string) => {
    switch (provider) {
      case UserAuthenticationMethodProvider.Email:
        return t('providers.email');
      case UserAuthenticationMethodProvider.Google:
        return t('providers.google');
      case UserAuthenticationMethodProvider.Github:
        return t('providers.github');
      default:
        return provider;
    }
  };

  if (loading) {
    return (
      <SettingsCard title={t('title')} description={t('description')}>
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </SettingsCard>
    );
  }

  const isLastMethod = authenticationMethods.length === 1;

  return (
    <>
      <SettingsCard title={t('title')} description={t('description')}>
        <div className="space-y-4">
          {providerStatus.map(({ provider, connected, method, isPrimary }) => (
            <div key={provider} className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  {getProviderIcon(provider)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{getProviderLabel(provider)}</span>
                    {connected && isPrimary && (
                      <Badge variant="default" className="text-xs">
                        {t('primary')}
                      </Badge>
                    )}
                    {connected && method?.isVerified ? (
                      <Badge variant="secondary" className="text-xs">
                        {t('verified')}
                      </Badge>
                    ) : connected ? (
                      <Badge variant="outline" className="text-xs">
                        {t('unverified')}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        {t('notConnected')}
                      </Badge>
                    )}
                  </div>
                  {connected && method ? (
                    <>
                      <p className="text-sm text-muted-foreground">{method.providerId}</p>
                      {method.lastUsedAt && (
                        <p className="text-xs text-muted-foreground">
                          {t('lastUsed')}: {new Date(method.lastUsedAt).toLocaleDateString()}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('notConnected')}</p>
                  )}
                </div>
              </div>
              <AuthenticationMethodActions
                method={method || null}
                provider={provider}
                isPrimary={isPrimary}
                isLastMethod={isLastMethod}
                isConnected={connected}
                onConnect={() => handleConnect(provider)}
                onDisconnect={() => {
                  if (method) {
                    handleDisconnect(method.id, isPrimary, isLastMethod);
                  }
                }}
                onSetPrimary={() => {
                  if (method) {
                    handleSetPrimary(method.id);
                  }
                }}
                onChangePassword={
                  provider === UserAuthenticationMethodProvider.Email && onChangePassword
                    ? onChangePassword
                    : undefined
                }
              />
            </div>
          ))}
        </div>
      </SettingsCard>

      {showAddEmailForm && (
        <AddEmailAuthMethodForm
          onSubmit={handleAddEmailAuthMethod}
          onCancel={() => setShowAddEmailForm(false)}
        />
      )}
    </>
  );
}
