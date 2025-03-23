import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useRef, useEffect } from 'react';

interface UserSearchProps {
  search: string;
  onSearchChange: (search: string) => void;
}

export function UserSearch({ search, onSearchChange }: UserSearchProps) {
  const t = useTranslations('users');
  const timeoutRef = useRef<NodeJS.Timeout>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleChange = (value: string) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set a new timeout to trigger onSearchChange after 300ms
    timeoutRef.current = setTimeout(() => {
      onSearchChange(value);
    }, 300);
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
