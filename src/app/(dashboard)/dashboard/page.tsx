'use client'

import { useFinStartStore } from '@/store/useFinStartStore'
import {
  calculateMonthlyPL,
  calculateBalanceSheet,
  calculateHouseholdIncome,
  annualizedMonthlyDebt,
  resolveLineItemMonthly,
  calculateSubscriptionGroupsMonthly,
  formatCurrency,
  formatPercent,
} from '@/lib/calculations'
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  X,
  Plus,
  Pencil,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'

interface ExpenseRow {
  id: string
  label: string
  monthly: number
  type: 'category' | 'mortgage' | 'debt' | 'subscriptions'
  lineItems: { label: string; monthly: number }[]
}

export default function DashboardPage() {
  const [warningDismissed, setWarningDismissed] = useState(false)
  const [incomeHovered, setIncomeHovered]       = useState(false)
  const [taxExpanded, setTaxExpanded]           = useState<Record<string, boolean>>({})
  const [hoveredExpenseId, setHoveredExpenseId] = useState<string | null>(null)
  const [showSubsModal, setShowSubsModal]       = useState(false)

  const incomeHoverTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const expenseHoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollRef         = useRef<HTMLDivElement>(null)
  const [atBottom, setAtBottom] = useState(false)

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    // atBottom is true when within 4px of the bottom (handles subpixel rounding)
    setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 4)
  }

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
    earners, fixed_expenses, variable_expenses,
    savings_and_investments, state_of_residence, filing_status
  )
  const bs     = calculateBalanceSheet(assets, liabilities)
  const income = calculateHouseholdIncome(earners, state_of_residence, filing_status)
  const earnerCalcs = income.earner_calculations

  const hasIncome   = earners.some(e => e.gross_annual_salary > 0 || e.hourly_rate > 0)
  const hasExpenses = pl.total_fixed_expenses > 0 || pl.total_variable_expenses > 0
  const hasAssets   = assets.length > 0
  const anyDeductionsIncomplete = earners.some(e => !e.deductions_complete)

  const retirementSavingsMonthly = earners.reduce((sum, e) => {
    const trad = (e.gross_annual_salary * e.pre_tax_deductions.retirement401k_traditional_percent) / 100 / 12
    const roth = (e.gross_annual_salary * e.pre_tax_deductions.retirement401k_roth_percent) / 100 / 12
    return sum + trad + roth
  }, 0)
  const retirementRate      = income.total_gross_monthly > 0 ? (retirementSavingsMonthly / income.total_gross_monthly) * 100 : 0
  const totalSavingsMonthly = pl.total_savings + retirementSavingsMonthly
  const savingsRate         = income.total_take_home_monthly > 0 ? (totalSavingsMonthly / income.total_take_home_monthly) * 100 : 0
  const cashFlowPositive    = pl.net_cash_flow >= 0

  // ── Build sorted expense rows ───────────────────────────────────────────
  const expenseRows: ExpenseRow[] = []

  if (fixed_expenses.mortgage.is_active) {
    const mortgageMonthly =
      fixed_expenses.mortgage.pi_payment +
      fixed_expenses.mortgage.escrow_taxes +
      fixed_expenses.mortgage.escrow_insurance +
      fixed_expenses.mortgage.escrow_pmi
    if (mortgageMonthly > 0) {
      expenseRows.push({
        id: '__mortgage__', label: 'Mortgage', monthly: mortgageMonthly, type: 'mortgage',
        lineItems: [
          { label: 'P&I', monthly: fixed_expenses.mortgage.pi_payment },
          ...(fixed_expenses.mortgage.escrow_taxes     > 0 ? [{ label: 'Property taxes (escrow)',    monthly: fixed_expenses.mortgage.escrow_taxes     }] : []),
          ...(fixed_expenses.mortgage.escrow_insurance > 0 ? [{ label: "Homeowner's ins. (escrow)",  monthly: fixed_expenses.mortgage.escrow_insurance  }] : []),
          ...(fixed_expenses.mortgage.escrow_pmi       > 0 ? [{ label: 'PMI (escrow)',               monthly: fixed_expenses.mortgage.escrow_pmi        }] : []),
        ],
      })
    }
  }

  const allCategories = [
    ...fixed_expenses.categories,
    ...variable_expenses.categories,
  ].sort((a, b) => {
    const aNew = a.label === 'New category'
    const bNew = b.label === 'New category'
    if (aNew && !bNew) return 1
    if (!aNew && bNew) return -1
    return a.label.localeCompare(b.label)
  })

  for (const cat of allCategories) {
    const isHousing = cat.label.toLowerCase() === 'housing'
    const visibleItems = isHousing && fixed_expenses.mortgage.is_active
      ? cat.items.filter(i => i.label.toLowerCase() !== 'housing cost / rent')
      : cat.items
    const monthly   = visibleItems.reduce((sum, item) => sum + resolveLineItemMonthly(item), 0)
    const lineItems = visibleItems
      .map(item => ({ label: item.label || 'Untitled', monthly: resolveLineItemMonthly(item) }))
      .filter(li => li.monthly > 0)
    expenseRows.push({ id: cat.id, label: cat.label, monthly, type: 'category', lineItems })
  }

  const debtTotal = fixed_expenses.debt_payments.reduce((sum, d) => sum + annualizedMonthlyDebt(d), 0)
  if (fixed_expenses.debt_payments.length > 0) {
    expenseRows.push({
      id: '__debt__', label: 'Other debt payments', monthly: debtTotal, type: 'debt',
      lineItems: fixed_expenses.debt_payments
        .filter(d => d.monthly_payment > 0)
        .map(d => ({ label: d.label || 'Unnamed debt', monthly: annualizedMonthlyDebt(d) })),
    })
  }

  const subsTotal = calculateSubscriptionGroupsMonthly(fixed_expenses.subscription_groups)
  if (subsTotal > 0) {
    expenseRows.push({
      id: '__subscriptions__', label: 'Subscriptions & memberships',
      monthly: subsTotal, type: 'subscriptions', lineItems: [],
    })
  }

  // ── 150ms hover handlers — same pattern for both income and expenses ────
  // Income: enter starts timer, leave clears timer + hides immediately
  // The popover is absolutely positioned inside the same relative container
  // so mouse moving from card into popover never triggers onMouseLeave
  const handleIncomeEnter = useCallback(() => {
    if (incomeHoverTimer.current) clearTimeout(incomeHoverTimer.current)
    incomeHoverTimer.current = setTimeout(() => setIncomeHovered(true), 150)
  }, [])
  const handleIncomeLeave = useCallback(() => {
    if (incomeHoverTimer.current) clearTimeout(incomeHoverTimer.current)
    setIncomeHovered(false)
    setTaxExpanded({})
  }, [])

  // Expenses: per-row enter/leave with same 150ms enter delay
  const handleExpenseRowEnter = useCallback((id: string, hasItems: boolean) => {
    if (!hasItems) return
    if (expenseHoverTimer.current) clearTimeout(expenseHoverTimer.current)
    expenseHoverTimer.current = setTimeout(() => setHoveredExpenseId(id), 150)
  }, [])
  const handleExpenseAreaLeave = useCallback(() => {
    if (expenseHoverTimer.current) clearTimeout(expenseHoverTimer.current)
    setHoveredExpenseId(null)
  }, [])

  function toggleTax(earnerId: string) {
    setTaxExpanded(prev => ({ ...prev, [earnerId]: !prev[earnerId] }))
  }

  const hoveredRow = expenseRows.find(r => r.id === hoveredExpenseId)

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">

      {/* Deductions warning banner */}
      {anyDeductionsIncomplete && !warningDismissed && (
        <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-3">
            <AlertTriangle size={16} className="text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              Paycheck deductions not entered — take-home pay is estimated.{' '}
              <Link href="/dashboard/income" className="font-medium underline underline-offset-2">Complete now</Link>
            </p>
          </div>
          <button onClick={() => setWarningDismissed(true)} className="text-amber-600 hover:text-amber-800 transition-colors ml-4">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Net cash flow hero */}
      <div className="bg-card border border-border rounded-2xl p-6">
        {!hasIncome ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Monthly cash flow</p>
              <p className="text-2xl font-bold text-muted-foreground">—</p>
              <p className="text-sm text-muted-foreground mt-1">Add your income to see your financial picture</p>
            </div>
            <Link href="/dashboard/income" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all">
              <Plus size={15} /> Add Income
            </Link>
          </div>
        ) : (
          <div className="flex items-stretch divide-x divide-border w-full">
            {/* Cash flow */}
            <div className="flex flex-col justify-center pr-8 min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">Monthly cash flow</p>
              <div className="flex items-center gap-2">
                {cashFlowPositive ? <TrendingUp size={20} className="text-positive flex-shrink-0" /> : <TrendingDown size={20} className="text-negative flex-shrink-0" />}
                <span className={`text-3xl font-bold ${cashFlowPositive ? 'text-positive' : 'text-negative'}`}>
                  {cashFlowPositive ? '+' : ''}{formatCurrency(pl.net_cash_flow)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{formatCurrency(pl.net_cash_flow * 12)}/yr after expenses &amp; savings</p>
            </div>
            {/* Take-home */}
            <div className="flex flex-col justify-center px-8 min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">Take-home</p>
              <p className="text-3xl font-bold text-foreground">{formatCurrency(pl.total_take_home)}</p>
              <p className="text-xs text-muted-foreground mt-1">per month</p>
            </div>
            {/* Expenses */}
            <div className="flex flex-col justify-center px-8 min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">Expenses</p>
              <p className="text-3xl font-bold text-foreground">{formatCurrency(pl.total_expenses)}</p>
              <p className="text-xs text-muted-foreground mt-1">Fixed {formatCurrency(pl.total_fixed_expenses)} · Variable {formatCurrency(pl.total_variable_expenses)}</p>
            </div>
            {/* Savings */}
            <div className="flex flex-col justify-center pl-8 min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-1.5">Savings</p>
              <p className="text-3xl font-bold text-foreground">{formatCurrency(totalSavingsMonthly)}</p>
              <p className="text-xs text-muted-foreground mt-1">per month</p>
            </div>
          </div>
        )}
      </div>

      {/* Three summary cards */}
      <div className="grid grid-cols-3 gap-4 items-stretch">

        {/* ── Income card ── */}
        <div
          className="relative h-full"
          onMouseEnter={handleIncomeEnter}
          onMouseLeave={handleIncomeLeave}
        >
          <div className="bg-card border border-border rounded-2xl p-5 h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">Income</h3>
                {anyDeductionsIncomplete && <AlertTriangle size={13} className="text-amber-500" />}
              </div>
              <Link href="/dashboard/income" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <Pencil size={12} /> Edit
              </Link>
            </div>

            {!hasIncome ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">No income added yet</p>
                <Link href="/dashboard/income" className="flex items-center gap-1 text-xs text-primary font-medium">
                  <Plus size={12} /> Add income
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {earners.map((earner, i) => {
                  const calc = earnerCalcs[i]
                  const totalGross = calc.gross_monthly + calc.bonus_monthly
                  return (
                    <div key={earner.id}>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">{earner.label}</span>
                        <span className="text-sm font-medium text-foreground">{formatCurrency(totalGross)}</span>
                      </div>
                      {calc.bonus_monthly > 0 && (
                        <div className="ml-2">
                          <span className="text-xs text-muted-foreground">incl. {formatCurrency(calc.bonus_monthly)}/mo bonus</span>
                        </div>
                      )}
                    </div>
                  )
                })}
                <div className="flex justify-between items-center pt-2 mt-1 border-t border-border">
                  <span className="text-sm text-muted-foreground">Taxes &amp; deductions</span>
                  <span className="text-sm font-medium text-negative">
                    -{formatCurrency(earnerCalcs.reduce((sum, c) => sum + (c.gross_monthly + c.bonus_monthly - c.net_monthly_take_home), 0))}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-border">
                  <span className="text-sm font-semibold text-foreground">Take-home</span>
                  <span className="text-sm font-bold text-foreground">{formatCurrency(income.total_take_home_monthly)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Income popover — absolute inside relative container, same as original */}
          {incomeHovered && hasIncome && (
            <div className="absolute left-full top-0 w-80 pl-3 z-50">
              <div className="bg-card border border-border rounded-xl shadow-lg p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Paycheck breakdown</p>
                {earners.map((earner, i) => {
                  const calc = earnerCalcs[i]
                  const isExpanded = taxExpanded[earner.id]
                  // 401k total (traditional + Roth) — shown as one line
                  const total401kMonthly = (calc.total_401k_traditional_annual + calc.total_401k_roth_annual) / 12
                  // Other pre-tax = pretax_deductions_monthly minus traditional 401k
                  // (pretax includes traditional 401k + health/dental/vision + HSA/FSA + other pretax)
                  const otherPretaxMonthly = calc.pretax_deductions_monthly - (calc.total_401k_traditional_annual / 12)
                  // Other post-tax = posttax_deductions_monthly minus Roth 401k
                  // (posttax includes other_posttax + roth — Roth is already shown in 401k line)
                  const otherPosttaxMonthly = calc.posttax_deductions_monthly - (calc.total_401k_roth_annual / 12)
                  return (
                    <div key={earner.id} className="mb-4 last:mb-0">
                      <p className="text-xs font-semibold text-foreground mb-2">{earner.label}</p>
                      <div className="space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Gross salary</span>
                          <span className="text-xs font-medium text-foreground">{formatCurrency(calc.gross_monthly)}</span>
                        </div>
                        {calc.bonus_monthly > 0 && (
                          <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">Gross bonus</span>
                            <span className="text-xs font-medium text-foreground">+{formatCurrency(calc.bonus_monthly)}</span>
                          </div>
                        )}
                        {otherPretaxMonthly > 0 && (
                          <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">Other pre-tax</span>
                            <span className="text-xs text-negative">-{formatCurrency(otherPretaxMonthly)}</span>
                          </div>
                        )}
                        {total401kMonthly > 0 && (
                          <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">401(k)</span>
                            <span className="text-xs text-negative">-{formatCurrency(total401kMonthly)}</span>
                          </div>
                        )}
                        {calc.pension_contribution_monthly > 0 && (
                          <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">Pension contribution</span>
                            <span className="text-xs text-negative">-{formatCurrency(calc.pension_contribution_monthly)}</span>
                          </div>
                        )}
                        {otherPosttaxMonthly > 0 && (
                          <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">Other post-tax</span>
                            <span className="text-xs text-negative">-{formatCurrency(otherPosttaxMonthly)}</span>
                          </div>
                        )}
                        {calc.bonus_tax_monthly > 0 && (
                          <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">Bonus tax (22%)</span>
                            <span className="text-xs text-negative">-{formatCurrency(calc.bonus_tax_monthly)}</span>
                          </div>
                        )}
                        <div>
                          <button onClick={() => toggleTax(earner.id)} className="flex items-center justify-between w-full">
                            <span className="text-xs text-muted-foreground">Est. taxes (salary)</span>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-negative">-{formatCurrency(calc.tax_breakdown.total_tax_monthly)}</span>
                              <ChevronDown size={11} className={`text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                          </button>
                          {isExpanded && (
                            <div className="mt-1 ml-3 space-y-1">
                              <div className="flex justify-between">
                                <span className="text-xs text-muted-foreground">Federal ({calc.gross_monthly > 0 ? ((calc.tax_breakdown.federal_tax_monthly / calc.gross_monthly) * 100).toFixed(1) : '0.0'}%)</span>
                                <span className="text-xs text-negative">-{formatCurrency(calc.tax_breakdown.federal_tax_monthly)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-xs text-muted-foreground">State ({state_of_residence || 'N/A'}) ({calc.gross_monthly > 0 ? ((calc.tax_breakdown.state_tax_monthly / calc.gross_monthly) * 100).toFixed(1) : '0.0'}%)</span>
                                <span className="text-xs text-negative">-{formatCurrency(calc.tax_breakdown.state_tax_monthly)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-xs text-muted-foreground">Social Security (6.2%)</span>
                                <span className="text-xs text-negative">-{formatCurrency(calc.tax_breakdown.social_security_monthly)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-xs text-muted-foreground">Medicare (1.45%)</span>
                                <span className="text-xs text-negative">-{formatCurrency(calc.tax_breakdown.medicare_monthly)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex justify-between pt-1.5 border-t border-border">
                          <span className="text-xs font-semibold text-foreground">Net take-home</span>
                          <span className="text-xs font-bold text-positive">{formatCurrency(calc.net_monthly_take_home)}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Expenses card ── */}
        <div
          className="relative"
          onMouseEnter={() => {
            // Clear any pending hide timer when re-entering the card area
            if (expenseHoverTimer.current) clearTimeout(expenseHoverTimer.current)
          }}
          onMouseLeave={handleExpenseAreaLeave}
        >
          <div className="bg-card border border-border rounded-2xl p-5 h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Expenses</h3>
              <Link href="/dashboard/expenses" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <Pencil size={12} /> Edit
              </Link>
            </div>

            {!hasExpenses ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">No expenses added yet</p>
                <Link href="/dashboard/expenses" className="flex items-center gap-1 text-xs text-primary font-medium">
                  <Plus size={12} /> Add expenses
                </Link>
              </div>
            ) : (
              <div className="flex flex-col">
                <div className="relative">
                  <div
                    ref={scrollRef}
                    onScroll={handleScroll}
                    className="overflow-y-auto space-y-0.5"
                    style={{ maxHeight: 220 }}
                  >
                    {expenseRows.map(row => {
                      const hasDetail = row.lineItems.length > 0
                      const isSubs    = row.type === 'subscriptions'
                      const isActive  = hoveredExpenseId === row.id
                      const isEmpty   = row.monthly === 0
                      return (
                        <div
                          key={row.id}
                          className={`flex justify-between items-center px-1.5 py-1 rounded-lg transition-colors ${
                            isEmpty ? 'opacity-40 cursor-default' :
                            hasDetail || isSubs ? 'cursor-pointer' : 'cursor-default'
                          } ${!isEmpty && (isActive ? 'bg-hover' : 'hover:bg-hover')}`}
                          onMouseEnter={() => {
                            if (isEmpty || isSubs) return
                            handleExpenseRowEnter(row.id, hasDetail)
                          }}
                          onMouseLeave={() => {
                            if (isEmpty) return
                            if (expenseHoverTimer.current) clearTimeout(expenseHoverTimer.current)
                            expenseHoverTimer.current = setTimeout(() => setHoveredExpenseId(null), 200)
                          }}
                          onClick={() => { if (isSubs && !isEmpty) setShowSubsModal(true) }}
                        >
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="text-sm text-muted-foreground truncate">{row.label}</span>
                            {isSubs && <ChevronRight size={11} className="text-muted-foreground flex-shrink-0" />}
                          </div>
                          <span className={`text-sm font-medium flex-shrink-0 ml-2 ${row.monthly === 0 ? 'text-muted-foreground' : 'text-foreground'}`}>
                            {formatCurrency(row.monthly)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  {!atBottom && (
                    <div
                      className="absolute bottom-0 left-0 right-0 h-6 pointer-events-none rounded-b-lg"
                      style={{ background: 'linear-gradient(to bottom, transparent, var(--card))' }}
                    />
                  )}
                </div>
                <div className="flex justify-between items-center pt-2 mt-2 border-t border-border">
                  <span className="text-sm font-semibold text-foreground">Total</span>
                  <span className="text-sm font-bold text-foreground">{formatCurrency(pl.total_expenses)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Expense popover — absolute inside relative container, same pattern as income */}
          {hoveredRow && hoveredRow.lineItems.length > 0 && (
            <div
              className="absolute left-full top-0 w-72 pl-3 z-50"
              onMouseEnter={() => {
                // Cancel the hide timer when mouse enters the popover
                if (expenseHoverTimer.current) clearTimeout(expenseHoverTimer.current)
              }}
              onMouseLeave={handleExpenseAreaLeave}
            >
              <div className="bg-card border border-border rounded-xl shadow-lg p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  {hoveredRow.label}
                </p>
                <div className="space-y-1.5">
                  {hoveredRow.lineItems.map((li, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground truncate mr-2">{li.label}</span>
                      <span className="text-xs font-medium text-foreground flex-shrink-0 font-[tabular-nums]">{formatCurrency(li.monthly)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-1.5 border-t border-border">
                    <span className="text-xs font-semibold text-foreground">Total</span>
                    <span className="text-xs font-bold text-foreground font-[tabular-nums]">{formatCurrency(hoveredRow.monthly)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Savings card */}
        <div className="bg-card border border-border rounded-2xl p-5 h-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Savings</h3>
            <Link href="/dashboard/savings" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Pencil size={12} /> Edit
            </Link>
          </div>
          <div className="space-y-2">
            {retirementSavingsMonthly > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">401(k) contributions</span>
                <span className="text-sm font-medium text-foreground">{formatCurrency(retirementSavingsMonthly)}</span>
              </div>
            )}
            {savings_and_investments.emergency_fund_contribution > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Emergency fund</span>
                <span className="text-sm font-medium text-foreground">{formatCurrency(savings_and_investments.emergency_fund_contribution)}</span>
              </div>
            )}
            {savings_and_investments.brokerage_contribution > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Brokerage</span>
                <span className="text-sm font-medium text-foreground">{formatCurrency(savings_and_investments.brokerage_contribution)}</span>
              </div>
            )}
            {totalSavingsMonthly === 0 && (
              <p className="text-sm text-muted-foreground">No savings configured yet</p>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-border">
              <span className="text-sm font-semibold text-foreground">Total saved</span>
              <span className="text-sm font-bold text-foreground">{formatCurrency(totalSavingsMonthly)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-2 gap-4">

        {/* Net worth card */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Net Worth</h3>
            <Link href="/dashboard/balance-sheet" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <Pencil size={12} /> Edit
            </Link>
          </div>
          {!hasAssets ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Add your assets and debts to calculate net worth</p>
              <Link href="/dashboard/balance-sheet" className="flex items-center gap-1 text-xs text-primary font-medium">
                <Plus size={12} /> Add assets &amp; debts
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Assets</span>
                <span className="text-sm font-medium text-foreground">{formatCurrency(bs.total_assets)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Liabilities</span>
                <span className="text-sm font-medium text-negative">-{formatCurrency(bs.total_liabilities)}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-border">
                <span className="text-sm font-semibold text-foreground">Net worth</span>
                <span className={`text-sm font-bold ${bs.net_worth >= 0 ? 'text-positive' : 'text-negative'}`}>
                  {formatCurrency(bs.net_worth)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Savings rate card */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Savings Rate</h3>
          </div>
          {!hasIncome ? (
            <p className="text-sm text-muted-foreground">Add income to calculate your savings rate</p>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Total savings rate</span>
                  <span className="text-2xl font-bold text-foreground">{formatPercent(savingsRate)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(totalSavingsMonthly)} saved of {formatCurrency(pl.total_take_home)} take-home
                </p>
                <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${Math.min(savingsRate, 100)}%` }} />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-muted-foreground">0%</span>
                  <span className="text-xs text-muted-foreground">Target 20%</span>
                </div>
              </div>
              <div className="pt-3 border-t border-border">
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Retirement savings rate</span>
                  <span className="text-lg font-semibold text-foreground">{formatPercent(retirementRate)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(retirementSavingsMonthly)}/mo toward retirement · target 15% of gross
                </p>
                <div className="mt-2 h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-positive rounded-full transition-all" style={{ width: `${Math.min(retirementRate / 15 * 100, 100)}%` }} />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-muted-foreground">0%</span>
                  <span className="text-xs text-muted-foreground">Target 15% of gross</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Subscriptions read-only modal */}
      {showSubsModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 p-4"
          onClick={e => { if (e.target === e.currentTarget) setShowSubsModal(false) }}
        >
          <div className="bg-card rounded-xl border border-border w-full max-w-xl max-h-[85vh] flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <span className="text-base font-bold text-foreground">Subscriptions &amp; memberships</span>
              <div className="flex items-center gap-4">
                <span className="text-xs text-muted-foreground">
                  Total: <span className="text-foreground font-semibold font-[tabular-nums]">{formatCurrency(subsTotal)} / mo</span>
                </span>
                <button onClick={() => setShowSubsModal(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {fixed_expenses.subscription_groups.filter(g => g.subscriptions.length > 0).map(group => {
                const groupTotal = group.subscriptions.reduce((sum, s) => {
                  const freq = s.frequency; const amt = s.amount
                  if (freq === 'weekly') return sum + (amt * 52) / 12
                  if (freq === 'biweekly') return sum + (amt * 26) / 12
                  if (freq === 'quarterly') return sum + amt / 3
                  if (freq === 'annual') return sum + amt / 12
                  return sum + amt
                }, 0)
                return (
                  <div key={group.id} className="border-b border-border last:border-0">
                    <div className="flex items-center justify-between px-5 py-2.5 bg-secondary">
                      <span className="text-[11px] font-bold text-foreground uppercase tracking-wide">{group.name}</span>
                      <span className="text-sm font-bold text-foreground font-[tabular-nums]">{formatCurrency(groupTotal)} / mo</span>
                    </div>
                    <div className="px-5">
                      {group.subscriptions.map(sub => {
                        const freq = sub.frequency; const amt = sub.amount
                        let monthly = amt
                        if (freq === 'weekly') monthly = (amt * 52) / 12
                        else if (freq === 'biweekly') monthly = (amt * 26) / 12
                        else if (freq === 'quarterly') monthly = amt / 3
                        else if (freq === 'annual') monthly = amt / 12
                        const freqLabel = freq === 'weekly' ? '/wk' : freq === 'biweekly' ? '/2wk' : freq === 'monthly' ? '/mo' : freq === 'quarterly' ? '/qtr' : '/yr'
                        return (
                          <div key={sub.id} className="flex items-center gap-2 py-1.5 border-b border-muted last:border-0">
                            <span className="text-xs text-foreground flex-1">{sub.name || 'Unnamed'}</span>
                            <span className="text-xs text-muted-foreground font-[tabular-nums]">{formatCurrency(amt)} {freqLabel}</span>
                            <span className="text-xs text-muted-foreground">·</span>
                            <span className="text-xs font-medium text-foreground font-[tabular-nums]">{formatCurrency(monthly)}/mo</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="px-5 py-3 border-t border-border flex justify-between items-center">
              <Link href="/dashboard/expenses" onClick={() => setShowSubsModal(false)} className="text-xs text-accent hover:underline">
                Edit subscriptions →
              </Link>
              <button onClick={() => setShowSubsModal(false)} className="bg-primary text-primary-foreground text-xs font-semibold px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity">
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}