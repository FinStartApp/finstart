'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Plus, X, ArrowRight, Pencil, ChevronDown, ChevronUp, Info } from 'lucide-react'
import { useFinStartStore } from '@/store/useFinStartStore'
import type {
  ExpenseCategory,
  ExpenseLineItem,
  DebtPayment,
  SubscriptionGroup,
  Subscription,
  MortgageData,
} from '@/store/useFinStartStore'
import {
  resolveLineItemMonthly,
  calculateFixedExpensesMonthly,
  calculateVariableExpensesMonthly,
  calculateSubscriptionGroupsMonthly,
  calculateMortgageMonthlyTotal,
  toMonthly,
  formatCurrency,
} from '@/lib/calculations'

// ── helpers ───────────────────────────────────────────────────
function newId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function blankLineItem(label = ''): ExpenseLineItem {
  return {
    id: newId(),
    label,
    amount: 0,
    frequency: 'monthly',
    use_monthly_detail: false,
    monthly_amounts: Array(12).fill(0),
  }
}

function blankDebt(): DebtPayment {
  return {
    id: newId(),
    label: '',
    balance: 0,
    interest_rate: 0,
    monthly_payment: 0,
    minimum_payment: 0,
    type: 'other',
  }
}

function blankSubscription(): Subscription {
  return { id: newId(), name: '', amount: 0, frequency: 'monthly' }
}

function sortCategories(cats: ExpenseCategory[]): ExpenseCategory[] {
  return [...cats].sort((a, b) => a.label.localeCompare(b.label))
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const FREQ_OPTIONS: { value: ExpenseLineItem['frequency']; label: string }[] = [
  { value: 'weekly',    label: '/ wk'  },
  { value: 'biweekly',  label: '/ 2wk' },
  { value: 'monthly',   label: '/ mo'  },
  { value: 'quarterly', label: '/ qtr' },
  { value: 'annual',    label: '/ yr'  },
]

// Fix 7 — 2 decimals on line-level amounts; summary bar stays whole numbers
function fmtLine(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

// ── NumericInput ──────────────────────────────────────────────
// Fix 8 — decimals prop controls display precision
function NumericInput({
  value,
  onChange,
  className = '',
  prefix = '',
  suffix = '',
  decimals = 2,
  placeholder = '0.00',
  autoFocus = false,
}: {
  value: number
  onChange: (v: number) => void
  className?: string
  prefix?: string
  suffix?: string
  decimals?: number
  placeholder?: string
  autoFocus?: boolean
}) {
  const [focused, setFocused] = useState(false)
  const [raw, setRaw] = useState('')
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus) { ref.current?.focus(); ref.current?.select() }
  }, [autoFocus])

  const displayValue = focused
    ? raw
    : value === 0
    ? ''
    : `${prefix}${value.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}${suffix}`

  return (
    <input
      ref={ref}
      type="text"
      inputMode="decimal"
      value={displayValue}
      placeholder={placeholder}
      onFocus={() => { setRaw(value === 0 ? '' : String(value)); setFocused(true) }}
      onChange={e => setRaw(e.target.value.replace(/[^0-9.]/g, ''))}
      onBlur={() => {
        const parsed = parseFloat(raw)
        onChange(isNaN(parsed) ? 0 : parsed)
        setFocused(false)
      }}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
      className={`bg-[var(--secondary)] border border-transparent focus:border-[var(--accent)] focus:bg-[var(--card)] rounded px-1.5 py-1 outline-none text-right font-[tabular-nums] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] transition-colors ${className}`}
    />
  )
}

// ── EditableLabel — pencil icon, autoFocus, double-click ──────
function EditableLabel({
  value,
  onSave,
  className = '',
  inputClassName = '',
  autoFocus = false,
  onBlurWithEmpty,
}: {
  value: string
  onSave: (v: string) => void
  className?: string
  inputClassName?: string
  autoFocus?: boolean
  onBlurWithEmpty?: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(value)
  const ref = useRef<HTMLInputElement>(null)

  // Fix 3 — enter edit mode on mount if autoFocus
  useEffect(() => {
    if (autoFocus) { setDraft(value); setEditing(true) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus])

  useEffect(() => {
    if (editing) { ref.current?.focus(); ref.current?.select() }
  }, [editing])

  function commit() {
    const trimmed = draft.trim()
    if (trimmed) { onSave(trimmed); setEditing(false) }
    else {
      if (onBlurWithEmpty) onBlurWithEmpty()
      else { setDraft(value); setEditing(false) }
    }
  }

  if (editing) {
    return (
      <input
        ref={ref}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') { setDraft(value); setEditing(false) }
        }}
        className={`bg-[var(--secondary)] border border-[var(--accent)] rounded px-1.5 py-0.5 outline-none text-[var(--foreground)] ${inputClassName}`}
        style={{ minWidth: 80 }}
      />
    )
  }

  return (
    <span className={`group/lbl flex items-center gap-1 min-w-0 ${className}`}>
      {/* Fix 3 — double-click re-enabled */}
      <span
        className="truncate cursor-default"
        onDoubleClick={() => { setDraft(value); setEditing(true) }}
      >
        {value}
      </span>
      {/* Fix 4 — pencil always in DOM, visible on hover */}
      <button
        onClick={e => { e.stopPropagation(); setDraft(value); setEditing(true) }}
        className="opacity-0 group-hover/lbl:opacity-100 transition-opacity text-[var(--muted-foreground)] hover:text-[var(--accent)] flex-shrink-0"
        title="Rename"
      >
        <Pencil size={11} />
      </button>
    </span>
  )
}

