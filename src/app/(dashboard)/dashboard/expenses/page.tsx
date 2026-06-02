'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Plus, X, ArrowRight, Pencil, Check } from 'lucide-react'
import { useFinStartStore } from '@/store/useFinStartStore'
import type {
  ExpenseCategory,
  ExpenseLineItem,
  DebtPayment,
  SubscriptionGroup,
  Subscription,
} from '@/store/useFinStartStore'
import {
  resolveLineItemMonthly,
  calculateFixedExpensesMonthly,
  calculateVariableExpensesMonthly,
  calculateSubscriptionGroupsMonthly,
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

// Fix 1 — "one_time" removed from expense frequency options
const FREQ_OPTIONS: { value: ExpenseLineItem['frequency']; label: string }[] = [
  { value: 'weekly',    label: '/ wk'  },
  { value: 'biweekly',  label: '/ 2wk' },
  { value: 'monthly',   label: '/ mo'  },
  { value: 'quarterly', label: '/ qtr' },
  { value: 'annual',    label: '/ yr'  },
]

// Fix 7 — line-level amounts show 2 decimals; summary bar uses whole numbers
function fmtLineAmount(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

// ── NumericInput ──────────────────────────────────────────────
function NumericInput({
  value,
  onChange,
  className = '',
  prefix = '',
  suffix = '',
  decimals = 0,
  placeholder = '0',
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
    if (autoFocus) ref.current?.focus()
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
      className={`bg-[var(--secondary)] border border-transparent focus:border-[var(--accent)] focus:bg-[var(--card)] rounded px-1.5 py-1 outline-none text-right font-[tabular-nums] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] ${className}`}
    />
  )
}

// ── EditableLabel — Fix 4: pencil icon, Fix 3: autoFocus prop ─
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
  const [editing, setEditing] = useState(autoFocus)
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      ref.current?.focus()
      ref.current?.select()
    }
  }, [editing])

  // If parent flips autoFocus on (new item), enter edit mode
  useEffect(() => {
    if (autoFocus) { setDraft(value); setEditing(true) }
  }, [autoFocus]) // eslint-disable-line react-hooks/exhaustive-deps

  function commit() {
    const trimmed = draft.trim()
    if (trimmed) {
      onSave(trimmed)
      setEditing(false)
    } else {
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
    <span className={`group/label flex items-center gap-1 min-w-0 ${className}`}>
      <span className="truncate">{value}</span>
      {/* Fix 4 — pencil always present in DOM, visible on hover */}
      <button
        onClick={e => { e.stopPropagation(); setDraft(value); setEditing(true) }}
        className="opacity-0 group-hover/label:opacity-100 transition-opacity text-[var(--muted-foreground)] hover:text-[var(--accent)] flex-shrink-0"
        title="Rename"
      >
        <Pencil size={11} />
      </button>
    </span>
  )
}

// ── MonthlyDetailPanel — Fix 2 ────────────────────────────────
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

  // Fix 2 — clear button zeros all 12 months and exits monthly detail mode
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
            />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-1">
        {/* Fix 2 — clear button */}
        <button
          onClick={clearDetail}
          className="text-[11px] text-[var(--muted-foreground)] hover:text-[var(--negative)] transition-colors"
        >
          Clear monthly detail
        </button>
        <span className="text-xs text-[var(--muted-foreground)]">
          Monthly avg:{' '}
          <span className="font-medium text-[var(--foreground)]">{fmtLineAmount(avg)}</span>
        </span>
      </div>
    </div>
  )
}

