'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { OAUTH_PERMISSIONS_PREVIEW_LIMIT, previewOAuthScopes } from '@/lib/oauth-branding';
import type { ProjectAppScopeInfo } from '@/lib/project-oauth-api';

interface OAuthPermissionsCardProps {
  label: string;
  scopes: ProjectAppScopeInfo[];
}

export function OAuthPermissionsCard({ label, scopes }: OAuthPermissionsCardProps) {
  const t = useTranslations('auth.projectOAuth.permissionsCard');
  const [expanded, setExpanded] = useState(false);
  const hiddenCount = scopes.length - OAUTH_PERMISSIONS_PREVIEW_LIMIT;
  const visibleScopes = previewOAuthScopes(scopes, expanded);

  return (
    <div className="rounded-xl border border-border/80 bg-muted/20 backdrop-blur-sm">
      <p className="px-4 py-2.5 text-sm font-medium text-foreground">{label}</p>
      <Separator />
      <ul className="list-none space-y-3 px-4 py-3">
        {visibleScopes.map((scope) => (
          <li key={scope.slug} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-medium text-foreground">{scope.name}</p>
              {scope.description ? (
                <p className="text-xs text-muted-foreground">{scope.description}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {hiddenCount > 0 ? (
        <>
          <Separator />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full rounded-none rounded-b-xl text-muted-foreground"
            onClick={() => setExpanded((current) => !current)}
          >
            {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            {expanded ? t('showLess') : t('showMore', { count: hiddenCount })}
          </Button>
        </>
      ) : null}
    </div>
  );
}
