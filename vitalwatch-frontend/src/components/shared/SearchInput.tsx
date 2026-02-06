/**
 * SearchInput Component
 *
 * Reusable search input with debounce.
 * @module components/shared/SearchInput
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SearchInputProps {
  /**
   * Placeholder text
   */
  placeholder?: string;

  /**
   * Initial value
   */
  defaultValue?: string;

  /**
   * Callback when search value changes
   */
  onSearch: (value: string) => void;

  /**
   * Debounce delay in milliseconds
   */
  debounce?: number;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Whether to auto-focus
   */
  autoFocus?: boolean;
}

/**
 * SearchInput - Reusable search input with debounce
 *
 * @example
 * ```tsx
 * <SearchInput
 *   placeholder="Search patients..."
 *   onSearch={(value) => console.log(value)}
 *   debounce={300}
 * />
 * ```
 */
export function SearchInput({
  placeholder = 'Search...',
  defaultValue = '',
  onSearch,
  debounce = 300,
  className,
  autoFocus = false,
}: SearchInputProps) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(value);
    }, debounce);

    return () => clearTimeout(timer);
  }, [value, debounce, onSearch]);

  const handleClear = () => {
    setValue('');
    onSearch('');
  };

  return (
    <div className={cn('relative', className)}>
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <Search className="h-4 w-4 text-gray-400" aria-hidden="true" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="block w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-10 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        aria-label="Search"
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export default SearchInput;