// ── LineItemRow — Fixes 2, 3, 4 ──────────────────────────────
function LineItemRow({
  item,
  categoryId,
  autoFocusLabel = false,
}: {
  item: ExpenseLineItem
  categoryId: string
  autoFocusLabel?: boolean
}) {
  const updateExpenseLineItem = useFinStartStore(s => s.updateExpenseLineItem)
  const removeExpenseLineItem = useFinStartStore(s => s.removeExpenseLineItem)
  const [panelOpen, setPanelOpen] = useState(false)

  // Fix 2 — when monthly detail is active, use avg; otherwise normal conversion
  const monthly = resolveLineItemMonthly(item)

  function update(updates: Partial<ExpenseLineItem>) {
    updateExpenseLineItem(categoryId, item.id, updates)
  }

  function toggleMonthlyDetail() {
    if (item.use_monthly_detail) {
      // already in monthly mode — just toggle panel visibility
      setPanelOpen(p => !p)
    } else {
      // entering monthly mode
      update({ use_monthly_detail: true })
      setPanelOpen(true)
    }
  }

  function handleClearFromPanel() {
    setPanelOpen(false)
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

        {/* Fix 3 + 4 — label with autoFocus and pencil icon */}
        <EditableLabel
          value={item.label || 'Untitled'}
          onSave={v => update({ label: v })}
          autoFocus={autoFocusLabel}
          className="flex-1 text-xs text-[var(--foreground)] min-w-0 cursor-pointer"
          inputClassName="text-xs w-full"
        />

        {/* Fix 2 — if monthly detail active, show avg + edit; else show amount + freq */}
        {item.use_monthly_detail ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-[var(--muted-foreground)] italic">
              Monthly detail ·{' '}
              <span className="text-[var(--foreground)] font-medium not-italic font-[tabular-nums]">
                avg {fmtLineAmount(monthly)}
              </span>
            </span>
            <button
              onClick={toggleMonthlyDetail}
              className="text-[10px] text-[var(--accent)] hover:underline"
            >
              {panelOpen ? 'hide' : 'edit'}
            </button>
          </div>
        ) : (
          <>
            <NumericInput
              value={item.amount}
              onChange={v => update({ amount: v })}
              className="w-16 text-xs"
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
            {/* Fix 7 — 2 decimal places on line-level converted amount */}
            <span className="text-[11px] text-[var(--muted-foreground)] font-[tabular-nums] min-w-[52px] text-right">
              {item.frequency === 'monthly' ? '' : fmtLineAmount(monthly)}
            </span>
            {/* Fix 2 — "by month" label instead of bare chevron */}
            <button
              onClick={toggleMonthlyDetail}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-[var(--muted-foreground)] hover:text-[var(--accent)] flex-shrink-0 whitespace-nowrap border border-[var(--border)] rounded px-1.5 py-0.5"
              title="Enter amounts by month"
            >
              by month
            </button>
          </>
        )}
      </div>

      {/* monthly detail panel */}
      {panelOpen && item.use_monthly_detail && (
        <MonthlyDetailPanel
          item={item}
          categoryId={categoryId}
          onClose={handleClearFromPanel}
        />
      )}
    </>
  )
}

