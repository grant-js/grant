'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  const t = useTranslations('common');

  const handlePreviousPage = () => {
    onPageChange(page - 1);
  };

  const handleNextPage = () => {
    onPageChange(page + 1);
  };

  return (
    <div className="flex items-center justify-between px-4 py-2">
      <div className="text-sm text-muted-foreground">
        {t('pagination.info', { current: page, total: totalPages })}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handlePreviousPage} disabled={page <= 1}>
          <ChevronLeft className="size-4" />
          <span className="sr-only">{t('pagination.previous')}</span>
        </Button>
        <Button variant="outline" size="sm" onClick={handleNextPage} disabled={page >= totalPages}>
          <span className="sr-only">{t('pagination.next')}</span>
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
