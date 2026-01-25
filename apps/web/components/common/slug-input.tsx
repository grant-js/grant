'use client';

import { ComponentProps, useEffect, useRef, useState } from 'react';

import { Input } from '@/components/ui/input';
import { slugifySafe } from '@/lib/slugify';

interface SlugInputProps extends Omit<ComponentProps<typeof Input>, 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
  autoSlugifyFrom?: string;
  onAutoSlugify?: (slug: string) => void;
}

export function SlugInput({
  value = '',
  onChange,
  autoSlugifyFrom,
  onAutoSlugify,
  ...props
}: SlugInputProps) {
  const [isManuallyEdited, setIsManuallyEdited] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (autoSlugifyFrom && !isManuallyEdited && onAutoSlugify) {
      const slugified = slugifySafe(autoSlugifyFrom);
      if (slugified && slugified !== value) {
        onAutoSlugify(slugified);
      }
    }
  }, [autoSlugifyFrom, isManuallyEdited, onAutoSlugify, value]);

  const slugifyWithoutTrim = (input: string): string => {
    const withHyphens = input.replace(/\s+/g, '-');
    const lowercased = withHyphens.toLowerCase();
    const cleaned = lowercased.replace(/[^a-z0-9-]/g, '');
    return cleaned.replace(/-+/g, '-');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setIsManuallyEdited(true);

    const transformed = slugifyWithoutTrim(inputValue);
    setLocalValue(transformed);

    const trimmed = transformed.replace(/^-+|-+$/g, '');
    if (onChange) {
      onChange(trimmed);
    }
  };

  const handleBlur = () => {
    const trimmed = localValue.replace(/^-+|-+$/g, '');
    setLocalValue(trimmed);
    if (onChange) {
      onChange(trimmed);
    }
  };

  const handleFocus = () => {
    setIsManuallyEdited(true);
  };

  return (
    <Input
      {...props}
      ref={inputRef}
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      pattern="[a-z0-9\-]+"
      placeholder={props.placeholder || 'e.g., my-resource-slug'}
    />
  );
}
