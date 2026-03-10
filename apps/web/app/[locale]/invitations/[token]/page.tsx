'use client';

import { useMemo, useState } from 'react';

import { useParams } from 'next/navigation';

import { AccountType, OrganizationInvitationStatus } from '@grantjs/schema';
import { AlertTriangle, CheckCircle2, Loader2, Mail, MailCheck, XCircle } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { InfoPanel } from '@/components/common';
import { AuthLayout } from '@/components/layout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePageTitle } from '@/hooks';
import { useAccountsSync } from '@/hooks/accounts';
import { useInvitation, useMemberMutations } from '@/hooks/members';
import { Link } from '@/i18n/navigation';
import { useAuthStore } from '@/stores/auth.store';

type InvitationStatus =
  | 'loading'
  | 'invalid-token'
  | 'expired'
  | 'already-accepted'
  | 'requires-login'
  | 'ready'
  | 'accepting'
  | 'success'
  | 'error';

export default function InvitationPage() {
  const t = useTranslations('invitations');
  const tRoot = useTranslations();
  const params = useParams();
  const locale = useLocale();
  const token = params.token as string;

  const [actionStatus, setActionStatus] = useState<InvitationStatus | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const {
    invitation,
    loading: invitationLoading,
    error: invitationError,
  } = useInvitation({
    token,
  });

  const { acceptInvitation } = useMemberMutations();
  const { isAuthenticated, updateAccounts, setCurrentAccount } = useAuthStore();

  usePageTitle('invitations');
  useAccountsSync();

  const status = useMemo<InvitationStatus>(() => {
    if (actionStatus) {
      return actionStatus;
    }

    if (invitationLoading) {
      return 'loading';
    }

    if (invitationError || !invitation) {
      return 'invalid-token';
    }

    if (new Date(invitation.expiresAt) < new Date()) {
      return 'expired';
    }

    if (invitation.status === OrganizationInvitationStatus.Accepted) {
      return 'already-accepted';
    }

    if (invitation.status === OrganizationInvitationStatus.Revoked) {
      return 'invalid-token';
    }

    if (!isAuthenticated()) {
      return 'requires-login';
    }

    return 'ready';
  }, [actionStatus, invitationLoading, invitationError, invitation, isAuthenticated]);

  const handleAcceptInvitation = async () => {
    if (!token) {
      setActionStatus('invalid-token');
      return;
    }

    setActionStatus('accepting');

    try {
      const result = await acceptInvitation({ token });

      if (result?.requiresRegistration) {
        setActionStatus('requires-login');
        return;
      }

      if (result?.accounts && result.accounts.length > 0) {
        updateAccounts(result.accounts);

        // Switch to Organization account for the org dashboard redirect
        const orgAccount = result.accounts.find((a) => a.type === AccountType.Organization);
        if (orgAccount) {
          setCurrentAccount(orgAccount.id);
        }
      }

      setActionStatus('success');
    } catch (error) {
      setActionStatus('error');
      setErrorMessage(error instanceof Error ? error.message : tRoot('errors.common.unknownError'));
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <Alert>
            <Loader2 className="animate-spin" />
            <AlertTitle>{t('loading')}</AlertTitle>
            <AlertDescription>{t('loadingDescription')}</AlertDescription>
          </Alert>
        );

      case 'invalid-token':
        return (
          <div className="space-y-8">
            <Alert variant="destructive">
              <XCircle />
              <AlertTitle>{t('invalidToken.title')}</AlertTitle>
              <AlertDescription>{t('invalidToken.description')}</AlertDescription>
            </Alert>
            <div>
              <Link href={`/auth/login`}>
                <Button className="w-full" variant="default">
                  {t('invalidToken.goToLogin')}
                </Button>
              </Link>
            </div>
          </div>
        );

      case 'expired':
        return (
          <div className="space-y-8">
            <Alert variant="warning">
              <AlertTriangle />
              <AlertTitle>{t('expired.title')}</AlertTitle>
              <AlertDescription>{t('expired.description')}</AlertDescription>
            </Alert>
            <div>
              <Link href={`/auth/login`}>
                <Button className="w-full" variant="default">
                  {t('expired.goToLogin')}
                </Button>
              </Link>
            </div>
          </div>
        );

      case 'already-accepted':
        return (
          <div className="space-y-8">
            <Alert variant="success">
              <CheckCircle2 />
              <AlertTitle>{t('alreadyAccepted.title')}</AlertTitle>
              <AlertDescription>{t('alreadyAccepted.description')}</AlertDescription>
            </Alert>
            {invitation?.organizationId && (
              <div>
                <Link href={`/dashboard/organizations/${invitation.organizationId}`}>
                  <Button className="w-full" variant="default">
                    {t('alreadyAccepted.goToOrganization')}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        );

      case 'requires-login':
        return (
          <div className="space-y-8">
            {invitation && (
              <div className="flex flex-col gap-6">
                <Alert>
                  <Mail />
                  <AlertTitle>{t('requiresLogin.title')}</AlertTitle>
                  <AlertDescription>{t('requiresLogin.description')}</AlertDescription>
                </Alert>
                <InfoPanel
                  compact
                  rows={[
                    {
                      label: t('details.organization'),
                      value: (
                        <span className="font-semibold text-foreground">
                          {invitation.organization?.name}
                        </span>
                      ),
                    },
                    {
                      label: t('details.role'),
                      value: (
                        <span className="font-semibold text-foreground">
                          {tRoot(invitation.role?.name)}
                        </span>
                      ),
                    },
                    {
                      label: t('details.invitedBy'),
                      value: (
                        <span className="font-semibold text-foreground">
                          {invitation.inviter?.name}
                        </span>
                      ),
                    },
                    {
                      label: t('details.email'),
                      value: (
                        <span className="font-semibold text-foreground">{invitation.email}</span>
                      ),
                    },
                  ]}
                />
                <div className="flex flex-col gap-4">
                  <Link
                    href={`/auth/login?email=${invitation?.email || ''}&redirect=${encodeURIComponent(`/invitations/${token}`)}`}
                  >
                    <Button className="w-full" variant="default">
                      {t('requiresLogin.login')}
                    </Button>
                  </Link>
                  <Link
                    href={`/auth/register?email=${invitation?.email || ''}&redirect=${encodeURIComponent(`/invitations/${token}`)}`}
                  >
                    <Button className="w-full" variant="outline">
                      {t('requiresLogin.register')}
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        );

      case 'ready':
        return (
          <div className="space-y-8">
            {invitation && (
              <>
                <Alert>
                  <MailCheck />
                  <AlertTitle>{t('ready.title')}</AlertTitle>
                  <AlertDescription>{t('ready.description')}</AlertDescription>
                </Alert>
                <InfoPanel
                  compact
                  rows={[
                    {
                      label: t('details.organization'),
                      value: (
                        <span className="font-semibold text-foreground">
                          {invitation.organization?.name}
                        </span>
                      ),
                    },
                    {
                      label: t('details.role'),
                      value: (
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="outline" className="text-sm">
                            {tRoot(invitation.role?.name)}
                          </Badge>
                          {invitation.role?.description && (
                            <span className="text-xs text-muted-foreground">
                              {tRoot(invitation.role.description)}
                            </span>
                          )}
                        </div>
                      ),
                    },
                    {
                      label: t('details.invitedBy'),
                      value: (
                        <span className="font-semibold text-foreground">
                          {invitation.inviter?.name}
                        </span>
                      ),
                    },
                    {
                      label: t('details.createdAt'),
                      value: (
                        <span className="text-muted-foreground">
                          {new Date(invitation.createdAt).toLocaleString(locale, {
                            dateStyle: 'long',
                            timeStyle: 'short',
                          })}
                        </span>
                      ),
                    },
                    {
                      label: t('details.expiresAt'),
                      value: (
                        <span className="text-muted-foreground">
                          {new Date(invitation.expiresAt).toLocaleString(locale, {
                            dateStyle: 'long',
                            timeStyle: 'short',
                          })}
                        </span>
                      ),
                    },
                  ]}
                />
                <div className="flex flex-col gap-4">
                  <Button
                    variant="default"
                    onClick={handleAcceptInvitation}
                    disabled={actionStatus === 'accepting'}
                    className="w-full"
                  >
                    {actionStatus === 'accepting' ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t('accepting')}
                      </>
                    ) : (
                      t('accept')
                    )}
                  </Button>
                  <Link href={`/dashboard`}>
                    <Button className="w-full" variant="outline">
                      {t('decline')}
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </div>
        );

      case 'success':
        return (
          <div className="space-y-8">
            <Alert variant="success">
              <CheckCircle2 />
              <AlertTitle>{t('success.title')}</AlertTitle>
              <AlertDescription>{t('success.description')}</AlertDescription>
            </Alert>
            {invitation?.organizationId && (
              <div>
                <Link href={`/dashboard/organizations/${invitation.organizationId}`}>
                  <Button className="w-full" variant="default">
                    {t('success.goToOrganization')}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        );

      case 'error':
        return (
          <div className="space-y-8">
            <Alert variant="destructive">
              <XCircle />
              <AlertTitle>{t('error.title')}</AlertTitle>
              <AlertDescription>{errorMessage || t('error.description')}</AlertDescription>
            </Alert>
            <div>
              <Button className="w-full" variant="outline" onClick={() => setActionStatus(null)}>
                {t('error.tryAgain')}
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AuthLayout title={t('title')} description={t('description')}>
      {renderContent()}
    </AuthLayout>
  );
}
