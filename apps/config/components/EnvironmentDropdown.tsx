'use client';

import { useEffect, useRef, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { ChevronDown } from 'lucide-react';

import type { EnvEnvironment } from '@/lib/env-files';

const ENV_OPTIONS: { value: EnvEnvironment; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'demo', label: 'Demo' },
  { value: 'test', label: 'Test' },
];

function parseEnvironment(value: string | null): EnvEnvironment {
  if (value === 'demo' || value === 'test') return value;
  return 'default';
}

export function EnvironmentDropdown() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = parseEnvironment(searchParams.get('env'));
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLabel = ENV_OPTIONS.find((o) => o.value === current)?.label ?? 'Default';

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as Node)) return;
      setIsOpen(false);
    };
    const id = setTimeout(() => document.addEventListener('mousedown', handleClick), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [isOpen]);

  const selectOption = (env: EnvEnvironment) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('env', env);
    router.replace(`?${params.toString()}`, { scroll: false });
    setIsOpen(false);
  };

  return (
    <div className="env-dropdown-wrap">
      <span className="env-dropdown-label">Environment:</span>
      <div
        ref={containerRef}
        className={`custom-select env-dropdown ${isOpen ? 'custom-select-open' : ''}`}
        data-custom-select="env"
      >
        <button
          type="button"
          className="custom-select-trigger"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-label="Select environment file"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          title="Which root .env file to view and edit"
        >
          <span className="custom-select-value">{currentLabel}</span>
          <ChevronDown size={16} className="custom-select-chevron" aria-hidden />
        </button>
        {isOpen && (
          <div
            className="custom-select-dropdown"
            role="listbox"
            aria-label="Select environment file"
          >
            {ENV_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="option"
                className="custom-select-option"
                aria-selected={current === opt.value}
                onClick={() => selectOption(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
