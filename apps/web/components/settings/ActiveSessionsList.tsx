'use client';

import { useState } from 'react';

import { AlertCircle, LogOut, Monitor, Smartphone, Tablet } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { SettingsCard } from '@/components/settings/SettingsCard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
import { UserSession } from '@logusgraphics/grant-schema';

interface ActiveSessionsListProps {
  sessions: UserSession[];
  loading: boolean;
  currentSessionId?: string;
  onRevokeSession: (sessionId: string) => Promise<void>;
}

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

export function ActiveSessionsList({
  sessions,
  loading,
  currentSessionId,
  onRevokeSession,
}: ActiveSessionsListProps) {
  const t = useTranslations('settings.security.activeSessions');
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);

  const handleRevoke = async (sessionId: string) => {
    setRevokingSessionId(sessionId);
    try {
      await onRevokeSession(sessionId);
    } finally {
      setRevokingSessionId(null);
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

  if (sessions.length === 0) {
    return (
      <SettingsCard title={t('title')} description={t('description')}>
        <p className="text-sm text-muted-foreground">{t('empty')}</p>
      </SettingsCard>
    );
  }

  const activeSessions = sessions.filter((session) => new Date(session.expiresAt) > new Date());
  const expiredSessions = sessions.filter((session) => new Date(session.expiresAt) <= new Date());

  return (
    <SettingsCard title={t('title')} description={t('description')}>
      <div className="space-y-4">
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
      </div>
    </SettingsCard>
  );
}
