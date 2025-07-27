'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface GroupPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function GroupPagination({ currentPage, totalPages, onPageChange }: GroupPaginationProps) {
  const t = useTranslations('groups');

  const handlePreviousPage = () => {
    onPageChange(currentPage - 1);
  };

  const handleNextPage = () => {
    onPageChange(currentPage + 1);
  };

  return (
    <div className="flex items-center justify-between px-4 py-2">
      <div className="text-sm text-muted-foreground">
        {t('pagination.info', { current: currentPage, total: totalPages })}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handlePreviousPage}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="size-4" />
          <span className="sr-only">{t('pagination.previous')}</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleNextPage}
          disabled={currentPage >= totalPages}
        >
          <span className="sr-only">{t('pagination.next')}</span>
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
