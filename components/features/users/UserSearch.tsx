import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useDebounce } from '@/hooks/common';

interface UserSearchProps {
  search: string;
  onSearchChange: (search: string) => void;
}

export function UserSearch({ search, onSearchChange }: UserSearchProps) {
  const t = useTranslations('users');
  const debouncedSearchChange = useDebounce(onSearchChange, 300);

  const handleChange = (value: string) => {
    debouncedSearchChange(value);
  };

  return (
    <div className="relative w-full">
      <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder={t('search.placeholder')}
        defaultValue={search}
        onChange={(e) => handleChange(e.target.value)}
        className="pl-8 w-full sm:w-[200px]"
      />
    </div>
  );
}
