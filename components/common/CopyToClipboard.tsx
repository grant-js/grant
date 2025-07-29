'use client';

import { useState } from 'react';

import { Copy, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CopyToClipboardProps {
  text: string;
  className?: string;
  size?: 'sm' | 'lg' | 'default' | 'icon';
  variant?: 'ghost' | 'outline' | 'default';
  showText?: boolean;
  children?: React.ReactNode;
  showToast?: boolean;
}

export function CopyToClipboard({
  text,
  className,
  size = 'sm',
  variant = 'ghost',
  showText = false,
  children,
  showToast = true,
}: CopyToClipboardProps) {
  const [copied, setCopied] = useState(false);
  const t = useTranslations('common');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);

      if (showToast) {
        toast.success(t('copy.success'));
      }

      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);

      if (showToast) {
        toast.error(t('copy.error'));
      }
    }
  };

  const iconSize = {
    sm: 'h-3 w-3',
    lg: 'h-5 w-5',
    default: 'h-4 w-4',
    icon: 'h-4 w-4',
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleCopy}
      className={cn('transition-all duration-200 p-1 h-auto w-auto min-w-0', className)}
      title={copied ? t('copy.copied') : t('copy.title')}
    >
      {copied ? <Check className={iconSize[size]} /> : <Copy className={iconSize[size]} />}
      {showText && <span className="ml-2">{copied ? t('copy.copied') : t('copy.action')}</span>}
      {children}
    </Button>
  );
}
