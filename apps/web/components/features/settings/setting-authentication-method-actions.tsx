'use client';

import { UserAuthenticationMethodProvider } from '@grantjs/schema';
import { KeyRound, Lock, Shield, Unlink } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ActionItem, Actions } from '@/components/common';

import { SettingAuthenticationMethodActionsProps } from './setting-types';

export function SettingAuthenticationMethodActions({
  method,
  provider,
  isPrimary,
  isLastMethod,
  isConnected,
  onConnect,
  onDisconnect,
  onSetPrimary,
  onChangePassword,
}: SettingAuthenticationMethodActionsProps) {
  const t = useTranslations('settings.security.authenticationMethods');

  const actions: ActionItem<{ id: string }>[] = [];

  if (!isConnected) {
    actions.push({
      key: 'connect',
      label: t('connect'),
      icon: <Shield className="mr-2 h-4 w-4" />,
      onClick: onConnect,
    });
  } else if (method) {
    if (!isPrimary) {
      actions.push({
        key: 'setPrimary',
        label: t('setAsPrimary'),
        icon: <KeyRound className="mr-2 h-4 w-4" />,
        onClick: onSetPrimary,
      });
    }

    if (provider === UserAuthenticationMethodProvider.Email && onChangePassword) {
      actions.push({
        key: 'changePassword',
        label: t('changePassword'),
        icon: <Lock className="mr-2 h-4 w-4" />,
        onClick: onChangePassword,
      });
    }

    if (!isPrimary && !isLastMethod) {
      actions.push({
        key: 'disconnect',
        label: t('disconnect'),
        icon: <Unlink className="mr-2 h-4 w-4" />,
        onClick: onDisconnect,
        variant: 'destructive',
      });
    }
  }

  if (actions.length === 0) {
    return null;
  }

  return <Actions entity={{ id: method?.id || provider }} actions={actions} />;
}
