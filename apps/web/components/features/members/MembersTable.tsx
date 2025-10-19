'use client';

import { OrganizationInvitationStatus } from '@logusgraphics/grant-schema';
import { Ban, Mail, MailCheck, UserCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Avatar } from '@/components/common/Avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MemberWithInvitation } from '@/hooks/members';

interface MembersTableProps {
  members: MemberWithInvitation[];
  loading: boolean;
  onRevokeInvitation: (id: string, email: string) => void;
}

export function MembersTable({ members, loading, onRevokeInvitation }: MembersTableProps) {
  const t = useTranslations('members');

  const getStatusBadge = (status?: OrganizationInvitationStatus) => {
    if (!status) return null;

    const config = {
      [OrganizationInvitationStatus.Pending]: {
        variant: 'secondary' as const,
        icon: Mail,
        label: t('status.pending'),
      },
      [OrganizationInvitationStatus.Accepted]: {
        variant: 'default' as const,
        icon: MailCheck,
        label: t('status.accepted'),
      },
      [OrganizationInvitationStatus.Expired]: {
        variant: 'destructive' as const,
        icon: Ban,
        label: t('status.expired'),
      },
      [OrganizationInvitationStatus.Revoked]: {
        variant: 'outline' as const,
        icon: Ban,
        label: t('status.revoked'),
      },
    };

    const { variant, icon: Icon, label } = config[status];

    return (
      <Badge variant={variant}>
        <Icon className="mr-1 h-3 w-3" />
        {label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]"></TableHead>
              <TableHead>{t('table.name')}</TableHead>
              <TableHead>{t('table.status')}</TableHead>
              <TableHead>{t('table.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                </TableCell>
                <TableCell>
                  <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                </TableCell>
                <TableCell>
                  <div className="h-6 w-20 animate-pulse rounded bg-muted" />
                </TableCell>
                <TableCell>
                  <div className="h-8 w-20 animate-pulse rounded bg-muted" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center">
        <UserCheck className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-medium">{t('empty.title')}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{t('empty.description')}</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]"></TableHead>
            <TableHead>{t('table.name')}</TableHead>
            <TableHead>{t('table.status')}</TableHead>
            <TableHead className="text-right">{t('table.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.id}>
              <TableCell>
                <Avatar initial={member.name.charAt(0)} size="md" />
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">{member.name}</span>
                  {member.email && member.type === 'invitation' && (
                    <span className="text-xs text-muted-foreground">{member.email}</span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {member.type === 'member' ? (
                  <Badge variant="default">
                    <UserCheck className="mr-1 h-3 w-3" />
                    {t('status.active')}
                  </Badge>
                ) : (
                  getStatusBadge(member.status)
                )}
              </TableCell>
              <TableCell className="text-right">
                {member.type === 'invitation' &&
                  member.status === OrganizationInvitationStatus.Pending && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRevokeInvitation(member.id, member.email!)}
                    >
                      {t('actions.revoke')}
                    </Button>
                  )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
