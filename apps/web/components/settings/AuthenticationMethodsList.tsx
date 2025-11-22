'use client';

import { Mail, Shield, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { SettingsCard } from '@/components/settings/SettingsCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { UserAuthenticationMethod } from '@logusgraphics/grant-schema';

interface AuthenticationMethodsListProps {
  methods: UserAuthenticationMethod[];
  loading: boolean;
  onChangePassword?: () => void;
}

export function AuthenticationMethodsList({
  methods,
  loading,
  onChangePassword,
}: AuthenticationMethodsListProps) {
  const t = useTranslations('settings.security.authenticationMethods');

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'google':
        return <Shield className="h-4 w-4" />;
      case 'github':
        return <Shield className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getProviderLabel = (provider: string) => {
    switch (provider) {
      case 'email':
        return t('providers.email');
      case 'google':
        return t('providers.google');
      case 'github':
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

  if (methods.length === 0) {
    return (
      <SettingsCard title={t('title')} description={t('description')}>
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      </SettingsCard>
    );
  }

  return (
    <SettingsCard title={t('title')} description={t('description')}>
      <div className="space-y-4">
        {methods.map((method) => (
          <div key={method.id} className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                {getProviderIcon(method.provider)}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{getProviderLabel(method.provider)}</span>
                  {method.isPrimary && (
                    <Badge variant="secondary" className="text-xs">
                      {t('primary')}
                    </Badge>
                  )}
                  {method.isVerified ? (
                    <Badge variant="default" className="text-xs">
                      <ShieldCheck className="mr-1 h-3 w-3" />
                      {t('verified')}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      {t('unverified')}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{method.providerId}</p>
                {method.lastUsedAt && (
                  <p className="text-xs text-muted-foreground">
                    {t('lastUsed')}: {new Date(method.lastUsedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {method.provider === 'email' && onChangePassword && (
                <Button variant="outline" size="sm" onClick={onChangePassword}>
                  {t('changePassword')}
                </Button>
              )}
              {method.provider !== 'email' && (
                <Button variant="outline" size="sm" disabled>
                  {t('connect')}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </SettingsCard>
  );
}
