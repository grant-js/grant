'use client';

import { Search as SearchIcon } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/common';

export interface SearchProps {
  search: string;
  onSearchChange: (search: string) => void;
  placeholder: string;
  debounceDelay?: number;
  className?: string;
}

export function Search({
  search,
  onSearchChange,
  placeholder,
  debounceDelay = 300,
  className = 'pl-8 w-full sm:w-[200px]',
}: SearchProps) {
  const debouncedSearchChange = useDebounce(onSearchChange, debounceDelay);

  const handleChange = (value: string) => {
    debouncedSearchChange(value);
  };

  return (
    <div className="relative w-full">
      <SearchIcon className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder={placeholder}
        defaultValue={search}
        onChange={(e) => handleChange(e.target.value)}
        className={className}
      />
    </div>
  );
}
