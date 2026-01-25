'use client';

import { useState } from 'react';

import { AlertCircle, LogOut, Monitor, Smartphone, Tablet } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { RefreshButton, Search, Toolbar, Pagination } from '@/components/common';
import { SettingCard } from '@/components/features/settings';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useMeStore } from '@/stores/me.store';

import { SettingActiveSessionsListProps } from './setting-types';

const getDeviceIcon = (userAgent?: string | null) => {
  if (!userAgent) return <Monitor className="h-4 w-4" />;

  const ua = userAgent.toLowerCase();
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return <Smartphone className="h-4 w-4" />;
  }
  if (ua.includes('tablet') || ua.includes('ipad')) {
    return <Tablet className="h-4 w-4" />;
  }
  return <Monitor className="h-4 w-4" />;
};

const parseUserAgent = (userAgent?: string | null) => {
  if (!userAgent) return 'Unknown device';

  // Simple parsing - could be enhanced with a library like ua-parser-js
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';

  return 'Unknown browser';
};

export function SettingActiveSessionsList({
  sessions,
  loading,
  currentSessionId,
  onRevokeSession,
  onRefresh,
  totalCount,
  limit,
}: SettingActiveSessionsListProps) {
  const t = useTranslations('settings.security.activeSessions');
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);

  const page = useMeStore((state) => state.sessionsPage);
  const search = useMeStore((state) => state.sessionsSearch);
  const setPage = useMeStore((state) => state.setSessionsPage);
  const setSearch = useMeStore((state) => state.setSessionsSearch);

  const totalPages = Math.ceil(totalCount / limit);
  const showPagination = totalCount > limit;

  const handleRevoke = async (sessionId: string) => {
    setRevokingSessionId(sessionId);
    try {
      await onRevokeSession(sessionId);
    } finally {
      setRevokingSessionId(null);
    }
  };

  const searchComponent = (
    <Toolbar
      items={[
        <RefreshButton key="refresh" onRefresh={onRefresh} loading={loading} />,
        <Search
          key="search"
          search={search}
          onSearchChange={setSearch}
          placeholder={t('search.placeholder')}
        />,
      ]}
    />
  );

  if (loading) {
    return (
      <SettingCard
        title={t('title')}
        description={t('description')}
        headerActions={searchComponent}
      >
        <div className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </SettingCard>
    );
  }

  const activeSessions = sessions.filter((session) => new Date(session.expiresAt) > new Date());
  const expiredSessions = sessions.filter((session) => new Date(session.expiresAt) <= new Date());

  return (
    <SettingCard
      title={t('title')}
      description={t('description')}
      headerActions={searchComponent}
      footer={
        showPagination ? (
          <div className="w-full">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
        ) : (
          <>
            {activeSessions.length > 0 && (
              <div className="space-y-3">
                {activeSessions.map((session) => {
                  const isCurrentSession = session.id === currentSessionId;
                  const isExpired = new Date(session.expiresAt) <= new Date();

                  return (
                    <div
                      key={session.id}
                      className={`flex items-center justify-between rounded-lg border p-4 ${
                        isCurrentSession ? 'border-primary bg-primary/5' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                          {getDeviceIcon(session.userAgent)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{parseUserAgent(session.userAgent)}</span>
                            {isCurrentSession && (
                              <span className="text-xs text-primary">{t('currentSession')}</span>
                            )}
                            {isExpired && (
                              <span className="text-xs text-muted-foreground">{t('expired')}</span>
                            )}
                          </div>
                          {session.ipAddress && (
                            <p className="text-sm text-muted-foreground">
                              {t('ipAddress')}: {session.ipAddress}
                            </p>
                          )}
                          {session.lastUsedAt && (
                            <p className="text-xs text-muted-foreground">
                              {t('lastUsed')}: {new Date(session.lastUsedAt).toLocaleString()}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {t('expiresAt')}: {new Date(session.expiresAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={revokingSessionId === session.id}
                            >
                              <LogOut className="mr-2 h-4 w-4" />
                              {t('revoke')}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {isCurrentSession
                                  ? t('revokeCurrentSessionTitle')
                                  : t('revokeConfirmTitle')}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {isCurrentSession
                                  ? t('revokeCurrentSessionDescription')
                                  : t('revokeConfirmDescription')}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRevoke(session.id)}
                                disabled={revokingSessionId === session.id}
                                variant={isCurrentSession ? 'destructive' : 'default'}
                              >
                                {t('revoke')}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {expiredSessions.length > 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {t('expiredSessionsCount', { count: expiredSessions.length })}
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </div>
    </SettingCard>
  );
}
