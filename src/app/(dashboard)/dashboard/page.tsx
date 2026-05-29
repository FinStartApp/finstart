'use client'

import { useFinStartStore } from '@/store/useFinStartStore'
import {
  calculateMonthlyPL,
  calculateBalanceSheet,
  calculateHouseholdIncome,
  calculateEarner,
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
  ChevronDown,
} from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'

export default function DashboardPage() {
  const [warningDismissed, setWarningDismissed] = useState(false)
  const [incomeHovered, setIncomeHovered] = useState(false)
  const [taxExpanded, setTaxExpanded] = useState<Record<string, boolean>>({})

  const {
    earners,
    fixed_expenses,
    variable_expenses,
    savings_and_investments,
    assets,
    liabilities,
    state_of_residence,
    filing_status,
  } = useFinStartStore()

  const pl = calculateMonthlyPL(
    earners,
    fixed_expenses,
    variable_expenses,
    savings_and_investments,
    state_of_residence,
    filing_status
  )

  const bs = calculateBalanceSheet(assets, liabilities)
  const income = calculateHouseholdIncome(
    earners,
    state_of_residence,
    filing_status
  )

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

  function toggleTax(earnerId: string) {
    setTaxExpanded((prev) => ({
      ...prev,
      [earnerId]: !prev[earnerId],
    }))
  }

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

        {/* Income card with hover popover */}
        <div
          className="relative"
          onMouseEnter={() => setIncomeHovered(true)}
          onMouseLeave={() => {
            setIncomeHovered(false)
            setTaxExpanded({})
          }}
        >
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 relative">
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

          {/* Hover popover — real calculations */}
          {incomeHovered && hasIncome && (
            <div className="absolute left-full top-0 w-80 pl-3 z-50">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-lg p-4">
              <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-3">
                Paycheck breakdown
              </p>
              {earners.map((earner) => {
                const calc = calculateEarner(
                  earner,
                  state_of_residence,
                  filing_status
                )
                const isExpanded = taxExpanded[earner.id]
                return (
                  <div key={earner.id} className="mb-4 last:mb-0">
                    <p className="text-xs font-semibold text-[var(--foreground)] mb-2">
                      {earner.label}
                    </p>
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-xs text-[var(--muted-foreground)]">Gross</span>
                        <span className="text-xs font-medium text-[var(--foreground)]">{formatCurrency(calc.gross_monthly)}</span>
                      </div>
                      {calc.pretax_deductions_monthly > 0 && (
                        <div className="flex justify-between">
                          <span className="text-xs text-[var(--muted-foreground)]">Pre-tax deductions</span>
                          <span className="text-xs text-red-500">-{formatCurrency(calc.pretax_deductions_monthly)}</span>
                        </div>
                      )}
                      {(calc.total_401k_traditional_annual + calc.total_401k_roth_annual) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-xs text-[var(--muted-foreground)]">401(k)</span>
                          <span className="text-xs text-red-500">-{formatCurrency((calc.total_401k_traditional_annual + calc.total_401k_roth_annual) / 12)}</span>
                        </div>
                      )}
                      {calc.pension_contribution_monthly > 0 && (
                        <div className="flex justify-between">
                          <span className="text-xs text-[var(--muted-foreground)]">Pension contribution</span>
                          <span className="text-xs text-red-500">-{formatCurrency(calc.pension_contribution_monthly)}</span>
                        </div>
                      )}
                      {calc.posttax_deductions_monthly > 0 && (
                        <div className="flex justify-between">
                          <span className="text-xs text-[var(--muted-foreground)]">Post-tax deductions</span>
                          <span className="text-xs text-red-500">-{formatCurrency(calc.posttax_deductions_monthly)}</span>
                        </div>
                      )}

                      {/* Tax section with expand toggle */}
                      <div>
                        <button
                          onClick={() => toggleTax(earner.id)}
                          className="flex items-center justify-between w-full"
                        >
                          <span className="text-xs text-[var(--muted-foreground)]">
                            Est. taxes
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-red-500">
                              -{formatCurrency(calc.tax_breakdown.total_tax_monthly)}
                            </span>
                            <ChevronDown
                              size={11}
                              className={`text-[var(--muted-foreground)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            />
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="mt-1 ml-3 space-y-1">
                            <div className="flex justify-between">
                              <span className="text-xs text-[var(--muted-foreground)]">
                                Federal ({calc.gross_monthly > 0 ? ((calc.tax_breakdown.federal_tax_monthly / calc.gross_monthly) * 100).toFixed(1) : '0.0'}%)
                              </span>
                              <span className="text-xs text-red-400">-{formatCurrency(calc.tax_breakdown.federal_tax_monthly)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-xs text-[var(--muted-foreground)]">
                                State ({state_of_residence || 'N/A'}) ({calc.gross_monthly > 0 ? ((calc.tax_breakdown.state_tax_monthly / calc.gross_monthly) * 100).toFixed(1) : '0.0'}%)
                              </span>
                              <span className="text-xs text-red-400">-{formatCurrency(calc.tax_breakdown.state_tax_monthly)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-xs text-[var(--muted-foreground)]">Social Security (6.2%)</span>
                              <span className="text-xs text-red-400">-{formatCurrency(calc.tax_breakdown.social_security_monthly)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-xs text-[var(--muted-foreground)]">Medicare (1.45%)</span>
                              <span className="text-xs text-red-400">-{formatCurrency(calc.tax_breakdown.medicare_monthly)}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-between pt-1.5 border-t border-[var(--border)]">
                        <span className="text-xs font-semibold text-[var(--foreground)]">Net take-home</span>
                        <span className="text-xs font-bold text-emerald-600">{formatCurrency(calc.net_monthly_take_home)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            </div>
          )}
        </div>
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