// ── CategoryCard — Fixes 3, 4, 5, 9 ──────────────────────────
function CategoryCard({
  category,
  flashId,
}: {
  category: ExpenseCategory
  flashId: string | null
}) {
  const updateExpenseCategory = useFinStartStore(s => s.updateExpenseCategory)
  const removeExpenseCategory = useFinStartStore(s => s.removeExpenseCategory)
  const addExpenseLineItem    = useFinStartStore(s => s.addExpenseLineItem)

  const [confirmDelete, setConfirmDelete] = useState(false)
  // Fix 3 — track which line item id should auto-focus its label
  const [newItemId, setNewItemId] = useState<string | null>(null)

  const isFlashing = flashId === category.id

  const total = category.items.reduce(
    (sum, item) => sum + resolveLineItemMonthly(item), 0
  )

  // Fix 3 — add line and immediately set it to auto-focus
  function addLine() {
    const item = blankLineItem('')
    addExpenseLineItem(category.id, item)
    setNewItemId(item.id)
  }

  function toggleFixed(makeFixed: boolean) {
    updateExpenseCategory(category.id, { is_fixed: makeFixed })
  }

  function handleDelete() {
    if (category.items.length > 0 && !confirmDelete) {
      setConfirmDelete(true)
      return
    }
    removeExpenseCategory(category.id)
  }

  return (
    // Fix 5 + 9 — flash highlight on arrival; card shadow for contrast
    <div
      className={`border rounded-xl mb-2 overflow-hidden shadow-sm transition-all duration-700 ${
        isFlashing
          ? 'bg-[#DDE6F5] border-[var(--accent)]'
          : 'bg-[var(--card)] border-[var(--border)]'
      }`}
    >
      {/* header */}
      <div className="group flex items-center gap-2 px-3 py-2.5 hover:bg-[var(--secondary)] transition-colors">
        {/* F/V pill */}
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

        {/* Fix 4 — pencil on category name */}
        <EditableLabel
          value={category.label}
          onSave={v => updateExpenseCategory(category.id, { label: v })}
          className="flex-1 text-sm font-medium text-[var(--foreground)]"
          inputClassName="text-sm font-medium w-full"
        />

        {/* total */}
        <span className="text-sm font-medium text-[var(--foreground)] font-[tabular-nums] min-w-[60px] text-right">
          {formatCurrency(total)}
        </span>

        {/* delete */}
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
      {category.items.length > 0 && (
        <div className="px-3 border-t border-[var(--border)]">
          {category.items.map(item => (
            <LineItemRow
              key={item.id}
              item={item}
              categoryId={category.id}
              // Fix 3 — pass autoFocus only to the newly created item
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

// ── DebtSection — Fix 8 ───────────────────────────────────────
function DebtSection() {
  const debts             = useFinStartStore(s => s.fixed_expenses.debt_payments)
  const addDebtPayment    = useFinStartStore(s => s.addDebtPayment)
  const updateDebtPayment = useFinStartStore(s => s.updateDebtPayment)
  const removeDebtPayment = useFinStartStore(s => s.removeDebtPayment)

  const total = debts.reduce((sum, d) => sum + d.monthly_payment, 0)

  return (
    // Fix 8 — full-width section with distinct background, below both columns
    <div className="mt-6 bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden shadow-sm">
      {/* section header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] bg-[var(--secondary)]">
        <div>
          <h2 className="text-sm font-medium text-[var(--foreground)]">Debt payments</h2>
          <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
            Balance and interest rate carry forward to the Debt Payoff planner
          </p>
        </div>
        <div className="text-right">
          <span className="text-[11px] text-[var(--muted-foreground)] uppercase tracking-wide block">Monthly total</span>
          <span className="text-lg font-medium text-[var(--foreground)] font-[tabular-nums]">{formatCurrency(total)}</span>
        </div>
      </div>

      {/* column headers */}
      <div className="grid grid-cols-[1fr_100px_72px_88px_88px_24px] gap-2 px-5 py-2 border-b border-[var(--muted)]">
        <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide">Name</span>
        <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide text-right">Balance</span>
        <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide text-right">Rate</span>
        <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide text-right">Payment</span>
        <span className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wide text-right">Min. payment</span>
        <span />
      </div>

      {/* debt rows */}
      {debts.length === 0 && (
        <p className="px-5 py-4 text-xs text-[var(--muted-foreground)] italic">
          No debts added yet. Click below to add a loan, credit card, or other debt.
        </p>
      )}

      {debts.map(debt => (
        <div
          key={debt.id}
          className="group grid grid-cols-[1fr_100px_72px_88px_88px_24px] gap-2 px-5 py-2 border-b border-[var(--muted)] last:border-0 items-center hover:bg-[var(--secondary)] transition-colors"
        >
          <input
            type="text"
            value={debt.label}
            placeholder="e.g. Student loan"
            onChange={e => updateDebtPayment(debt.id, { label: e.target.value })}
            className="bg-[var(--secondary)] border border-transparent focus:border-[var(--accent)] focus:bg-[var(--card)] rounded px-2 py-1 text-xs outline-none text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] w-full"
          />
          <NumericInput
            value={debt.balance}
            onChange={v => updateDebtPayment(debt.id, { balance: v })}
            prefix="$"
            className="w-full text-xs"
          />
          <NumericInput
            value={debt.interest_rate}
            onChange={v => updateDebtPayment(debt.id, { interest_rate: v })}
            suffix="%"
            decimals={2}
            className="w-full text-xs"
          />
          <NumericInput
            value={debt.monthly_payment}
            onChange={v => updateDebtPayment(debt.id, { monthly_payment: v })}
            prefix="$"
            className="w-full text-xs"
          />
          <NumericInput
            value={debt.minimum_payment}
            onChange={v => updateDebtPayment(debt.id, { minimum_payment: v })}
            prefix="$"
            className="w-full text-xs"
          />
          <button
            onClick={() => removeDebtPayment(debt.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--muted-foreground)] hover:text-[var(--negative)] flex items-center justify-center"
          >
            <X size={13} />
          </button>
        </div>
      ))}

      {/* add debt */}
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
  const activeGroups = groups.filter(g => g.subscriptions.length > 0)

  const summary = activeGroups.length === 0
    ? 'No subscriptions added yet'
    : activeGroups.map(g => g.name).join(', ')

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

  // Fix 6 — track which group is in name-edit mode
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [groupDraft, setGroupDraft] = useState('')
  const groupInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editingGroupId) groupInputRef.current?.focus()
  }, [editingGroupId])

  function commitGroupName(id: string) {
    const trimmed = groupDraft.trim()
    if (trimmed) updateSubscriptionGroup(id, { name: trimmed })
    setEditingGroupId(null)
  }

  // Fix 6 — add group and immediately enter name edit mode
  function addGroup() {
    const id = newId()
    addSubscriptionGroup({ id, name: 'New group', subscriptions: [] })
    setGroupDraft('New group')
    setEditingGroupId(id)
  }

  // Fix 3 — track newly added subscription for auto-focus
  const [newSubId, setNewSubId] = useState<string | null>(null)

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
        {/* header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border)] flex-shrink-0">
          <span className="text-base font-medium text-[var(--foreground)]">Subscriptions & memberships</span>
          <div className="flex items-center gap-4">
            <span className="text-xs text-[var(--muted-foreground)]">
              Total: <span className="text-[var(--foreground)] font-medium font-[tabular-nums]">{fmtLineAmount(total)} / mo</span>
            </span>
            <button onClick={onClose} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* scrollable groups */}
        <div className="flex-1 overflow-y-auto">
          {groups.map(group => {
            const groupTotal = group.subscriptions.reduce(
              (sum, s) => sum + toMonthly(s.amount, s.frequency), 0
            )

            return (
              <div key={group.id} className="border-b border-[var(--border)] last:border-0">
                {/* Fix 6 — group header with pencil next to name */}
                <div className="group/grp flex items-center gap-2 px-5 py-2 hover:bg-[var(--secondary)] transition-colors">
                  {editingGroupId === group.id ? (
                    <input
                      ref={groupInputRef}
                      value={groupDraft}
                      onChange={e => setGroupDraft(e.target.value)}
                      onBlur={() => commitGroupName(group.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') commitGroupName(group.id)
                        if (e.key === 'Escape') setEditingGroupId(null)
                      }}
                      className="flex-1 text-xs font-medium uppercase tracking-wide bg-[var(--secondary)] border border-[var(--accent)] rounded px-1.5 py-0.5 outline-none text-[var(--foreground)]"
                    />
                  ) : (
                    // Fix 6 — pencil immediately after group name
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
                    {fmtLineAmount(groupTotal)} / mo
                  </span>
                  <button
                    onClick={() => removeSubscriptionGroup(group.id)}
                    className="opacity-0 group-hover/grp:opacity-100 transition-opacity text-[var(--muted-foreground)] hover:text-[var(--negative)] p-0.5 flex-shrink-0"
                    title="Remove group"
                  >
                    <X size={11} />
                  </button>
                </div>

                {/* subscription rows */}
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
                            className="bg-[var(--secondary)] border border-transparent focus:border-[var(--accent)] focus:bg-[var(--card)] rounded px-1.5 py-1 text-xs outline-none text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] w-full"
                          />
                          <NumericInput
                            value={sub.amount}
                            onChange={v => updateSubscription(group.id, sub.id, { amount: v })}
                            prefix="$"
                            className="w-full text-xs"
                          />
                          {/* Fix 1 — one_time removed from subscription freq too */}
                          <select
                            value={sub.frequency}
                            onChange={e => updateSubscription(group.id, sub.id, { frequency: e.target.value as Subscription['frequency'] })}
                            className="text-xs text-[var(--muted-foreground)] bg-[var(--secondary)] border-none rounded px-1 py-1 cursor-pointer outline-none w-full"
                          >
                            {FREQ_OPTIONS.map(o => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                          {/* Fix 7 — 2 decimals */}
                          <span className="text-xs text-[var(--muted-foreground)] font-[tabular-nums] text-right">
                            {fmtLineAmount(monthly)}
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

                {/* add to group */}
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

        {/* footer */}
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
    addExpenseCategory({
      id: newId(),
      label: 'New category',
      is_fixed: isFixed,
      items: [],
    })
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

  const [showSubsModal, setShowSubsModal] = useState(false)
  // Fix 5 — track which category id should flash after a column move
  const [flashId, setFlashId] = useState<string | null>(null)

  // Intercept updateExpenseCategory to trigger flash on column change
  const updateExpenseCategoryRaw = useFinStartStore(s => s.updateExpenseCategory)

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

  // Wrap store in context-aware version — pass down via prop drilling
  // (small enough component tree that context is overkill here)

  // Fix 5 — alphabetical sort for both columns
  const fixedCategories    = sortCategories(fixed_expenses.categories)
  const variableCategories = sortCategories(variable_expenses.categories)

  const totalFixed    = calculateFixedExpensesMonthly(fixed_expenses)
  const totalVariable = calculateVariableExpensesMonthly(variable_expenses)
  const totalExpenses = totalFixed + totalVariable

  return (
    <>
      {showSubsModal && (
        <SubscriptionsModal onClose={() => setShowSubsModal(false)} />
      )}

      <div className="p-6 max-w-5xl mx-auto">
        {/* page header */}
        <div className="mb-5">
          <h1 className="text-xl font-medium text-[var(--foreground)]">Expenses</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            Your monthly spending — hover any name and click the pencil to rename it
          </p>
        </div>

        {/* Fix 9 — summary bar with stronger visual weight */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl px-5 py-4 flex gap-0 mb-6 shadow-sm">
          <div className="flex flex-col gap-0.5 flex-1">
            <span className="text-[11px] text-[var(--muted-foreground)] uppercase tracking-widest">Total monthly</span>
            <span className="text-2xl font-medium text-[var(--foreground)] font-[tabular-nums]">
              {formatCurrency(totalExpenses)}
            </span>
          </div>
          <div className="w-px bg-[var(--border)] mx-5" />
          <div className="flex flex-col gap-0.5 flex-1">
            <span className="text-[11px] text-[var(--muted-foreground)] uppercase tracking-widest">Fixed</span>
            <span className="text-2xl font-medium text-[var(--foreground)] font-[tabular-nums]">
              {formatCurrency(totalFixed)}
            </span>
          </div>
          <div className="w-px bg-[var(--border)] mx-5" />
          <div className="flex flex-col gap-0.5 flex-1">
            <span className="text-[11px] text-[var(--muted-foreground)] uppercase tracking-widest">Variable</span>
            <span className="text-2xl font-medium text-[var(--foreground)] font-[tabular-nums]">
              {formatCurrency(totalVariable)}
            </span>
          </div>
        </div>

        {/* Fix 9 — column headers more prominent */}
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
              />
            ))}

            <AddCategoryButton isFixed={false} />
          </div>
        </div>

        {/* Fix 8 — debt section full-width below both columns */}
        <DebtSection />

      </div>
    </>
  )
}