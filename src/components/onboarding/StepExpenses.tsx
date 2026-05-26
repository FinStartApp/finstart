'use client'

import { useFinStartStore } from '@/store/useFinStartStore'

interface Props {
  onNext: () => void
  onBack: () => void
}

export default function StepExpenses({ onNext, onBack }: Props) {
  const { fixed_expenses, variable_expenses, updateFixedExpenses, updateVariableExpenses } =
    useFinStartStore()

  function updateFixed(field: string, value: number) {
    updateFixedExpenses({ [field]: value })
  }

  function updateVariable(field: string, value: number) {
    updateVariableExpenses({ [field]: value })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">
          Your Expenses
        </h1>
        <p className="text-[var(--muted-foreground)] text-base">
          Enter your typical monthly amounts. You can always come back
          and update these later — even rough estimates will give you a
          useful starting picture.
        </p>
      </div>

      {/* Fixed Expenses */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-[var(--foreground)]">
            Fixed Expenses
          </h2>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
            Bills that stay the same every month
          </p>
        </div>

        <div className="space-y-3">
          {[
            {
              field: 'housing',
              label: 'Housing',
              hint: 'Rent or mortgage payment',
            },
            {
              field: 'utilities',
              label: 'Utilities',
              hint: 'Electric, gas, water',
            },
            {
              field: 'internet_phone',
              label: 'Internet & Phone',
              hint: 'Combined monthly total',
            },
            {
              field: 'insurance',
              label: 'Insurance',
              hint: 'Auto, renters/home, life — not paycheck deductions',
            },
            {
              field: 'childcare_education',
              label: 'Childcare & Education',
              hint: 'Daycare, tuition, school fees',
            },
          ].map(({ field, label, hint }) => (
            <div key={field} className="space-y-1">
              <div className="flex items-baseline justify-between">
                <label className="text-sm font-medium text-[var(--foreground)]">
                  {label}
                </label>
                <span className="text-xs text-[var(--muted-foreground)]">
                  {hint}
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] text-sm">
                  $
                </span>
                <input
                  type="number"
                  value={
                    fixed_expenses[
                      field as keyof typeof fixed_expenses
                    ] as number || ''
                  }
                  onChange={(e) =>
                    updateFixed(field, parseFloat(e.target.value) || 0)
                  }
                  placeholder="0"
                  className="w-full pl-8 pr-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] transition-all text-sm"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Variable Expenses */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-[var(--foreground)]">
            Variable Expenses
          </h2>
          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
            Spending that changes month to month — use a monthly average
          </p>
        </div>

        <div className="space-y-3">
          {[
            {
              field: 'groceries',
              label: 'Groceries',
              hint: 'Monthly average',
            },
            {
              field: 'dining_takeout',
              label: 'Dining & Takeout',
              hint: 'Restaurants, delivery, coffee',
            },
            {
              field: 'auto_transportation',
              label: 'Auto & Transportation',
              hint: 'Gas, maintenance, parking',
            },
            {
              field: 'health_medical',
              label: 'Health & Medical',
              hint: 'Out of pocket costs',
            },
            {
              field: 'personal_care',
              label: 'Personal Care',
              hint: 'Hair, grooming, hygiene',
            },
            {
              field: 'clothing_shopping',
              label: 'Clothing & Shopping',
              hint: 'Monthly average',
            },
            {
              field: 'entertainment_activities',
              label: 'Entertainment & Activities',
              hint: 'Fun, hobbies, kids activities',
            },
            {
              field: 'travel_vacation',
              label: 'Travel & Vacation',
              hint: 'Monthly average or annual ÷ 12',
            },
            {
              field: 'gifts_giving',
              label: 'Gifts & Giving',
              hint: 'Birthdays, holidays, charity',
            },
            {
              field: 'pet_care',
              label: 'Pet Care',
              hint: 'Food, vet, grooming',
            },
            {
              field: 'home_maintenance',
              label: 'Home Maintenance',
              hint: 'Repairs, supplies, lawn care',
            },
          ].map(({ field, label, hint }) => (
            <div key={field} className="space-y-1">
              <div className="flex items-baseline justify-between">
                <label className="text-sm font-medium text-[var(--foreground)]">
                  {label}
                </label>
                <span className="text-xs text-[var(--muted-foreground)]">
                  {hint}
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] text-sm">
                  $
                </span>
                <input
                  type="number"
                  value={
                    variable_expenses[
                      field as keyof typeof variable_expenses
                    ] as number || ''
                  }
                  onChange={(e) =>
                    updateVariable(
                      field,
                      parseFloat(e.target.value) || 0
                    )
                  }
                  placeholder="0"
                  className="w-full pl-8 pr-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] transition-all text-sm"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Skip note */}
      <p className="text-xs text-[var(--muted-foreground)] text-center">
        Not sure about some of these? Leave them at $0 and fill them in
        later from your dashboard.
      </p>

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
          Continue
        </button>
      </div>
    </div>
  )
}