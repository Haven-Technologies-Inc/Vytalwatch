/**
 * DateRangePicker Component
 *
 * Date range selector with presets.
 * @module components/shared/DateRangePicker
 */

'use client';

import React, { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Calendar } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfYear } from 'date-fns';
import { cn } from '@/lib/utils';

export interface DateRange {
  from: Date;
  to: Date;
}

export interface DateRangePickerProps {
  /**
   * Selected date range
   */
  value?: DateRange;

  /**
   * Callback when date range changes
   */
  onChange: (range: DateRange) => void;

  /**
   * Additional CSS classes
   */
  className?: string;
}

const presets = [
  {
    label: 'Last 7 days',
    getValue: () => ({
      from: subDays(new Date(), 7),
      to: new Date(),
    }),
  },
  {
    label: 'Last 30 days',
    getValue: () => ({
      from: subDays(new Date(), 30),
      to: new Date(),
    }),
  },
  {
    label: 'This month',
    getValue: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    }),
  },
  {
    label: 'This year',
    getValue: () => ({
      from: startOfYear(new Date()),
      to: new Date(),
    }),
  },
];

/**
 * DateRangePicker - Select date range with presets
 *
 * @example
 * ```tsx
 * <DateRangePicker
 *   value={dateRange}
 *   onChange={setDateRange}
 * />
 * ```
 */
export function DateRangePicker({
  value,
  onChange,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [fromDate, setFromDate] = useState<string>(
    value?.from ? format(value.from, 'yyyy-MM-dd') : ''
  );
  const [toDate, setToDate] = useState<string>(
    value?.to ? format(value.to, 'yyyy-MM-dd') : ''
  );

  const handlePresetClick = (preset: typeof presets[0]) => {
    const range = preset.getValue();
    onChange(range);
    setFromDate(format(range.from, 'yyyy-MM-dd'));
    setToDate(format(range.to, 'yyyy-MM-dd'));
    setOpen(false);
  };

  const handleApply = () => {
    if (fromDate && toDate) {
      onChange({
        from: new Date(fromDate),
        to: new Date(toDate),
      });
      setOpen(false);
    }
  };

  const displayText = value
    ? `${format(value.from, 'MMM dd, yyyy')} - ${format(value.to, 'MMM dd, yyyy')}`
    : 'Select date range';

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          className={cn(
            'inline-flex items-center justify-between gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            className
          )}
        >
          <Calendar className="h-4 w-4 text-gray-500" />
          <span className="text-gray-700">{displayText}</span>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="z-50 w-80 rounded-lg border border-gray-200 bg-white p-4 shadow-lg"
          sideOffset={5}
        >
          <div className="space-y-4">
            <div>
              <h4 className="mb-2 text-sm font-medium text-gray-900">
                Presets
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => handlePresetClick(preset)}
                    className="rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h4 className="mb-2 text-sm font-medium text-gray-900">
                Custom Range
              </h4>
              <div className="space-y-2">
                <div>
                  <label className="mb-1 block text-xs text-gray-600">
                    From
                  </label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-600">
                    To
                  </label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={handleApply}
                  disabled={!fromDate || !toDate}
                  className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export default DateRangePicker;
