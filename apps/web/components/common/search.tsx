'use client';

import { useState, useEffect, useRef } from 'react';

import { Search as SearchIcon, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/common';
import { cn } from '@/lib/utils';

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
  const [localValue, setLocalValue] = useState(search);
  const inputRef = useRef<HTMLInputElement>(null);
  const wasFocusedRef = useRef(false);
  const debouncedSearchChange = useDebounce(onSearchChange, debounceDelay);

  // Sync local value with prop when it changes externally (e.g., from store reset)
  useEffect(() => {
    setLocalValue(search);
  }, [search]);

  // Maintain focus after external updates (e.g., query refetch)
  useEffect(() => {
    if (wasFocusedRef.current && inputRef.current && document.activeElement !== inputRef.current) {
      inputRef.current.focus();
    }
  });

  const handleChange = (value: string) => {
    setLocalValue(value);
    debouncedSearchChange(value);
  };

  const handleClear = () => {
    setLocalValue('');
    onSearchChange('');
    inputRef.current?.focus();
  };

  const handleFocus = () => {
    wasFocusedRef.current = true;
  };

  const handleBlur = () => {
    wasFocusedRef.current = false;
  };

  const hasValue = localValue.length > 0;

  return (
    <div className="relative w-full">
      <SearchIcon className="absolute left-2 top-2.5 size-4 text-muted-foreground pointer-events-none z-10" />
      <Input
        ref={inputRef}
        type="search"
        placeholder={placeholder}
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={cn(className, hasValue && 'pr-8')}
      />
      {hasValue && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0 top-0 h-full px-2 py-0 hover:bg-transparent"
          onClick={handleClear}
          aria-label="Clear search"
        >
          <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
        </Button>
      )}
    </div>
  );
}
