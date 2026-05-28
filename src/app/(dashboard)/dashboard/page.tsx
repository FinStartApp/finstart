'use client'

import { useFinStartStore } from '@/store/useFinStartStore'
import {
  calculateMonthlyPL,
  calculateBalanceSheet,
  calculateHouseholdIncome,
  formatCurrency,
  formatPercent,
} from '@/lib/calculations'
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  X,
  ChevronRight,
  Plus,
  Pencil,
} from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'

export default function DashboardPage() {
  const [warningDismissed, setWarningDismissed] = useState(false)
  const [incomeHovered, setIncomeHovered] = useState(false)

  const {
    earners,
    fixed_expenses,
    variable_expenses,
    savings_and_investments,
    assets,
    liabilities,
    state_of_residence,
  } = useFinStartStore()

  const pl = calculateMonthlyPL(
    earners,
    fixed_expenses,
    variable_expenses,
    savings_and_investments,
    state_of_residence
  )

  const bs = calculateBalanceSheet(assets, liabilities)
  const income = calculateHouseholdIncome(earners, state_of_residence)

  const hasIncome = earners.some(
    (e) => e.gross_annual_salary > 0 || e.hourly_rate > 0
  )
  const hasExpenses =
    pl.total_fixed_expenses > 0 || pl.total_variable_expenses > 0
  const hasAssets = assets.length > 0
  const anyDeductionsIncomplete = earners.some((e) => !e.deductions_complete)

  const retirementSavingsMonthly = earners.reduce((sum, e) => {
    const trad =
      (e.gross_annual_salary *
        e.pre_tax_deductions.retirement401k_traditional_percent) /
      100 /
      12
    const roth =
      (e.gross_annual_salary *
        e.pre_tax_deductions.retirement401k_roth_percent) /
      100 /
      12
    return sum + trad + roth
  }, 0)

  const retirementRate =
    income.total_gross_monthly > 0
      ? (retirementSavingsMonthly / income.total_gross_monthly) * 100
      : 0

  const totalSavingsMonthly = pl.total_savings + retirementSavingsMonthly

  const savingsRate =
    income.total_take_home_monthly > 0
      ? (totalSavingsMonthly / income.total_take_home_monthly) * 100
      : 0

  const cashFlowPositive = pl.net_cash_flow >= 0

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">

      {/* Deductions warning banner */}
      {anyDeductionsIncomplete && !warningDismissed && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-3">
            <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              Paycheck deductions not entered — take-home pay is estimated.{' '}
              <Link
                href="/dashboard/income"
                className="font-medium underline underline-offset-2"
              >
                Complete now
              </Link>
            </p>
          </div>
          <button
            onClick={() => setWarningDismissed(true)}
            className="text-amber-600 hover:text-amber-800 transition-colors ml-4"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Net cash flow hero card */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
        {!hasIncome ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                Monthly cash flow
              </p>
              <p className="text-2xl font-bold text-[var(--muted-foreground)]">
                —
              </p>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                Add your income to see your financial picture
              </p>
            </div>
            <Link
              href="/dashboard/income"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] text-sm font-medium hover:opacity-90 transition-all"
            >
              <Plus size={15} />
              Add Income
            </Link>
          </div>
        ) : (
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                Monthly cash flow
              </p>
              <div className="flex items-center gap-2">
                {cashFlowPositive ? (
                  <TrendingUp size={24} className="text-emerald-600" />
                ) : (
                  <TrendingDown size={24} className="text-red-500" />
                )}
                <span
                  className={`text-4xl font-bold ${
                    cashFlowPositive ? 'text-emerald-600' : 'text-red-500'
                  }`}
                >
                  {cashFlowPositive ? '+' : ''}
                  {formatCurrency(pl.net_cash_flow)}
                </span>
              </div>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                After expenses and savings ·{' '}
                {formatCurrency(pl.net_cash_flow * 12)}/yr
              </p>
            </div>
            <div className="flex gap-6">
              <div className="text-right">
                <p className="text-xs text-[var(--muted-foreground)] mb-0.5">
                  Take-home
                </p>
                <p className="text-lg font-semibold text-[var(--foreground)]">
                  {formatCurrency(pl.total_take_home)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[var(--muted-foreground)] mb-0.5">
                  Expenses
                </p>
                <p className="text-lg font-semibold text-[var(--foreground)]">
                  {formatCurrency(pl.total_expenses)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[var(--muted-foreground)] mb-0.5">
                  Savings
                </p>
                <p className="text-lg font-semibold text-[var(--foreground)]">
                  {formatCurrency(totalSavingsMonthly)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Three summary cards */}
      <div className="grid grid-cols-3 gap-4">

        {/* Income card */}
        <div
          className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 relative"
          onMouseEnter={() => setIncomeHovered(true)}
          onMouseLeave={() => setIncomeHovered(false)}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[var(--foreground)]">
                Income
              </h3>
              {anyDeductionsIncomplete && (
                <AlertTriangle size={13} className="text-amber-500" />
              )}
            </div>
            <Link
              href="/dashboard/income"
              className="flex items-center gap-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              <Pencil size={12} />
              Edit
            </Link>
          </div>

          {!hasIncome ? (
            <div className="space-y-3">
              <p className="text-sm text-[var(--muted-foreground)]">
                No income added yet
              </p>
              <Link
                href="/dashboard/income"
                className="flex items-center gap-1 text-xs text-[var(--primary)] font-medium"
              >
                <Plus size={12} /> Add income
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {earners.map((earner) => (
                <div key={earner.id} className="flex justify-between items-center">
                  <span className="text-sm text-[var(--muted-foreground)]">
                    {earner.label}
                  </span>
                  <span className="text-sm font-medium text-[var(--foreground)]">
                    {formatCurrency(
                      earner.employment_type === 'hourly'
                        ? (earner.hourly_rate * earner.hours_per_week * 52) / 12
                        : earner.gross_annual_salary / 12
                    )}
                  </span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-2 mt-2 border-t border-[var(--border)]">
                <span className="text-sm text-[var(--muted-foreground)]">
                  Taxes &amp; deductions
                </span>
                <span className="text-sm font-medium text-red-500">
                  -{formatCurrency(
                    income.total_gross_monthly - income.total_net_monthly
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-[var(--border)]">
                <span className="text-sm font-semibold text-[var(--foreground)]">
                  Take-home
                </span>
                <span className="text-sm font-bold text-[var(--foreground)]">
                  {formatCurrency(income.total_take_home_monthly)}
                </span>
              </div>
            </div>
          )}

          {/* Income hover popover */}
          {incomeHovered && hasIncome && (
            <div className="absolute left-full top-0 ml-3 w-72 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-lg p-4 z-50">
              <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-3">
                Paycheck breakdown
              </p>
              {earners.map((earner) => {
                const grossMonthly =
                  earner.employment_type === 'hourly'
                    ? (earner.hourly_rate * earner.hours_per_week * 52) / 12
                    : earner.gross_annual_salary / 12
                return (
                  <div key={earner.id} className="mb-3 last:mb-0">
                    <p className="text-xs font-medium text-[var(--foreground)] mb-1.5">
                      {earner.label}
                    </p>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-xs text-[var(--muted-foreground)]">Gross</span>
                        <span className="text-xs text-[var(--foreground)]">{formatCurrency(grossMonthly)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-[var(--muted-foreground)]">Pre-tax deductions</span>
                        <span className="text-xs text-red-500">-{formatCurrency(
                          earner.pre_tax_deductions.health_insurance +
                          earner.pre_tax_deductions.dental +
                          earner.pre_tax_deductions.vision +
                          (earner.pre_tax_deductions.has_hsa ? earner.pre_tax_deductions.hsa : 0) +
                          (earner.pre_tax_deductions.has_fsa ? earner.pre_tax_deductions.fsa : 0) +
                          earner.pre_tax_deductions.other_pretax
                        )}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-[var(--muted-foreground)]">401(k)</span>
                        <span className="text-xs text-red-500">-{formatCurrency(
                          (grossMonthly * earner.pre_tax_deductions.retirement401k_traditional_percent / 100) +
                          (grossMonthly * earner.pre_tax_deductions.retirement401k_roth_percent / 100)
                        )}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-[var(--muted-foreground)]">Est. taxes</span>
                        <span className="text-xs text-red-500">-{formatCurrency(
                          grossMonthly * 0.25
                        )}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Expenses card */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">
              Expenses
            </h3>
            <Link
              href="/dashboard/expenses"
              className="flex items-center gap-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              <Pencil size={12} />
              Edit
            </Link>
          </div>

          {!hasExpenses ? (
            <div className="space-y-3">
              <p className="text-sm text-[var(--muted-foreground)]">
                No expenses added yet
              </p>
              <Link
                href="/dashboard/expenses"
                className="flex items-center gap-1 text-xs text-[var(--primary)] font-medium"
              >
                <Plus size={12} /> Add expenses
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {fixed_expenses.housing > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--muted-foreground)]">Housing</span>
                  <span className="text-sm font-medium text-[var(--foreground)]">{formatCurrency(fixed_expenses.housing)}</span>
                </div>
              )}
              {fixed_expenses.utilities > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--muted-foreground)]">Utilities</span>
                  <span className="text-sm font-medium text-[var(--foreground)]">{formatCurrency(fixed_expenses.utilities)}</span>
                </div>
              )}
              {(variable_expenses.groceries + variable_expenses.dining_takeout) > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--muted-foreground)]">Food &amp; dining</span>
                  <span className="text-sm font-medium text-[var(--foreground)]">{formatCurrency(variable_expenses.groceries + variable_expenses.dining_takeout)}</span>
                </div>
              )}
              {variable_expenses.auto_transportation > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--muted-foreground)]">Auto &amp; transport</span>
                  <span className="text-sm font-medium text-[var(--foreground)]">{formatCurrency(variable_expenses.auto_transportation)}</span>
                </div>
              )}
              {fixed_expenses.subscriptions_total_override > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-[var(--muted-foreground)] flex items-center gap-1">
                    Subscriptions <ChevronRight size={11} />
                  </span>
                  <span className="text-sm font-medium text-[var(--foreground)]">{formatCurrency(fixed_expenses.subscriptions_total_override)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t border-[var(--border)]">
                <span className="text-sm font-semibold text-[var(--foreground)]">Total</span>
                <span className="text-sm font-bold text-[var(--foreground)]">{formatCurrency(pl.total_expenses)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Savings card */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">
              Savings
            </h3>
            <Link
              href="/dashboard/savings"
              className="flex items-center gap-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              <Pencil size={12} />
              Edit
            </Link>
          </div>
          <div className="space-y-2">
            {retirementSavingsMonthly > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--muted-foreground)]">401(k) contributions</span>
                <span className="text-sm font-medium text-[var(--foreground)]">{formatCurrency(retirementSavingsMonthly)}</span>
              </div>
            )}
            {savings_and_investments.emergency_fund_contribution > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--muted-foreground)]">Emergency fund</span>
                <span className="text-sm font-medium text-[var(--foreground)]">{formatCurrency(savings_and_investments.emergency_fund_contribution)}</span>
              </div>
            )}
            {savings_and_investments.brokerage_contribution > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--muted-foreground)]">Brokerage</span>
                <span className="text-sm font-medium text-[var(--foreground)]">{formatCurrency(savings_and_investments.brokerage_contribution)}</span>
              </div>
            )}
            {totalSavingsMonthly === 0 && (
              <p className="text-sm text-[var(--muted-foreground)]">
                No savings configured yet
              </p>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-[var(--border)]">
              <span className="text-sm font-semibold text-[var(--foreground)]">Total saved</span>
              <span className="text-sm font-bold text-[var(--foreground)]">{formatCurrency(totalSavingsMonthly)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-2 gap-4">

        {/* Net worth card */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">
              Net Worth
            </h3>
            <Link
              href="/dashboard/balance-sheet"
              className="flex items-center gap-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
              <Pencil size={12} />
              Edit
            </Link>
          </div>
          {!hasAssets ? (
            <div className="space-y-3">
              <p className="text-sm text-[var(--muted-foreground)]">
                Add your assets and debts to calculate net worth
              </p>
              <Link
                href="/dashboard/balance-sheet"
                className="flex items-center gap-1 text-xs text-[var(--primary)] font-medium"
              >
                <Plus size={12} /> Add assets &amp; debts
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--muted-foreground)]">Assets</span>
                <span className="text-sm font-medium text-[var(--foreground)]">{formatCurrency(bs.total_assets)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[var(--muted-foreground)]">Liabilities</span>
                <span className="text-sm font-medium text-red-500">-{formatCurrency(bs.total_liabilities)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-[var(--border)]">
                <span className="text-sm font-semibold text-[var(--foreground)]">Net worth</span>
                <span className={`text-sm font-bold ${bs.net_worth >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {formatCurrency(bs.net_worth)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Savings rate card */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--foreground)]">
              Savings Rate
            </h3>
          </div>
          {!hasIncome ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              Add income to calculate your savings rate
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-xs text-[var(--muted-foreground)]">
                    Total savings rate
                  </span>
                  <span className="text-2xl font-bold text-[var(--foreground)]">
                    {formatPercent(savingsRate)}
                  </span>
                </div>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {formatCurrency(totalSavingsMonthly)} saved of{' '}
                  {formatCurrency(pl.total_take_home)} take-home
                </p>
                <div className="mt-2 h-1.5 w-full bg-[var(--muted)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${Math.min(savingsRate, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-[var(--muted-foreground)]">0%</span>
                  <span className="text-xs text-[var(--muted-foreground)]">Target 20%</span>
                </div>
              </div>

              <div className="pt-3 border-t border-[var(--border)]">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-xs text-[var(--muted-foreground)]">
                    Retirement savings rate
                  </span>
                  <span className="text-lg font-semibold text-[var(--foreground)]">
                    {formatPercent(retirementRate)}
                  </span>
                </div>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {formatCurrency(retirementSavingsMonthly)}/mo toward retirement ·{' '}
                  target 15% of gross
                </p>
                <div className="mt-2 h-1.5 w-full bg-[var(--muted)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${Math.min(retirementRate / 15 * 100, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-[var(--muted-foreground)]">0%</span>
                  <span className="text-xs text-[var(--muted-foreground)]">Target 15% of gross</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}