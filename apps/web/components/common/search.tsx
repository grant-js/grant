'use client';

import { useEffect, useRef, useState } from 'react';
import { Search as SearchIcon, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useDebounce } from '@/hooks/common';
import { cn } from '@/lib/utils';

export interface SearchProps {
  search: string;
  onSearchChange: (search: string) => void;
  placeholder: string;
  debounceDelay?: number;
  /** When true, always show compact icon+popover (no full-width bar). Use in compact toolbars e.g. user detail cards. */
  forceCompact?: boolean;
  className?: string;
}

/** Width range where search renders as button + dropdown (frees space for breadcrumbs). Aligns with toolbar “mid” icon-only band (768–1200px). */
const COMPACT_MIN_PX = 768;
const COMPACT_MAX_PX = 1200;

function useMatchesCompactBreakpoint() {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(
      `(min-width: ${COMPACT_MIN_PX}px) and (max-width: ${COMPACT_MAX_PX}px)`
    );
    const listener = () => setMatches(mq.matches);
    mq.addEventListener('change', listener);
    const id = setTimeout(() => setMatches(mq.matches), 0);
    return () => {
      clearTimeout(id);
      mq.removeEventListener('change', listener);
    };
  }, []);

  return matches;
}

export function Search({
  search,
  onSearchChange,
  placeholder,
  debounceDelay = 300,
  forceCompact = false,
  className = 'pl-10 w-full sm:w-[200px]',
}: SearchProps) {
  const [localValue, setLocalValue] = useState(search);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const compactInputRef = useRef<HTMLInputElement>(null);
  const wasFocusedRef = useRef(false);
  const debouncedSearchChange = useDebounce(onSearchChange, debounceDelay);
  const matchesCompactBreakpoint = useMatchesCompactBreakpoint();
  const isCompact = forceCompact || matchesCompactBreakpoint;

  // Sync local value with prop when it changes externally (e.g., from store reset)
  useEffect(() => {
    setLocalValue(search);
  }, [search]);

  // Maintain focus after external updates (e.g., query refetch)
  useEffect(() => {
    const activeRef = isCompact ? compactInputRef : inputRef;
    if (
      wasFocusedRef.current &&
      activeRef.current &&
      document.activeElement !== activeRef.current
    ) {
      activeRef.current.focus();
    }
  });

  const handleChange = (value: string) => {
    setLocalValue(value);
    debouncedSearchChange(value);
  };

  const handleClear = () => {
    setLocalValue('');
    onSearchChange('');
    (isCompact ? compactInputRef : inputRef).current?.focus();
  };

  const handleFocus = () => {
    wasFocusedRef.current = true;
  };

  const handleBlur = () => {
    wasFocusedRef.current = false;
  };

  const hasValue = localValue.length > 0;

  const inputEl = (ref: React.RefObject<HTMLInputElement | null>, fillContainer?: boolean) => (
    <>
      <SearchIcon className="absolute left-4 top-2.5 size-4 text-muted-foreground pointer-events-none z-10" />
      <Input
        ref={ref}
        type="search"
        placeholder={placeholder}
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={cn(
          fillContainer ? 'pl-10 w-full min-w-0 max-w-full' : className,
          !fillContainer && 'min-w-0 max-w-full',
          hasValue && 'pr-8'
        )}
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
    </>
  );

  // Focus search input when compact popover opens
  useEffect(() => {
    if (popoverOpen && isCompact) {
      const t = requestAnimationFrame(() => {
        compactInputRef.current?.focus();
      });
      return () => cancelAnimationFrame(t);
    }
  }, [popoverOpen, isCompact]);

  return (
    <>
      {/* Full search bar: mobile (0–640px) and desktop (1201px+) — hidden when forceCompact */}
      {!forceCompact && (
        <div className="relative w-full hidden max-[640px]:block min-[641px]:max-[767px]:block min-[768px]:max-[1200px]:hidden min-[1201px]:block">
          {inputEl(inputRef)}
        </div>
      )}

      {/* Compact: button + dropdown; when forceCompact show at all breakpoints */}
      <div
        className={
          forceCompact ? 'block' : 'hidden min-[768px]:max-[1200px]:block min-[1201px]:hidden'
        }
      >
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="default"
                  className={cn(
                    forceCompact
                      ? 'size-9 min-w-9 max-w-9 p-2'
                      : 'w-full sm:w-auto sm:size-9 sm:min-w-9 sm:max-w-9 sm:p-2'
                  )}
                  aria-label={placeholder}
                >
                  <SearchIcon className="size-4" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{placeholder}</p>
            </TooltipContent>
          </Tooltip>
          <PopoverContent
            align="end"
            className="w-[min(100vw-2rem,280px)] min-w-[200px] max-w-full overflow-hidden p-2"
          >
            <div
              className="relative min-w-0 w-full overflow-hidden"
              onKeyDown={(e) => e.stopPropagation()}
            >
              {inputEl(compactInputRef, true)}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </>
  );
}
