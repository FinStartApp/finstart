'use client'

import { useState, useEffect } from 'react'

interface Props {
  value: number
  onChange: (value: number) => void
  label?: string
}

export default function SalaryGrowthSlider({
  value,
  onChange,
  label = 'Expected Annual Raises',
}: Props) {
  const [inputValue, setInputValue] = useState(String(value))

  useEffect(() => {
    setInputValue(String(value))
  }, [value])

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    setInputValue(raw)
    const parsed = parseFloat(raw)
    if (!isNaN(parsed) && parsed >= 0) {
      onChange(parsed)
    }
  }

  function handleBlur() {
    const parsed = parseFloat(inputValue)
    if (isNaN(parsed) || parsed < 0) {
      setInputValue(String(value))
    } else {
      setInputValue(String(parsed))
      onChange(parsed)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider">
          {label}
        </label>
        <p className="text-xs text-[var(--muted-foreground)] mt-1">
          How much do you expect your salary to grow each year on
          average? 3.5% is a reasonable default for most careers.
        </p>
      </div>

      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={15}
            step={0.5}
            value={Math.min(value, 15)}
            onChange={(e) => {
              const val = parseFloat(e.target.value)
              onChange(val)
              setInputValue(String(val))
            }}
            className="flex-1 h-2 rounded-full appearance-none cursor-pointer bg-[var(--muted)] accent-[var(--primary)]"
          />
          <div className="flex items-center gap-1 flex-shrink-0">
            <input
              type="number"
              value={inputValue}
              step={0.5}
              onChange={handleInputChange}
              onBlur={handleBlur}
              className="w-16 px-2 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] text-sm text-center focus:outline-none focus:border-[var(--primary)] transition-all"
            />
            <span className="text-xs text-[var(--muted-foreground)]">%</span>
          </div>
        </div>
        <div className="flex justify-between">
          <span className="text-xs text-[var(--muted-foreground)]">0%</span>
          <span className="text-xs text-[var(--muted-foreground)]">15%+</span>
        </div>
      </div>
    </div>
  )
}