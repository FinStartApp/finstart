'use client'

import { useState, useEffect } from 'react'

interface CurrencyInputProps {
  value: number
  onChange: (value: number) => void
  placeholder?: string
  className?: string
  label?: string
  hint?: string
}

function formatWithCommas(value: number): string {
  if (!value && value !== 0) return ''
  return value.toLocaleString('en-US')
}

function parseFormattedValue(str: string): number {
  const cleaned = str.replace(/[^0-9.]/g, '')
  return parseFloat(cleaned) || 0
}

export default function CurrencyInput({
  value,
  onChange,
  placeholder = '0',
  className = '',
  label,
  hint,
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState(
    value ? formatWithCommas(value) : ''
  )
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(value ? formatWithCommas(value) : '')
    }
  }, [value, isFocused])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^0-9.]/g, '')
    setDisplayValue(raw)
    onChange(parseFloat(raw) || 0)
  }

  function handleBlur() {
    setIsFocused(false)
    const numeric = parseFormattedValue(displayValue)
    setDisplayValue(numeric ? formatWithCommas(numeric) : '')
    onChange(numeric)
  }

  function handleFocus() {
    setIsFocused(true)
    // Show raw number while editing
    const numeric = parseFormattedValue(displayValue)
    setDisplayValue(numeric ? String(numeric) : '')
  }

  return (
    <div className="space-y-1">
      {label && (
        <label className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider">
          {label}
        </label>
      )}
      {hint && (
        <p className="text-xs text-[var(--muted-foreground)]">{hint}</p>
      )}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] text-sm">
          $
        </span>
        <input
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`w-full pl-8 pr-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] transition-all text-sm ${className}`}
        />
      </div>
    </div>
  )
}