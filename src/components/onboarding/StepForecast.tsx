'use client'

import { useState, useEffect } from 'react'
import { useFinStartStore } from '@/store/useFinStartStore'

interface Props {
  onNext: () => void
  onBack: () => void
}

interface SliderWithInputProps {
  label: string
  hint: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  format: (value: number) => string
}

function SliderWithInput({ label, hint, value, min, max, step, onChange, format }: SliderWithInputProps) {
  const [inputValue, setInputValue] = useState(String(value))

  useEffect(() => {
    setInputValue(String(value))
  }, [value])

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    setInputValue(raw)
    const parsed = parseFloat(raw)
    if (!isNaN(parsed)) onChange(parsed)
  }

  function handleBlur() {
    const parsed = parseFloat(inputValue)
    if (isNaN(parsed)) {
      setInputValue(String(value))
    } else {
      setInputValue(String(parsed))
      onChange(parsed)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-sm font-medium text-[var(--foreground)]">{label}</label>
        <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{hint}</p>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={Math.min(Math.max(value, min), max)}
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
            step={step}
            onChange={handleInputChange}
            onBlur={handleBlur}
            className="w-16 px-2 py-1.5 rounded-lg text-sm text-center text-[var(--foreground)] bg-[var(--card)] focus:outline-none transition-all"
            style={{ border: '0.5px solid var(--border)' }}
          />
          <span className="text-xs text-[var(--muted-foreground)]">%</span>
        </div>
      </div>
      <div className="flex justify-between -mt-1">
        <span className="text-xs text-[var(--muted-foreground)]">{format(min)}</span>
        <span className="text-xs text-[var(--muted-foreground)]">{format(max)}</span>
      </div>
    </div>
  )
}

export default function StepForecast({ onNext, onBack }: Props) {
  const { forecast_assumptions, updateForecastAssumptions, earners } = useFinStartStore()

  const earner1_dob = earners[0]?.date_of_birth
  const earner1_birth_year = earner1_dob ? new Date(earner1_dob).getFullYear() : null
  const earner1_age = earner1_birth_year ? new Date().getFullYear() - earner1_birth_year : null
  const forecast_end_year = earner1_birth_year
    ? earner1_birth_year + forecast_assumptions.forecast_end_age
    : null

  return (
    <div className="space-y-7">

      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4"
          style={{ background: '#EAF3DE' }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#3B6D11' }} />
          <span className="text-xs font-semibold" style={{ color: '#3B6D11' }}>
            Final settings
          </span>
        </div>
        <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2 leading-tight"
          style={{ letterSpacing: '-0.4px' }}>
          Almost done — a few last things
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
          These assumptions drive your long-term financial forecast.
          The defaults are reasonable starting points — you can adjust them anytime.
        </p>
      </div>

      {/* Sliders */}
      <div className="space-y-6 rounded-2xl p-5"
        style={{ background: 'var(--card)', border: '0.5px solid var(--border)' }}>
        <SliderWithInput
          label="Inflation Rate"
          hint="Expected annual rise in the cost of living"
          value={forecast_assumptions.inflation_rate}
          min={1}
          max={6}
          step={0.1}
          onChange={(v) => updateForecastAssumptions({ inflation_rate: v })}
          format={(v) => `${v.toFixed(1)}%`}
        />
        <div className="h-px bg-[var(--border)]" />
        <SliderWithInput
          label="Investment Return Rate"
          hint="Expected annual return on savings and investments"
          value={forecast_assumptions.investment_return_rate}
          min={4}
          max={10}
          step={0.1}
          onChange={(v) => updateForecastAssumptions({ investment_return_rate: v })}
          format={(v) => `${v.toFixed(1)}%`}
        />
        <div className="h-px bg-[var(--border)]" />
        <SliderWithInput
          label="Retirement Withdrawal Rate"
          hint="Annual % of retirement savings you'll spend in retirement. 4% is the widely accepted safe withdrawal rate."
          value={forecast_assumptions.withdrawal_rate}
          min={2}
          max={8}
          step={0.1}
          onChange={(v) => updateForecastAssumptions({ withdrawal_rate: v })}
          format={(v) => `${v.toFixed(1)}%`}
        />
      </div>

      {/* Forecast end age */}
      <div className="space-y-3">
        <div>
          <label className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-widest">
            Forecast Through Age
          </label>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            How far into the future should your financial plan project?
            {earner1_age !== null && forecast_end_year !== null && (
              <span className="block mt-0.5" style={{ color: 'var(--primary)' }}>
                Currently projecting to age {forecast_assumptions.forecast_end_age} — the year {forecast_end_year}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => updateForecastAssumptions({ forecast_end_age: Math.max(70, forecast_assumptions.forecast_end_age - 5) })}
            className="w-10 h-10 rounded-xl text-lg font-medium flex items-center justify-center transition-all hover:opacity-70"
            style={{ border: '0.5px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)' }}
          >
            −
          </button>
          <span className="text-2xl font-bold text-[var(--foreground)] w-12 text-center">
            {forecast_assumptions.forecast_end_age}
          </span>
          <button
            onClick={() => updateForecastAssumptions({ forecast_end_age: Math.min(100, forecast_assumptions.forecast_end_age + 5) })}
            className="w-10 h-10 rounded-xl text-lg font-medium flex items-center justify-center transition-all hover:opacity-70"
            style={{ border: '0.5px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)' }}
          >
            +
          </button>
        </div>
      </div>

      {/* Summary card */}
      <div className="rounded-2xl p-5 space-y-2"
        style={{ background: 'var(--secondary)', border: '0.5px solid var(--border)' }}>
        <h3 className="text-sm font-semibold text-[var(--foreground)]">You're almost done</h3>
        <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
          After this step you'll land on your financial dashboard — a live summary of your income,
          expenses, and net cash flow. From there you can refine any of the numbers you entered,
          add your debts and assets, and explore life decision tools like home affordability,
          retirement planning, and more.
        </p>
      </div>

      {/* Navigation */}
      <div className="space-y-3 pt-1">
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 py-3.5 rounded-xl font-semibold text-sm transition-all hover:opacity-80"
            style={{ border: '0.5px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)' }}
          >
            Back
          </button>
          <button
            onClick={onNext}
            className="flex-[2] py-3.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
            style={{ background: 'var(--primary)', color: 'white' }}
          >
            Go to My Dashboard →
          </button>
        </div>
        <p className="text-xs text-[var(--muted-foreground)] text-center">
          Your data stays on your device
        </p>
      </div>

    </div>
  )
}