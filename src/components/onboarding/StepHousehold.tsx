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
    dual_income: false,
  },
  {
    value: 'married_jointly',
    label: 'Married — Filing Jointly',
    description: 'Married couple, filing taxes together',
    dual_income: true,
  },
  {
    value: 'married_separately',
    label: 'Married — Filing Separately',
    description: 'Married couple, filing taxes independently',
    dual_income: true,
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

  const canContinue =
    filing_status !== undefined && state_of_residence !== ''

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
          Let's start with the basics
        </h1>
        <p className="text-[var(--muted-foreground)] text-base">
          This helps us set up your financial picture correctly from
          the start.
        </p>
      </div>

      {/* Filing Status */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider">
          Tax Filing Status
        </label>
        <div className="space-y-2">
          {FILING_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() =>
                handleFilingStatus(option.value as FilingStatus)
              }
              className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all duration-150 ${
                filing_status === option.value
                  ? 'border-[var(--primary)] bg-[var(--primary)]/8 text-[var(--foreground)]'
                  : 'border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:border-[var(--primary)]/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">
                    {option.label}
                  </div>
                  <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    {option.description}
                  </div>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-all ${
                    filing_status === option.value
                      ? 'border-[var(--primary)] bg-[var(--primary)]'
                      : 'border-[var(--muted-foreground)]'
                  }`}
                />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Income count — only show if married */}
      {isMarried && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <label className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider">
            How many people in your household work?
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              {
                value: 1,
                label: 'One Income',
                description: 'One person works',
              },
              {
                value: 2,
                label: 'Two Incomes',
                description: 'Both people work',
              },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => handleIncomeCount(option.value)}
                className={`text-left px-4 py-3.5 rounded-xl border transition-all duration-150 ${
                  incomeCount === option.value
                    ? 'border-[var(--primary)] bg-[var(--primary)]/8'
                    : 'border-[var(--border)] bg-[var(--card)] hover:border-[var(--primary)]/50'
                }`}
              >
                <div className="font-medium text-sm text-[var(--foreground)]">
                  {option.label}
                </div>
                <div className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  {option.description}
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* State of Residence */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider">
          State of Residence
        </label>
        <p className="text-xs text-[var(--muted-foreground)] -mt-1">
          Used to estimate your state income tax
        </p>
        <select
          value={state_of_residence}
          onChange={(e) => setStateOfResidence(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] transition-all text-sm"
        >
          <option value="">Select your state...</option>
          {US_STATES.map((state) => (
            <option key={state.code} value={state.code}>
              {state.name}
            </option>
          ))}
        </select>
      </div>

      {/* Dependents */}
      <div className="space-y-3">
        <label className="text-sm font-semibold text-[var(--foreground)] uppercase tracking-wider">
          Number of Dependents
        </label>
        <p className="text-xs text-[var(--muted-foreground)] -mt-1">
          Children or others you financially support
        </p>
        <div className="flex items-center gap-4">
          <button
            onClick={() =>
              setNumberOfDependents(
                Math.max(0, number_of_dependents - 1)
              )
            }
            className="w-10 h-10 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] text-lg font-medium hover:border-[var(--primary)]/50 transition-all flex items-center justify-center"
          >
            −
          </button>
          <span className="text-2xl font-bold text-[var(--foreground)] w-8 text-center">
            {number_of_dependents}
          </span>
          <button
            onClick={() =>
              setNumberOfDependents(number_of_dependents + 1)
            }
            className="w-10 h-10 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] text-lg font-medium hover:border-[var(--primary)]/50 transition-all flex items-center justify-center"
          >
            +
          </button>
        </div>
      </div>

      {/* Continue */}
      <button
        onClick={onNext}
        disabled={!canContinue}
        className="w-full py-3.5 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold text-sm tracking-wide transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Continue
      </button>

      {!canContinue && state_of_residence === '' && filing_status && (
        <p className="text-xs text-[var(--muted-foreground)] text-center -mt-4">
          Please select your state to continue
        </p>
      )}
    </div>
  )
}