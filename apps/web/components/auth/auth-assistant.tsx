'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import {
  CheckCircle2,
  Clock,
  Github,
  HelpCircle,
  Inbox,
  KeyRound,
  LogIn,
  type LucideIcon,
  Mail,
  RefreshCw,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';

/** Auth page identifier derived from pathname (e.g. login, register, forgot-password, mfa, verify-email, reset-password, invitations, project OAuth). */
export type AuthPageId =
  | 'login'
  | 'register'
  | 'forgotPassword'
  | 'verifyEmail'
  | 'resetPassword'
  | 'invitation'
  | 'mfa'
  | 'projectEntry'
  | 'projectEmail'
  | 'projectConsent'
  | null;

/** Item keys per page; each key maps to auth.assistant.<pageId>.<key>.title/description */
const ITEMS_BY_PAGE: Record<NonNullable<AuthPageId>, string[]> = {
  login: ['passwordPolicy', 'githubSignIn', 'forgotPassword'],
  register: ['accountType', 'passwordStrength', 'verification'],
  forgotPassword: ['checkInbox', 'noEmail'],
  verifyEmail: ['linkExpiry', 'alreadyUsed', 'checkSpam', 'resendLink'],
  resetPassword: ['linkFromEmail', 'linkExpired', 'strongPassword', 'afterReset'],
  invitation: ['whatIsThis', 'linkExpired', 'alreadyAccepted', 'signInRequired'],
  mfa: ['whyAuthenticator', 'sixDigitCode', 'recoveryCodes', 'troubleshooting'],
  projectEntry: ['whatIsThis', 'requestedScopes', 'trustApp'],
  projectEmail: ['linkFromEmail', 'checkInbox', 'sameEmail'],
  projectConsent: ['reviewPermissions', 'allowOrDeny', 'revokeLater'],
};

/** Icon for each item key (shared across pages where key appears). */
const ITEM_ICONS: Record<string, LucideIcon> = {
  passwordPolicy: KeyRound,
  githubSignIn: Github,
  forgotPassword: Mail,
  accountType: UserPlus,
  passwordStrength: ShieldCheck,
  verification: Mail,
  checkInbox: Inbox,
  noEmail: HelpCircle,
  linkExpiry: Clock,
  alreadyUsed: RefreshCw,
  checkSpam: Inbox,
  resendLink: Mail,
  whatIsThis: Mail,
  linkExpired: Clock,
  alreadyAccepted: CheckCircle2,
  signInRequired: LogIn,
  linkFromEmail: Mail,
  strongPassword: ShieldCheck,
  afterReset: CheckCircle2,
  requestedScopes: ShieldCheck,
  trustApp: ShieldCheck,
  sameEmail: Mail,
  reviewPermissions: ShieldCheck,
  allowOrDeny: CheckCircle2,
  revokeLater: HelpCircle,
  whyAuthenticator: ShieldCheck,
  sixDigitCode: KeyRound,
  recoveryCodes: HelpCircle,
  troubleshooting: RefreshCw,
};

interface AuthAssistantProps {
  pageId: AuthPageId;
  className?: string;
}

/**
 * Renders an accordion of contextual help for the current auth page.
 * Items are chosen from i18n under auth.assistant.<pageId>.<itemKey>.
 */
export function AuthAssistant({ pageId, className }: AuthAssistantProps) {
  const t = useTranslations('auth.assistant');

  const itemKeys = pageId ? (ITEMS_BY_PAGE[pageId] ?? []) : [];
  if (itemKeys.length === 0) {
    return null;
  }

  const firstItemValue = itemKeys[0];

  return (
    <div className={cn('w-full max-w-lg', className)} data-slot="auth-assistant">
      <div className="mb-3 flex w-full items-center justify-center gap-2 text-white/90">
        <HelpCircle className="size-5 shrink-0" aria-hidden />
        <span className="text-sm font-medium">{t('help')}</span>
      </div>
      <div className="rounded-lg border border-border bg-card text-card-foreground shadow-sm">
        <Accordion
          key={pageId ?? 'none'}
          type="single"
          collapsible
          defaultValue={firstItemValue}
          className="w-full"
        >
          {itemKeys.map((key) => {
            const titleKey = `${pageId}.${key}.title`;
            const descKey = `${pageId}.${key}.description`;
            let title: string;
            let description: string;
            try {
              title = t(titleKey);
              description = t(descKey);
            } catch {
              return null;
            }
            const Icon = ITEM_ICONS[key];
            return (
              <AccordionItem
                key={key}
                value={key}
                className="border-border px-5 first:rounded-t-lg last:rounded-b-lg"
              >
                <AccordionTrigger className="py-5 text-left font-semibold hover:no-underline [&[data-state=open]>svg]:rotate-180">
                  <span className="flex items-center gap-2">
                    {Icon && <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden />}
                    {title}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {description}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </div>
  );
}
