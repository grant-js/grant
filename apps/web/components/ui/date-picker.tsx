'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import type { Matcher } from 'react-day-picker';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface DatePickerProps {
  date?: Date;
  onDateChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Days strictly before this date are disabled; `minDate` stays selectable (calendar-day semantics). */
  minDate?: Date;
  /** Days strictly after this date are disabled; `maxDate` stays selectable (calendar-day semantics). */
  maxDate?: Date;
}

function buildDisabledMatchers(minDate?: Date, maxDate?: Date): Matcher | Matcher[] | undefined {
  const matchers: Matcher[] = [];
  if (minDate) {
    matchers.push({ before: minDate });
  }
  if (maxDate) {
    matchers.push({ after: maxDate });
  }
  if (matchers.length === 0) {
    return undefined;
  }
  return matchers.length === 1 ? matchers[0] : matchers;
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = 'Pick a date',
  disabled = false,
  className,
  minDate,
  maxDate,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const calendarDisabled = React.useMemo(
    () => buildDisabledMatchers(minDate, maxDate),
    [minDate, maxDate]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          data-empty={!date}
          className={cn(
            'data-[empty=true]:text-muted-foreground w-full justify-start text-left font-normal',
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, 'PPP') : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(selectedDate) => {
            onDateChange?.(selectedDate);
            setOpen(false);
          }}
          disabled={calendarDisabled}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
