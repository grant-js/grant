'use client';

import {
  UserAuthenticationMethod,
  UserAuthenticationMethodProvider,
} from '@logusgraphics/grant-schema';
import { KeyRound, Lock, Shield, Unlink } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Actions, ActionItem } from '@/components/common';

interface AuthenticationMethodActionsProps {
  method: UserAuthenticationMethod | null;
  provider: UserAuthenticationMethodProvider;
  isPrimary: boolean;
  isLastMethod: boolean;
  isConnected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onSetPrimary: () => void;
  onChangePassword?: () => void;
}

export function AuthenticationMethodActions({
  method,
  provider,
  isPrimary,
  isLastMethod,
  isConnected,
  onConnect,
  onDisconnect,
  onSetPrimary,
  onChangePassword,
}: AuthenticationMethodActionsProps) {
  const t = useTranslations('settings.security.authenticationMethods');

  const actions: ActionItem<{ id: string }>[] = [];

  if (!isConnected) {
    // Connect action
    actions.push({
      key: 'connect',
      label: t('connect'),
      icon: <Shield className="mr-2 h-4 w-4" />,
      onClick: onConnect,
    });
  } else if (method) {
    // Set as Primary (only if not already primary)
    if (!isPrimary) {
      actions.push({
        key: 'setPrimary',
        label: t('setAsPrimary'),
        icon: <KeyRound className="mr-2 h-4 w-4" />,
        onClick: onSetPrimary,
      });
    }

    // Change Password (only for email provider)
    if (provider === UserAuthenticationMethodProvider.Email && onChangePassword) {
      actions.push({
        key: 'changePassword',
        label: t('changePassword'),
        icon: <Lock className="mr-2 h-4 w-4" />,
        onClick: onChangePassword,
      });
    }

    // Disconnect (only if not primary and not last method)
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

  // If no actions available, return null
  if (actions.length === 0) {
    return null;
  }

  return <Actions entity={{ id: method?.id || provider }} actions={actions} />;
}
