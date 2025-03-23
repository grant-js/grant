import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDownIcon } from 'lucide-react';

interface UserLimitProps {
  limit: number;
  onLimitChange: (limit: number) => void;
}

const PAGE_SIZES = [10, 20, 50, 100];

export function UserLimit({ limit, onLimitChange }: UserLimitProps) {
  const t = useTranslations('users');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="default" className="w-full sm:w-auto">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {t('limit')}: {limit}
            </div>
            <ChevronDownIcon className="size-4" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {PAGE_SIZES.map((size) => (
          <DropdownMenuItem
            key={size}
            onClick={() => onLimitChange(size)}
            className="cursor-pointer"
          >
            {size}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
