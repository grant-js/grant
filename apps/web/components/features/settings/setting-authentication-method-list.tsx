'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  UserAuthenticationEmailProviderAction,
  UserAuthenticationMethodProvider,
} from '@grantjs/schema';
import { Mail } from 'lucide-react';
import { toast } from 'sonner';

import { OAuthProviderIcon } from '@/components/common/oauth-provider-icon';
import {
  SettingAuthenticationMethodActions,
  SettingCard,
  SettingEmailAuthMethodAddForm,
} from '@/components/features/settings';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyMutations, useMyUserAuthenticationMethods } from '@/hooks/me';
import { getApiBaseUrl } from '@/lib/constants';
import { getSocialOAuthProviders, type SocialOAuthProviderId } from '@/lib/oauth-providers';

import { SettingAuthenticationMethodsListProps } from './setting-types';

export function SettingAuthenticationMethodsList({
  loading: externalLoading,
  onChangePassword,
  onSetPassword,
}: SettingAuthenticationMethodsListProps) {
  const t = useTranslations('settings.security.authenticationMethods');
  const {
    authenticationMethods,
    loading: methodsLoading,
    refetch,
  } = useMyUserAuthenticationMethods();
  const {
    createMyUserAuthenticationMethod,
    deleteMyUserAuthenticationMethod,
    setMyPrimaryAuthenticationMethod,
  } = useMyMutations();
  const loading = externalLoading || methodsLoading;
  const [showAddEmailForm, setShowAddEmailForm] = useState(false);
  const [configuredSocial, setConfiguredSocial] = useState<SocialOAuthProviderId[]>([]);

  useEffect(() => {
    let cancelled = false;
    getSocialOAuthProviders()
      .then((list) => {
        if (!cancelled) setConfiguredSocial(list.map((p) => p.id));
      })
      .catch(() => {
        if (!cancelled) setConfiguredSocial([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const availableProviders: UserAuthenticationMethodProvider[] = [
    UserAuthenticationMethodProvider.Email,
    ...(configuredSocial.includes('github') ? [UserAuthenticationMethodProvider.Github] : []),
    ...(configuredSocial.includes('google') ? [UserAuthenticationMethodProvider.Google] : []),
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

    if (connected === 'github' || connected === 'google') {
      if (success === 'true') {
        toast.success(t(`${connected}Connected`));
      } else if (error) {
        toast.error(t(`${connected}ConnectError`), {
          description: decodeURIComponent(error),
        });
      }

      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      refetch(); // Refresh list - UI will toggle to "Disconnect" state
    }
  }, [refetch, t]);

  const handleConnect = (provider: UserAuthenticationMethodProvider) => {
    if (
      provider === UserAuthenticationMethodProvider.Github ||
      provider === UserAuthenticationMethodProvider.Google
    ) {
      const apiBaseUrl = getApiBaseUrl();
      const urlParams = new URLSearchParams();

      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
      const redirectUrl = `${origin}${pathname}`;

      urlParams.set('action', 'connect');
      urlParams.set('redirect', redirectUrl);

      const authUrl = `${apiBaseUrl}/api/auth/${provider}?${urlParams.toString()}`;
      if (typeof window !== 'undefined') {
        window.location.assign(authUrl);
      }
    } else if (provider === UserAuthenticationMethodProvider.Email) {
      setShowAddEmailForm(true);
    }
  };

  const handleDisconnect = async (methodId: string, isPrimary: boolean, isLastMethod: boolean) => {
    if (isPrimary) {
      toast.error(t('cannotDisconnectPrimary'));
      return;
    }

    if (isLastMethod) {
      toast.error(t('cannotDisconnectLastMethod'));
      return;
    }

    await deleteMyUserAuthenticationMethod(methodId);
    await refetch();
  };

  const handleSetPrimary = async (methodId: string) => {
    await setMyPrimaryAuthenticationMethod(methodId);
    await refetch();
  };

  const handleAddEmailAuthMethod = async (values: {
    email: string;
    password: string;
    confirmPassword: string;
  }) => {
    await createMyUserAuthenticationMethod({
      provider: UserAuthenticationMethodProvider.Email,
      providerId: values.email,
      providerData: {
        password: values.password,
        action: UserAuthenticationEmailProviderAction.Connect,
      },
    });
    setShowAddEmailForm(false);
    await refetch();
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case UserAuthenticationMethodProvider.Email:
        return <Mail className="h-4 w-4" />;
      case UserAuthenticationMethodProvider.Google:
        return <OAuthProviderIcon provider="google" className="h-4 w-4" />;
      case UserAuthenticationMethodProvider.Github:
        return <OAuthProviderIcon provider="github" className="h-4 w-4" />;
      default:
        return <Mail className="h-4 w-4" />;
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
      <SettingCard title={t('title')} description={t('description')}>
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </SettingCard>
    );
  }

  const isLastMethod = authenticationMethods.length === 1;

  return (
    <>
      <SettingCard title={t('title')} description={t('description')}>
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
              <SettingAuthenticationMethodActions
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
                onSetPassword={
                  provider === UserAuthenticationMethodProvider.Email && onSetPassword
                    ? onSetPassword
                    : undefined
                }
              />
            </div>
          ))}
        </div>
      </SettingCard>

      {showAddEmailForm && (
        <SettingEmailAuthMethodAddForm
          onSubmit={handleAddEmailAuthMethod}
          onCancel={() => setShowAddEmailForm(false)}
        />
      )}
    </>
  );
}
