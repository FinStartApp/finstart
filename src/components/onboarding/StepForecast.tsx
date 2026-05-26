'use client'

import { useFinStartStore } from '@/store/useFinStartStore'

interface Props {
  onNext: () => void
  onBack: () => void
}

interface SliderFieldProps {
  label: string
  hint: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  format: (value: number) => string
}

function SliderField({
  label,
  hint,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: SliderFieldProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <div>
          <label className="text-sm font-medium text-[var(--foreground)]">
            {label}
          </label>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
            {hint}
          </p>
        </div>
        <span className="text-lg font-bold text-[var(--primary)] ml-4 flex-shrink-0">
          {format(value)}
        </span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer bg-[var(--muted)] accent-[var(--primary)]"
        />
        <div className="flex justify-between mt-1">
          <span className="text-xs text-[var(--muted-foreground)]">
            {format(min)}
          </span>
          <span className="text-xs text-[var(--muted-foreground)]">
            {format(max)}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function StepForecast({ onNext, onBack }: Props) {
  const { forecast_assumptions, updateForecastAssumptions, earners } =
    useFinStartStore()

  const earner1_dob = earners[0]?.date_of_birth
  const earner1_birth_year = earner1_dob
    ? new Date(earner1_dob).getFullYear()
    : null
  const earner1_age = earner1_birth_year
    ? new Date().getFullYear() - earner1_birth_year
    : null

  const forecast_end_year = earner1_birth_year
    ? earner1_birth_year + forecast_assumptions.forecast_end_age
    : null

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
          Final Settings
        </h1>
        <p className="text-[var(--muted-foreground)] text-base">
          These assumptions drive your long-term financial forecast.
          The defaults are reasonable starting points — you can adjust
          them anytime.
        </p>
      </div>

      {/* Sliders */}
      <div className="space-y-6 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
        <SliderField
          label="Inflation Rate"
          hint="Expected annual rise in the cost of living"
          value={forecast_assumptions.inflation_rate}
          min={1}
          max={6}
          step={0.1}
          onChange={(v) =>
            updateForecastAssumptions({ inflation_rate: v })
          }
          format={(v) => `${v.toFixed(1)}%`}
        />

        <div className="h-px bg-[var(--border)]" />

        <SliderField
          label="Salary Growth Rate"
          hint="Expected annual increase in your income"
          value={forecast_assumptions.salary_growth_rate}
          min={0}
          max={8}
          step={0.1}
          onChange={(v) =>
            updateForecastAssumptions({ salary_growth_rate: v })
          }
          format={(v) => `${v.toFixed(1)}%`}
        />

        <div className="h-px bg-[var(--border)]" />

        <SliderField
          label="Investment Return Rate"
          hint="Expected annual return on savings and investments"
          value={forecast_assumptions.investment_return_rate}
          min={4}
          max={10}
          step={0.1}
          onChange={(v) =>
            updateForecastAssumptions({ investment_return_rate: v })
          }
          format={(v) => `${v.toFixed(1)}%`}
        />
      </div>

      {/* Forecast end age */}
      <div className="space-y-3">
        <div>
          <label className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider">
            Forecast Through Age
          </label>
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            How far into the future should your financial plan project?
            {earner1_age !== null && forecast_end_year !== null && (
              <span className="block mt-0.5 text-[var(--primary)]">
                Currently projecting to age{' '}
                {forecast_assumptions.forecast_end_age} —{' '}
                the year {forecast_end_year}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() =>
              updateForecastAssumptions({
                forecast_end_age: Math.max(
                  70,
                  forecast_assumptions.forecast_end_age - 5
                ),
              })
            }
            className="w-10 h-10 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] text-lg font-medium hover:border-[var(--primary)]/50 transition-all flex items-center justify-center"
          >
            −
          </button>
          <span className="text-2xl font-bold text-[var(--foreground)] w-12 text-center">
            {forecast_assumptions.forecast_end_age}
          </span>
          <button
            onClick={() =>
              updateForecastAssumptions({
                forecast_end_age: Math.min(
                  100,
                  forecast_assumptions.forecast_end_age + 5
                ),
              })
            }
            className="w-10 h-10 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] text-lg font-medium hover:border-[var(--primary)]/50 transition-all flex items-center justify-center"
          >
            +
          </button>
        </div>
      </div>

      {/* Summary card */}
      <div className="bg-[var(--muted)]/50 rounded-2xl p-5 space-y-2">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">
          You're almost done
        </h3>
        <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
          After this step you'll land on your financial dashboard — a
          live summary of your income, expenses, and net cash flow.
          From there you can refine any of the numbers you entered,
          add your debts and assets, and explore life decision tools
          like home affordability, retirement planning, and more.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3.5 rounded-xl border border-[var(--border)] text-[var(--foreground)] font-semibold text-sm transition-all hover:bg-[var(--muted)]"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="flex-2 flex-grow py-3.5 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold text-sm transition-all hover:opacity-90"
        >
          Go to My Dashboard
        </button>
      </div>
    </div>
  )
}