'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useFinStartStore, createDefaultEarner, type FilingStatus } from '@/store/useFinStartStore'
import { US_STATES } from '@/lib/calculations'

interface Props {
  onNext: () => void
}

const FILING_OPTIONS = [
  {
    value: 'single',
    label: 'Single',
    description: 'One person, not married',
  },
  {
    value: 'married_jointly',
    label: 'Married — Filing Jointly',
    description: 'Married couple, filing taxes together',
  },
  {
    value: 'married_separately',
    label: 'Married — Filing Separately',
    description: 'Married couple, filing taxes independently',
  },
]

export default function StepHousehold({ onNext }: Props) {
  const {
    filing_status,
    number_of_dependents,
    state_of_residence,
    setFilingStatus,
    setNumberOfDependents,
    setStateOfResidence,
    setHouseholdType,
    addEarner,
    removeSecondEarner,
    earners,
  } = useFinStartStore()

  const [incomeCount, setIncomeCount] = useState(earners.length)
  const isMarried =
    filing_status === 'married_jointly' ||
    filing_status === 'married_separately'

  function handleFilingStatus(value: FilingStatus) {
    setFilingStatus(value)
    if (value === 'single') {
      setHouseholdType('single_person')
      setIncomeCount(1)
      removeSecondEarner()
    }
  }

  function handleIncomeCount(count: number) {
    setIncomeCount(count)
    if (count === 2) {
      if (earners.length < 2) {
        addEarner(createDefaultEarner(`earner_${Date.now()}`, 'Person 2'))
      }
      setHouseholdType('dual_income')
    } else {
      removeSecondEarner()
      setHouseholdType('single_income')
    }
  }

  const canContinue = filing_status !== undefined && state_of_residence !== ''

  return (
    <div className="space-y-7">

      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4"
          style={{ background: '#EAF3DE' }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#3B6D11' }} />
          <span className="text-xs font-semibold" style={{ color: '#3B6D11' }}>
            Your household
          </span>
        </div>
        <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2 leading-tight"
          style={{ letterSpacing: '-0.4px' }}>
          Let's build your financial picture
        </h1>
        <p className="text-[var(--muted-foreground)] text-sm leading-relaxed">
          A few quick questions and we'll have your household set up in under 2 minutes.
        </p>
      </div>

      {/* Filing Status */}
      <div className="space-y-2.5">
        <label className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-widest">
          Tax Filing Status
        </label>
        <div className="space-y-2">
          {FILING_OPTIONS.map((option) => {
            const isSelected = filing_status === option.value
            return (
              <button
                key={option.value}
                onClick={() => handleFilingStatus(option.value as FilingStatus)}
                className="w-full text-left px-4 py-3.5 rounded-xl transition-all duration-150"
                style={{
                  border: isSelected
                    ? '1.5px solid var(--primary)'
                    : '0.5px solid var(--border)',
                  background: isSelected ? '#DDE6F5' : 'var(--card)',
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium text-sm text-[var(--foreground)]">
                      {option.label}
                    </div>
                    <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
                      {option.description}
                    </div>
                  </div>
                  <div
                    className="flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-all"
                    style={{
                      border: isSelected
                        ? '2px solid var(--primary)'
                        : '1.5px solid var(--muted-foreground)',
                      background: isSelected ? 'var(--primary)' : 'transparent',
                    }}
                  >
                    {isSelected && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Income count — only show if married */}
      {isMarried && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="space-y-2.5"
        >
          <label className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-widest">
            How many people in your household work?
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 1, label: 'One income', description: 'One person works' },
              { value: 2, label: 'Two incomes', description: 'Both people work' },
            ].map((option) => {
              const isSelected = incomeCount === option.value
              return (
                <button
                  key={option.value}
                  onClick={() => handleIncomeCount(option.value)}
                  className="text-center px-4 py-4 rounded-xl transition-all duration-150"
                  style={{
                    border: isSelected
                      ? '1.5px solid var(--primary)'
                      : '0.5px solid var(--border)',
                    background: isSelected ? 'var(--primary)' : 'var(--card)',
                  }}
                >
                  <div
                    className="font-semibold text-sm mb-0.5"
                    style={{ color: isSelected ? 'white' : 'var(--foreground)' }}
                  >
                    {option.label}
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: isSelected ? 'rgba(255,255,255,0.65)' : 'var(--muted-foreground)' }}
                  >
                    {option.description}
                  </div>
                </button>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* State + Dependents side by side */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-widest">
            State of residence
          </label>
          <p className="text-xs text-[var(--muted-foreground)] -mt-1">
            Used to estimate state income tax
          </p>
          <select
            value={state_of_residence}
            onChange={(e) => setStateOfResidence(e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm text-[var(--foreground)] bg-[var(--card)] focus:outline-none transition-all"
            style={{ border: '0.5px solid var(--border)' }}
          >
            <option value="">Select state...</option>
            {US_STATES.map((state) => (
              <option key={state.code} value={state.code}>
                {state.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-widest">
            Dependents
          </label>
          <p className="text-xs text-[var(--muted-foreground)] -mt-1">
            Children or others you support
          </p>
          <div
            className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[var(--card)]"
            style={{ border: '0.5px solid var(--border)' }}
          >
            <button
              onClick={() => setNumberOfDependents(Math.max(0, number_of_dependents - 1))}
              className="w-7 h-7 rounded-full flex items-center justify-center text-base font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-all"
              style={{ border: '0.5px solid var(--border)' }}
            >
              −
            </button>
            <span className="flex-1 text-center text-base font-semibold text-[var(--foreground)]">
              {number_of_dependents}
            </span>
            <button
              onClick={() => setNumberOfDependents(number_of_dependents + 1)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-base font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-all"
              style={{ border: '0.5px solid var(--border)' }}
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Continue */}
      <div className="space-y-3 pt-1">
        <button
          onClick={onNext}
          disabled={!canContinue}
          className="w-full py-3.5 rounded-xl font-semibold text-sm tracking-wide transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: 'var(--primary)', color: 'white' }}
        >
          Continue →
        </button>
        <p className="text-xs text-[var(--muted-foreground)] text-center">
          Your data stays on your device
        </p>
      </div>

    </div>
  )
}