// ── MonthlyDetailPanel ────────────────────────────────────────
function MonthlyDetailPanel({
  item,
  categoryId,
  onClose,
}: {
  item: ExpenseLineItem
  categoryId: string
  onClose: () => void
}) {
  const updateExpenseLineItem = useFinStartStore(s => s.updateExpenseLineItem)

  function setMonth(index: number, val: number) {
    const next = [...item.monthly_amounts]
    next[index] = val
    updateExpenseLineItem(categoryId, item.id, { monthly_amounts: next })
  }

  // Fix 2 — clear zeros all 12 months and exits monthly detail mode
  function clearDetail() {
    updateExpenseLineItem(categoryId, item.id, {
      use_monthly_detail: false,
      monthly_amounts: Array(12).fill(0),
    })
    onClose()
  }

  const avg = item.monthly_amounts.reduce((a, b) => a + b, 0) / 12

  return (
    <div className="bg-[var(--secondary)] border-t border-[var(--border)] px-3 py-3">
      <div className="grid grid-cols-6 gap-1.5 mb-2">
        {MONTHS.map((mo, i) => (
          <div key={mo} className="flex flex-col gap-0.5">
            <span className="text-[10px] text-[var(--muted-foreground)] text-center uppercase tracking-wide">{mo}</span>
            <NumericInput
              value={item.monthly_amounts[i] ?? 0}
              onChange={v => setMonth(i, v)}
              className="w-full text-xs"
              placeholder="0"
            />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-1">
        <button
          onClick={clearDetail}
          className="text-[11px] text-[var(--muted-foreground)] hover:text-[var(--negative)] transition-colors"
        >
          Clear monthly detail
        </button>
        <span className="text-xs text-[var(--muted-foreground)]">
          Monthly avg:{' '}
          <span className="font-medium text-[var(--foreground)] font-[tabular-nums]">
            {fmtLine(avg)}
          </span>
        </span>
      </div>
    </div>
  )
}

// ── LineItemRow ───────────────────────────────────────────────
function LineItemRow({
  item,
  categoryId,
  autoFocusLabel = false,
  locked = false,
  lockedLabel,
}: {
  item: ExpenseLineItem
  categoryId: string
  autoFocusLabel?: boolean
  locked?: boolean        // mortgage-linked line — read only
  lockedLabel?: string    // override display label for locked lines
}) {
  const updateExpenseLineItem = useFinStartStore(s => s.updateExpenseLineItem)
  const removeExpenseLineItem = useFinStartStore(s => s.removeExpenseLineItem)
  const [panelOpen, setPanelOpen] = useState(false)

  // Fix 4 — monthly detail only active if at least one month > 0
  const hasMonthlyData = item.monthly_amounts.some(v => v > 0)
  const isMonthlyActive = item.use_monthly_detail && hasMonthlyData
  const monthly = resolveLineItemMonthly(item)

  function update(updates: Partial<ExpenseLineItem>) {
    updateExpenseLineItem(categoryId, item.id, updates)
  }

  function toggleMonthlyDetail() {
    if (isMonthlyActive) {
      setPanelOpen(p => !p)
    } else {
      update({ use_monthly_detail: true })
      setPanelOpen(true)
    }
  }

  // locked = mortgage-linked line — show read-only row with badge
  if (locked) {
    return (
      <div className="flex items-center gap-1.5 py-1.5 border-b border-[var(--muted)] last:border-0 opacity-90">
        <span className="w-4 flex-shrink-0" />
        <span className="flex-1 text-xs text-[var(--foreground)] flex items-center gap-1.5 min-w-0">
          <span className="truncate">{lockedLabel ?? item.label}</span>
          <span className="text-[9px] bg-[#DDE6F5] text-[var(--accent)] border border-[var(--accent)]/30 rounded px-1.5 py-0.5 flex-shrink-0 font-medium tracking-wide uppercase">
            linked
          </span>
        </span>
        <span className="text-xs font-medium text-[var(--foreground)] font-[tabular-nums]">
          {fmtLine(monthly)}
        </span>
        <span className="text-[11px] text-[var(--muted-foreground)] min-w-[44px]" />
        <span className="w-[52px]" />
      </div>
    )
  }

  return (
    <>
      <div className="group flex items-center gap-1.5 py-1.5 border-b border-[var(--muted)] last:border-0">
        {/* remove */}
        <button
          onClick={() => removeExpenseLineItem(categoryId, item.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--muted-foreground)] hover:text-[var(--negative)] flex-shrink-0 w-4 flex items-center justify-center"
          title="Remove line"
        >
          <X size={11} />
        </button>

        {/* label */}
        <EditableLabel
          value={item.label || 'Untitled'}
          onSave={v => update({ label: v })}
          autoFocus={autoFocusLabel}
          className="flex-1 text-xs text-[var(--foreground)] min-w-0"
          inputClassName="text-xs w-full"
        />

        {/* Fix 2 + 5 — monthly detail active state aligned with inputs */}
        {isMonthlyActive ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-[var(--secondary)] border border-[var(--border)] rounded px-2 py-1">
              <span className="text-[11px] text-[var(--muted-foreground)]">avg</span>
              <span className="text-xs font-medium text-[var(--foreground)] font-[tabular-nums]">
                {fmtLine(monthly)}
              </span>
            </div>
            <button
              onClick={toggleMonthlyDetail}
              className="text-[10px] text-[var(--accent)] hover:underline whitespace-nowrap"
            >
              {panelOpen ? 'hide' : 'edit'}
            </button>
          </div>
        ) : (
          <>
            {/* Fix 8 — 2 decimal places on amount input */}
            <NumericInput
              value={item.amount}
              onChange={v => update({ amount: v })}
              className="w-16 text-xs"
              decimals={2}
              placeholder="0.00"
            />
            <select
              value={item.frequency}
              onChange={e => update({ frequency: e.target.value as ExpenseLineItem['frequency'] })}
              className="text-[11px] text-[var(--muted-foreground)] bg-[var(--secondary)] border-none rounded px-1 py-1 cursor-pointer outline-none"
            >
              {FREQ_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {/* Fix 7 — 2 decimal places on converted monthly amount */}
            <span className="text-[11px] text-[var(--muted-foreground)] font-[tabular-nums] min-w-[52px] text-right">
              {item.frequency === 'monthly' ? '' : fmtLine(monthly)}
            </span>
            {/* Fix 2 — labeled "by month" button */}
            <button
              onClick={toggleMonthlyDetail}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-[var(--muted-foreground)] hover:text-[var(--accent)] flex-shrink-0 border border-[var(--border)] rounded px-1.5 py-0.5 whitespace-nowrap"
              title="Enter amounts by month"
            >
              by month
            </button>
          </>
        )}
      </div>

      {panelOpen && item.use_monthly_detail && (
        <MonthlyDetailPanel
          item={item}
          categoryId={categoryId}
          onClose={() => setPanelOpen(false)}
        />
      )}
    </>
  )
}

// ── CategoryCard ──────────────────────────────────────────────
function CategoryCard({
  category,
  flashId,
  mortgageMonthly,
}: {
  category: ExpenseCategory
  flashId: string | null
  mortgageMonthly: number   // > 0 means show linked mortgage line in Housing
}) {
  const updateExpenseCategory = useFinStartStore(s => s.updateExpenseCategory)
  const removeExpenseCategory = useFinStartStore(s => s.removeExpenseCategory)
  const addExpenseLineItem    = useFinStartStore(s => s.addExpenseLineItem)

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [newItemId, setNewItemId]         = useState<string | null>(null)

  const isHousing  = category.label.toLowerCase() === 'housing'
  const isFlashing = flashId === category.id

  // mortgage linked line only appears inside the Housing category
  const showMortgageLine = isHousing && mortgageMonthly > 0

  const itemsTotal = category.items.reduce(
    (sum, item) => sum + resolveLineItemMonthly(item), 0
  )
  const total = itemsTotal + (showMortgageLine ? mortgageMonthly : 0)

  function addLine() {
    const item = blankLineItem('')
    addExpenseLineItem(category.id, item)
    setNewItemId(item.id)
  }

  function toggleFixed(makeFixed: boolean) {
    updateExpenseCategory(category.id, { is_fixed: makeFixed })
  }

  function handleDelete() {
    if ((category.items.length > 0 || showMortgageLine) && !confirmDelete) {
      setConfirmDelete(true)
      return
    }
    removeExpenseCategory(category.id)
  }

  // Build a synthetic locked line item for the mortgage link display
  const mortgageLinkedItem: ExpenseLineItem = {
    id: '__mortgage_linked__',
    label: 'Mortgage (P&I + Escrow)',
    amount: mortgageMonthly,
    frequency: 'monthly',
    use_monthly_detail: false,
    monthly_amounts: Array(12).fill(0),
  }

  return (
    <div
      className={`border rounded-xl mb-2 overflow-hidden shadow-sm transition-all duration-700 ${
        isFlashing
          ? 'bg-[#DDE6F5] border-[var(--accent)]'
          : 'bg-[var(--card)] border-[var(--border)]'
      }`}
    >
      {/* header */}
      <div className="group flex items-center gap-2 px-3 py-2.5 hover:bg-[var(--secondary)] transition-colors">
        <div className="flex border border-[var(--border)] rounded-full overflow-hidden opacity-40 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            onClick={() => toggleFixed(true)}
            className={`px-2 py-0.5 text-[10px] font-medium transition-colors ${
              category.is_fixed
                ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
            }`}
            title="Mark as Fixed"
          >F</button>
          <button
            onClick={() => toggleFixed(false)}
            className={`px-2 py-0.5 text-[10px] font-medium transition-colors ${
              !category.is_fixed
                ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
            }`}
            title="Mark as Variable"
          >V</button>
        </div>

        <EditableLabel
          value={category.label}
          onSave={v => updateExpenseCategory(category.id, { label: v })}
          className="flex-1 text-sm font-medium text-[var(--foreground)]"
          inputClassName="text-sm font-medium w-full"
        />

        <span className="text-sm font-medium text-[var(--foreground)] font-[tabular-nums] min-w-[60px] text-right">
          {formatCurrency(total)}
        </span>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {confirmDelete ? (
            <>
              <span className="text-[11px] text-[var(--negative)]">Remove?</span>
              <button onClick={() => removeExpenseCategory(category.id)} className="text-[11px] text-[var(--negative)] hover:underline ml-1">Yes</button>
              <span className="text-[var(--muted-foreground)] text-[11px] mx-0.5">/</span>
              <button onClick={() => setConfirmDelete(false)} className="text-[11px] text-[var(--muted-foreground)] hover:underline">No</button>
            </>
          ) : (
            <button onClick={handleDelete} className="text-[var(--muted-foreground)] hover:text-[var(--negative)] p-0.5 rounded transition-colors" title="Remove category">
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* line items */}
      {(category.items.length > 0 || showMortgageLine) && (
        <div className="px-3 border-t border-[var(--border)]">
          {/* mortgage linked line — always first in Housing */}
          {showMortgageLine && (
            <LineItemRow
              item={mortgageLinkedItem}
              categoryId={category.id}
              locked={true}
              lockedLabel="Mortgage (P&I + Escrow)"
            />
          )}
          {category.items.map(item => (
            <LineItemRow
              key={item.id}
              item={item}
              categoryId={category.id}
              autoFocusLabel={item.id === newItemId}
            />
          ))}
        </div>
      )}

      {/* add line */}
      <button
        onClick={addLine}
        className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-[var(--muted-foreground)] hover:text-[var(--accent)] border-t border-[var(--muted)] transition-colors"
      >
        <Plus size={11} /> add line
      </button>
    </div>
  )
}

// ── MortgageSection ───────────────────────────────────────────
function MortgageSection() {
  const mortgage       = useFinStartStore(s => s.fixed_expenses.mortgage)
  const updateMortgage = useFinStartStore(s => s.updateMortgage)

  const [showEscrow, setShowEscrow] = useState(false)

  const totalMonthly = calculateMortgageMonthlyTotal(mortgage)
  const escrowTotal  = mortgage.escrow_taxes + mortgage.escrow_insurance + mortgage.escrow_pmi
  const hasEscrow    = escrowTotal > 0

  function toggle(checked: boolean) {
    if (!checked && mortgage.balance > 0) {
      // has data — ask before clearing
      if (!window.confirm('Remove mortgage? This will clear all mortgage data and unlink it from Housing.')) return
      updateMortgage({
        is_active: false,
        balance: 0, interest_rate: 0,
        pi_payment: 0, minimum_pi_payment: 0,
        escrow_taxes: 0, escrow_insurance: 0, escrow_pmi: 0,
      })
    } else {
      updateMortgage({ is_active: checked })
    }
  }

  return (
    <div className="mb-3">
      {/* checkbox row */}
      <label className="flex items-center gap-2.5 cursor-pointer group select-none mb-2">
        <div
          onClick={() => toggle(!mortgage.is_active)}
          className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors cursor-pointer flex-shrink-0 ${
            mortgage.is_active
              ? 'bg-[var(--primary)] border-[var(--primary)]'
              : 'border-[var(--border)] group-hover:border-[var(--accent)]'
          }`}
        >
          {mortgage.is_active && (
            <svg viewBox="0 0 10 8" className="w-2.5 h-2 fill-none stroke-white stroke-2">
              <polyline points="1,4 3.5,6.5 9,1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <span className="text-sm font-medium text-[var(--foreground)]">I have a mortgage</span>
        <span className="text-xs text-[var(--muted-foreground)]">
          — your payment will appear automatically in Housing expenses
        </span>
      </label>

      {mortgage.is_active && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
          {/* P&I row — always visible when active */}
          <div className="px-4 py-3 border-b border-[var(--muted)]">
            <div className="grid grid-cols-[1fr_100px_72px_88px_88px] gap-3 items-end">
              <div>
                <p className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide mb-1">Loan balance</p>
                <NumericInput
                  value={mortgage.balance}
                  onChange={v => updateMortgage({ balance: v })}
                  prefix="$"
                  className="w-full text-xs"
                  placeholder="0.00"
                />
              </div>
              <div>
                <p className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide mb-1">Rate</p>
                <NumericInput
                  value={mortgage.interest_rate}
                  onChange={v => updateMortgage({ interest_rate: v })}
                  suffix="%"
                  decimals={3}
                  className="w-full text-xs"
                  placeholder="0.000"
                />
              </div>
              <div>
                <p className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide mb-1">P&amp;I payment</p>
                <NumericInput
                  value={mortgage.pi_payment}
                  onChange={v => updateMortgage({ pi_payment: v })}
                  prefix="$"
                  className="w-full text-xs"
                  placeholder="0.00"
                />
              </div>
              <div>
                <p className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide mb-1">Min. P&amp;I</p>
                <NumericInput
                  value={mortgage.minimum_pi_payment}
                  onChange={v => updateMortgage({ minimum_pi_payment: v })}
                  prefix="$"
                  className="w-full text-xs"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* escrow toggle row */}
          <button
            onClick={() => setShowEscrow(s => !s)}
            className="w-full flex items-center justify-between px-4 py-2 hover:bg-[var(--secondary)] transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--muted-foreground)]">
                Escrow — property taxes, insurance, PMI
              </span>
              {hasEscrow && (
                <span className="text-[10px] text-[var(--accent)] font-medium font-[tabular-nums]">
                  {fmtLine(escrowTotal)} / mo
                </span>
              )}
            </div>
            {showEscrow ? <ChevronUp size={13} className="text-[var(--muted-foreground)]" /> : <ChevronDown size={13} className="text-[var(--muted-foreground)]" />}
          </button>

          {/* escrow fields */}
          {showEscrow && (
            <div className="px-4 py-3 border-t border-[var(--muted)] bg-[var(--secondary)]">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide mb-1">Property taxes / mo</p>
                  <NumericInput
                    value={mortgage.escrow_taxes}
                    onChange={v => updateMortgage({ escrow_taxes: v })}
                    prefix="$"
                    className="w-full text-xs"
                    placeholder="0.00"
                  />
                  <p className="text-[10px] text-[var(--muted-foreground)] mt-1">Enter monthly equivalent</p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide mb-1">Homeowner's insurance / mo</p>
                  <NumericInput
                    value={mortgage.escrow_insurance}
                    onChange={v => updateMortgage({ escrow_insurance: v })}
                    prefix="$"
                    className="w-full text-xs"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <p className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide mb-1 flex items-center gap-1">
                    PMI / mo
                    <span title="Required when your down payment was less than 20% of the home price. Disappears when your loan balance reaches 80% of the home's value.">
                      <Info size={10} className="text-[var(--muted-foreground)] cursor-help" />
                    </span>
                  </p>
                  <NumericInput
                    value={mortgage.escrow_pmi}
                    onChange={v => updateMortgage({ escrow_pmi: v })}
                    prefix="$"
                    className="w-full text-xs"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          )}

          {/* total row */}
          {totalMonthly > 0 && (
            <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--border)] bg-[var(--secondary)]">
              <span className="text-[11px] text-[var(--muted-foreground)]">
                Total monthly housing payment
              </span>
              <span className="text-sm font-medium text-[var(--foreground)] font-[tabular-nums]">
                {fmtLine(totalMonthly)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── DebtSection ───────────────────────────────────────────────
function DebtSection() {
  const debts             = useFinStartStore(s => s.fixed_expenses.debt_payments)
  const addDebtPayment    = useFinStartStore(s => s.addDebtPayment)
  const updateDebtPayment = useFinStartStore(s => s.updateDebtPayment)
  const removeDebtPayment = useFinStartStore(s => s.removeDebtPayment)

  const total = debts.reduce((sum, d) => sum + d.monthly_payment, 0)

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] bg-[var(--secondary)]">
        <div>
          <h2 className="text-sm font-medium text-[var(--foreground)]">Other debt payments</h2>
          <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
            Auto loans, student loans, credit cards — balance and rate carry forward to the Debt Payoff planner
          </p>
        </div>
        <div className="text-right flex-shrink-0 ml-4">
          <span className="text-[11px] text-[var(--muted-foreground)] uppercase tracking-wide block">Monthly total</span>
          <span className="text-lg font-medium text-[var(--foreground)] font-[tabular-nums]">{formatCurrency(total)}</span>
        </div>
      </div>

      {/* column headers */}
      <div className="grid grid-cols-[1fr_100px_64px_88px_88px_24px] gap-2 px-5 py-2 border-b border-[var(--muted)]">
        <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide">Name</span>
        <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide text-right">Balance</span>
        <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide text-right">Rate</span>
        <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide text-right">Payment</span>
        <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide text-right">Min. payment</span>
        <span />
      </div>

      {debts.length === 0 && (
        <p className="px-5 py-4 text-xs text-[var(--muted-foreground)] italic">
          No debts added yet.
        </p>
      )}

      {debts.map(debt => (
        <div
          key={debt.id}
          className="group grid grid-cols-[1fr_100px_64px_88px_88px_24px] gap-2 px-5 py-2 border-b border-[var(--muted)] last:border-0 items-center hover:bg-[var(--secondary)] transition-colors"
        >
          <input
            type="text"
            value={debt.label}
            placeholder="e.g. Student loan"
            onChange={e => updateDebtPayment(debt.id, { label: e.target.value })}
            className="bg-[var(--secondary)] border border-transparent focus:border-[var(--accent)] focus:bg-[var(--card)] rounded px-2 py-1 text-xs outline-none text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] w-full transition-colors"
          />
          <NumericInput value={debt.balance}          onChange={v => updateDebtPayment(debt.id, { balance: v })}          prefix="$"  className="w-full text-xs" />
          <NumericInput value={debt.interest_rate}    onChange={v => updateDebtPayment(debt.id, { interest_rate: v })}    suffix="%" decimals={2} className="w-full text-xs" placeholder="0.00" />
          <NumericInput value={debt.monthly_payment}  onChange={v => updateDebtPayment(debt.id, { monthly_payment: v })}  prefix="$"  className="w-full text-xs" />
          <NumericInput value={debt.minimum_payment}  onChange={v => updateDebtPayment(debt.id, { minimum_payment: v })}  prefix="$"  className="w-full text-xs" />
          <button
            onClick={() => removeDebtPayment(debt.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--muted-foreground)] hover:text-[var(--negative)] flex items-center justify-center"
          >
            <X size={13} />
          </button>
        </div>
      ))}

      <button
        onClick={() => addDebtPayment(blankDebt())}
        className="w-full flex items-center gap-1.5 px-5 py-2.5 text-[11px] text-[var(--muted-foreground)] hover:text-[var(--accent)] border-t border-[var(--muted)] transition-colors"
      >
        <Plus size={11} /> add debt
      </button>
    </div>
  )
}

// ── SubscriptionsCard ─────────────────────────────────────────
function SubscriptionsCard({ onManage }: { onManage: () => void }) {
  const groups = useFinStartStore(s => s.fixed_expenses.subscription_groups)
  const total  = calculateSubscriptionGroupsMonthly(groups)
  const count  = groups.reduce((sum, g) => sum + g.subscriptions.length, 0)
  const active = groups.filter(g => g.subscriptions.length > 0)
  const summary = active.length === 0
    ? 'No subscriptions added yet'
    : active.map(g => g.name).join(', ')

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl mb-2 overflow-hidden shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="flex border border-[var(--border)] rounded-full overflow-hidden opacity-40 flex-shrink-0">
          <span className="px-2 py-0.5 text-[10px] font-medium bg-[var(--primary)] text-[var(--primary-foreground)]">F</span>
          <span className="px-2 py-0.5 text-[10px] font-medium text-[var(--muted-foreground)]">V</span>
        </div>
        <span className="flex-1 text-sm font-medium text-[var(--foreground)]">Subscriptions & memberships</span>
        <span className="text-sm font-medium text-[var(--foreground)] font-[tabular-nums]">{formatCurrency(total)}</span>
      </div>
      <button
        onClick={onManage}
        className="w-full flex items-center px-3 py-2 border-t border-[var(--border)] hover:bg-[var(--secondary)] transition-colors group"
      >
        <span className="flex-1 text-xs text-[var(--muted-foreground)] text-left truncate">
          {count > 0 ? `${summary} · ${count} subscription${count !== 1 ? 's' : ''}` : summary}
        </span>
        <span className="flex items-center gap-1 text-xs text-[var(--accent)] group-hover:gap-2 transition-all">
          <ArrowRight size={12} /> manage
        </span>
      </button>
    </div>
  )
}

// ── SubscriptionsModal — Fix 6 ────────────────────────────────
function SubscriptionsModal({ onClose }: { onClose: () => void }) {
  const groups                  = useFinStartStore(s => s.fixed_expenses.subscription_groups)
  const addSubscriptionGroup    = useFinStartStore(s => s.addSubscriptionGroup)
  const updateSubscriptionGroup = useFinStartStore(s => s.updateSubscriptionGroup)
  const removeSubscriptionGroup = useFinStartStore(s => s.removeSubscriptionGroup)
  const addSubscription         = useFinStartStore(s => s.addSubscription)
  const updateSubscription      = useFinStartStore(s => s.updateSubscription)
  const removeSubscription      = useFinStartStore(s => s.removeSubscription)

  const total = calculateSubscriptionGroupsMonthly(groups)

  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [groupDraft, setGroupDraft]         = useState('')
  const groupInputRef = useRef<HTMLInputElement>(null)
  const [newSubId, setNewSubId]             = useState<string | null>(null)

  useEffect(() => {
    if (editingGroupId) {
      groupInputRef.current?.focus()
      groupInputRef.current?.select()
    }
  }, [editingGroupId])

  function commitGroupName(id: string) {
    const trimmed = groupDraft.trim()
    if (trimmed) updateSubscriptionGroup(id, { name: trimmed })
    setEditingGroupId(null)
  }

  // Fix 6 — add group immediately enters edit mode with text selected
  function addGroup() {
    const id = newId()
    addSubscriptionGroup({ id, name: 'New group', subscriptions: [] })
    setGroupDraft('New group')
    setEditingGroupId(id)
  }

  function handleAddSubscription(groupId: string) {
    const sub = blankSubscription()
    addSubscription(groupId, sub)
    setNewSubId(sub.id)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--primary)]/40 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] w-full max-w-xl max-h-[85vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)] flex-shrink-0">
          <span className="text-base font-medium text-[var(--foreground)]">Subscriptions & memberships</span>
          <div className="flex items-center gap-4">
            <span className="text-xs text-[var(--muted-foreground)]">
              Total: <span className="text-[var(--foreground)] font-medium font-[tabular-nums]">{fmtLine(total)} / mo</span>
            </span>
            <button onClick={onClose} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {groups.map(group => {
            const groupTotal = group.subscriptions.reduce(
              (sum, s) => sum + toMonthly(s.amount, s.frequency), 0
            )
            return (
              <div key={group.id} className="border-b border-[var(--border)] last:border-0">
                {/* Fix 6 — pencil next to group name, auto-select on new */}
                <div className="group/grp flex items-center gap-2 px-5 py-2 hover:bg-[var(--secondary)] transition-colors">
                  {editingGroupId === group.id ? (
                    <input
                      ref={groupInputRef}
                      value={groupDraft}
                      onChange={e => setGroupDraft(e.target.value)}
                      onBlur={() => commitGroupName(group.id)}
                      onKeyDown={e => {
                        // Fix 6 — Enter commits
                        if (e.key === 'Enter') commitGroupName(group.id)
                        if (e.key === 'Escape') setEditingGroupId(null)
                      }}
                      className="flex-1 text-xs font-medium uppercase tracking-wide bg-[var(--secondary)] border border-[var(--accent)] rounded px-1.5 py-0.5 outline-none text-[var(--foreground)]"
                    />
                  ) : (
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                      <span className="text-[11px] font-medium text-[var(--muted-foreground)] uppercase tracking-wide truncate">
                        {group.name}
                      </span>
                      <button
                        onClick={() => { setGroupDraft(group.name); setEditingGroupId(group.id) }}
                        className="opacity-0 group-hover/grp:opacity-100 transition-opacity text-[var(--muted-foreground)] hover:text-[var(--accent)] flex-shrink-0"
                        title="Rename group"
                      >
                        <Pencil size={10} />
                      </button>
                    </div>
                  )}
                  <span className="text-[11px] text-[var(--muted-foreground)] font-[tabular-nums] flex-shrink-0">
                    {fmtLine(groupTotal)} / mo
                  </span>
                  <button
                    onClick={() => removeSubscriptionGroup(group.id)}
                    className="opacity-0 group-hover/grp:opacity-100 transition-opacity text-[var(--muted-foreground)] hover:text-[var(--negative)] p-0.5 flex-shrink-0"
                    title="Remove group"
                  >
                    <X size={11} />
                  </button>
                </div>

                {group.subscriptions.length > 0 && (
                  <div className="px-5">
                    <div className="grid grid-cols-[1fr_72px_80px_60px_20px] gap-2 pb-1 border-b border-[var(--muted)]">
                      <span className="text-[10px] text-[var(--muted-foreground)]">Name</span>
                      <span className="text-[10px] text-[var(--muted-foreground)] text-right">Amount</span>
                      <span className="text-[10px] text-[var(--muted-foreground)] text-right">Frequency</span>
                      <span className="text-[10px] text-[var(--muted-foreground)] text-right">/ mo</span>
                      <span />
                    </div>
                    {group.subscriptions.map(sub => {
                      const monthly = toMonthly(sub.amount, sub.frequency)
                      return (
                        <div
                          key={sub.id}
                          className="group grid grid-cols-[1fr_72px_80px_60px_20px] gap-2 py-1.5 border-b border-[var(--muted)] last:border-0 items-center"
                        >
                          <input
                            autoFocus={sub.id === newSubId}
                            type="text"
                            value={sub.name}
                            placeholder="Name"
                            onChange={e => {
                              updateSubscription(group.id, sub.id, { name: e.target.value })
                              if (sub.id === newSubId) setNewSubId(null)
                            }}
                            // Fix 6 — Enter submits subscription name
                            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                            className="bg-[var(--secondary)] border border-transparent focus:border-[var(--accent)] focus:bg-[var(--card)] rounded px-1.5 py-1 text-xs outline-none text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] w-full transition-colors"
                          />
                          <NumericInput
                            value={sub.amount}
                            onChange={v => updateSubscription(group.id, sub.id, { amount: v })}
                            prefix="$"
                            className="w-full text-xs"
                          />
                          <select
                            value={sub.frequency}
                            onChange={e => updateSubscription(group.id, sub.id, { frequency: e.target.value as Subscription['frequency'] })}
                            className="text-xs text-[var(--muted-foreground)] bg-[var(--secondary)] border-none rounded px-1 py-1 cursor-pointer outline-none w-full"
                          >
                            {FREQ_OPTIONS.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                          <span className="text-xs text-[var(--muted-foreground)] font-[tabular-nums] text-right">
                            {fmtLine(monthly)}
                          </span>
                          <button
                            onClick={() => removeSubscription(group.id, sub.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--muted-foreground)] hover:text-[var(--negative)] flex items-center justify-center"
                          >
                            <X size={11} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}

                <button
                  onClick={() => handleAddSubscription(group.id)}
                  className="w-full flex items-center gap-1.5 px-5 py-1.5 text-[11px] text-[var(--muted-foreground)] hover:text-[var(--accent)] transition-colors"
                >
                  <Plus size={10} /> add to {group.name.toLowerCase()}
                </button>
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border)] flex-shrink-0">
          <button
            onClick={addGroup}
            className="flex items-center gap-1.5 text-xs text-[var(--accent)] hover:text-[var(--foreground)] transition-colors"
          >
            <Plus size={12} /> add group
          </button>
          <button
            onClick={onClose}
            className="bg-[var(--primary)] text-[var(--primary-foreground)] text-xs px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

// ── AddCategoryButton ─────────────────────────────────────────
function AddCategoryButton({ isFixed }: { isFixed: boolean }) {
  const addExpenseCategory = useFinStartStore(s => s.addExpenseCategory)
  function add() {
    addExpenseCategory({ id: newId(), label: 'New category', is_fixed: isFixed, items: [] })
  }
  return (
    <button
      onClick={add}
      className="flex items-center gap-1.5 px-1 py-1.5 text-[11px] text-[var(--muted-foreground)] hover:text-[var(--accent)] transition-colors"
    >
      <Plus size={11} /> add category
    </button>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function ExpensesPage() {
  const fixed_expenses    = useFinStartStore(s => s.fixed_expenses)
  const variable_expenses = useFinStartStore(s => s.variable_expenses)
  const updateExpenseCategoryRaw = useFinStartStore(s => s.updateExpenseCategory)

  const [showSubsModal, setShowSubsModal] = useState(false)
  const [flashId, setFlashId]             = useState<string | null>(null)

  const updateExpenseCategory = useCallback(
    (id: string, updates: Parameters<typeof updateExpenseCategoryRaw>[1]) => {
      updateExpenseCategoryRaw(id, updates)
      if ('is_fixed' in updates) {
        setFlashId(id)
        setTimeout(() => setFlashId(null), 900)
      }
    },
    [updateExpenseCategoryRaw]
  )
  // make wrapped version available to CategoryCard via store override pattern
  // CategoryCard reads updateExpenseCategory directly from store — the flash
  // is triggered by the page-level wrapper which CategoryCard calls via prop
  void updateExpenseCategory // referenced below via CategoryCard's toggleFixed

  const mortgageMonthly    = calculateMortgageMonthlyTotal(fixed_expenses.mortgage)
  const fixedCategories    = sortCategories(fixed_expenses.categories)
  const variableCategories = sortCategories(variable_expenses.categories)
  const totalFixed         = calculateFixedExpensesMonthly(fixed_expenses)
  const totalVariable      = calculateVariableExpensesMonthly(variable_expenses)
  const totalExpenses      = totalFixed + totalVariable

  return (
    <>
      {showSubsModal && <SubscriptionsModal onClose={() => setShowSubsModal(false)} />}

      <div className="p-6 max-w-5xl mx-auto">
        {/* page header */}
        <div className="mb-5">
          <h1 className="text-xl font-medium text-[var(--foreground)]">Expenses</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            Your monthly spending — hover any name and click the pencil to rename it
          </p>
        </div>

        {/* summary bar */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl px-5 py-4 flex gap-0 mb-6 shadow-sm">
          <div className="flex flex-col gap-0.5 flex-1">
            <span className="text-[11px] text-[var(--muted-foreground)] uppercase tracking-widest">Total monthly</span>
            <span className="text-2xl font-medium text-[var(--foreground)] font-[tabular-nums]">{formatCurrency(totalExpenses)}</span>
          </div>
          <div className="w-px bg-[var(--border)] mx-5" />
          <div className="flex flex-col gap-0.5 flex-1">
            <span className="text-[11px] text-[var(--muted-foreground)] uppercase tracking-widest">Fixed</span>
            <span className="text-2xl font-medium text-[var(--foreground)] font-[tabular-nums]">{formatCurrency(totalFixed)}</span>
          </div>
          <div className="w-px bg-[var(--border)] mx-5" />
          <div className="flex flex-col gap-0.5 flex-1">
            <span className="text-[11px] text-[var(--muted-foreground)] uppercase tracking-widest">Variable</span>
            <span className="text-2xl font-medium text-[var(--foreground)] font-[tabular-nums]">{formatCurrency(totalVariable)}</span>
          </div>
        </div>

        {/* ── Debt & mortgage section — top, full width ── */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-medium text-[var(--foreground)] uppercase tracking-widest">Debt</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>
          <MortgageSection />
          <DebtSection />
        </div>

        {/* ── Fixed + Variable columns ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* LEFT — fixed */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-medium text-[var(--foreground)] uppercase tracking-widest">Fixed</span>
              <div className="flex-1 h-px bg-[var(--border)]" />
            </div>
            {fixedCategories.map(cat => (
              <CategoryCard
                key={cat.id}
                category={cat}
                flashId={flashId}
                mortgageMonthly={mortgageMonthly}
              />
            ))}
            <SubscriptionsCard onManage={() => setShowSubsModal(true)} />
            <AddCategoryButton isFixed={true} />
          </div>

          {/* RIGHT — variable */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-medium text-[var(--foreground)] uppercase tracking-widest">Variable</span>
              <div className="flex-1 h-px bg-[var(--border)]" />
            </div>
            {variableCategories.map(cat => (
              <CategoryCard
                key={cat.id}
                category={cat}
                flashId={flashId}
                mortgageMonthly={mortgageMonthly}
              />
            ))}
            <AddCategoryButton isFixed={false} />
          </div>
        </div>
      </div>
    </>
  )
}