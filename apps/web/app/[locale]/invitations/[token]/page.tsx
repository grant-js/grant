'use client';

import { useEffect, useMemo, useState } from 'react';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import { OrganizationInvitationStatus } from '@logusgraphics/grant-schema';
import { AlertTriangle, CheckCircle2, Loader2, Mail, MailCheck, XCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { InfoPanel } from '@/components/common';
import { AuthPageLayout } from '@/components/layout/AuthPageLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usePageTitle } from '@/hooks';
import { useInvitation } from '@/hooks/members/useInvitation';
import { useMemberMutations } from '@/hooks/members/useMemberMutations';
import { useAuthStore } from '@/stores/auth.store';

type InvitationStatus =
  | 'loading'
  | 'invalid-token'
  | 'expired'
  | 'already-accepted'
  | 'requires-login'
  | 'requires-org-account'
  | 'ready'
  | 'accepting'
  | 'success'
  | 'error';

export default function InvitationPage() {
  const t = useTranslations('invitations');
  const params = useParams();
  const router = useRouter();
  const locale = params.locale as string;
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
  const { isAuthenticated, getCurrentOrganizationAccount } = useAuthStore();

  usePageTitle('invitations');

  // Derive status from query state and user auth state
  const status = useMemo<InvitationStatus>(() => {
    // Use action status if set (for accepting, success, error states)
    if (actionStatus) {
      return actionStatus;
    }

    // Loading state
    if (invitationLoading) {
      return 'loading';
    }

    // Error or no invitation
    if (invitationError || !invitation) {
      return 'invalid-token';
    }

    // Check if invitation is expired
    if (new Date(invitation.expiresAt) < new Date()) {
      return 'expired';
    }

    // Check if invitation is already accepted
    if (invitation.status === OrganizationInvitationStatus.Accepted) {
      return 'already-accepted';
    }

    // Check if invitation is revoked
    if (invitation.status === OrganizationInvitationStatus.Revoked) {
      return 'invalid-token';
    }

    // User not logged in
    if (!isAuthenticated()) {
      return 'requires-login';
    }

    // User logged in but with personal account
    const orgAccount = getCurrentOrganizationAccount();
    if (!orgAccount) {
      return 'requires-org-account';
    }

    // User logged in with organization account - ready to accept
    return 'ready';
  }, [
    actionStatus,
    invitationLoading,
    invitationError,
    invitation,
    isAuthenticated,
    getCurrentOrganizationAccount,
  ]);

  // Handle redirect on success
  useEffect(() => {
    if (status === 'success' && invitation?.organizationId) {
      const timer = setTimeout(() => {
        router.push(`/${locale}/dashboard/organizations/${invitation.organizationId}`);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status, invitation?.organizationId, locale, router]);

  const handleAcceptInvitation = async () => {
    if (!token) {
      setActionStatus('invalid-token');
      return;
    }

    setActionStatus('accepting');

    try {
      const result = await acceptInvitation({ token });

      if (result?.requiresRegistration) {
        // User needs to register first
        setActionStatus('requires-login');
        return;
      }

      setActionStatus('success');
    } catch (error) {
      setActionStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'An unknown error occurred');
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
              <Link href={`/${locale}/auth/login`}>
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
              <Link href={`/${locale}/auth/login`}>
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
                <Link href={`/${locale}/dashboard/organizations/${invitation.organizationId}`}>
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
                          {invitation.role?.name}
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
                    href={`/${locale}/auth/login?email=${invitation?.email || ''}&redirect=${encodeURIComponent(`/${locale}/invitations/${token}`)}`}
                  >
                    <Button className="w-full" variant="default">
                      {t('requiresLogin.login')}
                    </Button>
                  </Link>
                  <Link
                    href={`/${locale}/auth/register?email=${invitation?.email || ''}&redirect=${encodeURIComponent(`/${locale}/invitations/${token}`)}`}
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

      case 'requires-org-account':
        return (
          <div className="space-y-8">
            <Alert variant="warning">
              <AlertTriangle />
              <AlertTitle>{t('requiresOrgAccount.title')}</AlertTitle>
              <AlertDescription>{t('requiresOrgAccount.description')}</AlertDescription>
            </Alert>
            {invitation && (
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
                      <span className="font-semibold text-foreground">{invitation.role?.name}</span>
                    ),
                  },
                ]}
              />
            )}
            <div>
              <Link href={`/${locale}/auth/login`}>
                <Button className="w-full" variant="default">
                  {t('requiresOrgAccount.switchAccount')}
                </Button>
              </Link>
            </div>
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
                            {invitation.role?.name}
                          </Badge>
                          {invitation.role?.description && (
                            <span className="text-xs text-muted-foreground">
                              {invitation.role.description}
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
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    variant="default"
                    onClick={handleAcceptInvitation}
                    disabled={actionStatus === 'accepting'}
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
                  <Link href={`/${locale}/dashboard`}>
                    <Button className="flex-1" variant="outline">
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
              <AlertDescription>
                {t('success.description')}
                <p className="text-xs text-muted-foreground mt-2">{t('success.redirecting')}</p>
              </AlertDescription>
            </Alert>
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
    <AuthPageLayout title={t('title')} description={t('description')}>
      {renderContent()}
    </AuthPageLayout>
  );
}
