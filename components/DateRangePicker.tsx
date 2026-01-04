'use client';

import { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import * as Popover from '@radix-ui/react-popover';
import { format } from 'date-fns';
import 'react-day-picker/style.css';

interface DateRangePickerProps {
  startDate: Date | undefined;
  endDate: Date | undefined;
  onStartDateChange: (date: Date | undefined) => void;
  onEndDateChange: (date: Date | undefined) => void;
  className?: string;
}

export default function DateRangePicker({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  className = '',
}: DateRangePickerProps) {
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const handleStartDateSelect = (date: Date | undefined) => {
    onStartDateChange(date);

    // If endDate is empty or before new startDate, set endDate = startDate
    if (date && (!endDate || endDate < date)) {
      onEndDateChange(date);
    }

    setStartOpen(false);
  };

  const handleEndDateSelect = (date: Date | undefined) => {
    onEndDateChange(date);
    setEndOpen(false);
  };

  // End date calendar should open on month of (endDate ?? startDate)
  const endDateDefaultMonth = endDate || startDate || new Date();

  return (
    <div className={`grid grid-cols-2 gap-4 ${className}`}>
      {/* Start Date Picker */}
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          Start Date <span className="text-red-500">*</span>
        </label>
        <Popover.Root open={startOpen} onOpenChange={setStartOpen}>
          <Popover.Trigger asChild>
            <button
              type="button"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-left hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              {startDate ? format(startDate, 'PPP') : 'Pick a date'}
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              className="z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3"
              align="start"
              sideOffset={5}
            >
              <DayPicker
                mode="single"
                selected={startDate}
                onSelect={handleStartDateSelect}
                className="rdp-custom"
              />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>

      {/* End Date Picker */}
      <div>
        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
          End Date <span className="text-red-500">*</span>
        </label>
        <Popover.Root open={endOpen} onOpenChange={setEndOpen}>
          <Popover.Trigger asChild>
            <button
              type="button"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-left hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              {endDate ? format(endDate, 'PPP') : 'Pick a date'}
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              className="z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3"
              align="start"
              sideOffset={5}
            >
              <DayPicker
                mode="single"
                selected={endDate}
                onSelect={handleEndDateSelect}
                defaultMonth={endDateDefaultMonth}
                disabled={startDate ? { before: startDate } : undefined}
                className="rdp-custom"
              />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>

      <style jsx global>{`
        .rdp-custom {
          --rdp-accent-color: #3b82f6;
          --rdp-background-color: #dbeafe;
        }

        .dark .rdp-custom {
          --rdp-accent-color: #60a5fa;
          --rdp-background-color: #1e3a8a;
        }

        .rdp-custom .rdp-day_button:hover:not([disabled]) {
          background-color: var(--rdp-background-color);
        }

        .rdp-custom .rdp-day_button[aria-selected='true'] {
          background-color: var(--rdp-accent-color);
          color: white;
        }

        .rdp-custom .rdp-day_button[disabled] {
          opacity: 0.3;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
