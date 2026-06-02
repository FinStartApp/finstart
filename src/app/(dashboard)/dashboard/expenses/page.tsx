'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Plus, X, ArrowRight, Pencil, ChevronDown, ChevronUp } from 'lucide-react'
import { useFinStartStore } from '@/store/useFinStartStore'
import type {
  ExpenseCategory,
  ExpenseLineItem,
  DebtPayment,
  Subscription,
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
  return { id: newId(), label, amount: 0, frequency: 'monthly', use_monthly_detail: false, monthly_amounts: Array(12).fill(0) }
}
function blankDebt(): DebtPayment {
  return { id: newId(), label: '', balance: 0, interest_rate: 0, monthly_payment: 0, minimum_payment: 0, type: 'other' }
}
function blankSubscription(): Subscription {
  return { id: newId(), name: '', amount: 0, frequency: 'monthly' }
}
function sortCategories(cats: ExpenseCategory[]): ExpenseCategory[] {
  return [...cats].sort((a, b) => a.label.localeCompare(b.label))
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const FREQ_OPTIONS: { value: ExpenseLineItem['frequency']; label: string }[] = [
  { value: 'weekly', label: '/ wk' },
  { value: 'biweekly', label: '/ 2wk' },
  { value: 'monthly', label: '/ mo' },
  { value: 'quarterly', label: '/ qtr' },
  { value: 'annual', label: '/ yr' },
]

function fmtLine(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n)
}

// ── Tooltip — instant, no browser delay ──────────────────────
function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <span className="relative inline-flex group/tip">
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 rounded-lg bg-primary text-primary-foreground text-[11px] leading-snug px-2.5 py-1.5 text-center opacity-0 group-hover/tip:opacity-100 transition-opacity duration-75 z-50 shadow-md whitespace-normal">
        {text}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-primary" />
      </span>
    </span>
  )
}

// ── NumericInput ──────────────────────────────────────────────
function NumericInput({
  value, onChange, className = '', prefix = '', suffix = '',
  decimals = 2, placeholder = '0.00', autoFocus = false, style,
}: {
  value: number; onChange: (v: number) => void; className?: string
  prefix?: string; suffix?: string; decimals?: number
  placeholder?: string; autoFocus?: boolean; style?: React.CSSProperties
}) {
  const [focused, setFocused] = useState(false)
  const [raw, setRaw] = useState('')
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus) { ref.current?.focus(); ref.current?.select() }
  }, [autoFocus])

  const displayValue = focused
    ? raw
    : value === 0 ? ''
    : `${prefix}${value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`

  return (
    <input
      ref={ref} type="text" inputMode="decimal"
      value={displayValue} placeholder={placeholder}
      onFocus={() => { setRaw(value === 0 ? '' : String(value)); setFocused(true) }}
      onChange={e => setRaw(e.target.value.replace(/[^0-9.]/g, ''))}
      onBlur={() => { const p = parseFloat(raw); onChange(isNaN(p) ? 0 : p); setFocused(false) }}
      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
      style={style}
      className={`bg-card border border-border focus:border-accent rounded px-1.5 py-1 outline-none text-right font-[tabular-nums] text-foreground placeholder:text-muted-foreground transition-colors text-xs ${className}`}
    />
  )
}

// ── EditableLabel ─────────────────────────────────────────────
function EditableLabel({
  value, onSave, className = '', inputClassName = '',
  autoFocus = false, onBlurWithEmpty,
}: {
  value: string; onSave: (v: string) => void; className?: string
  inputClassName?: string; autoFocus?: boolean; onBlurWithEmpty?: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus) { setDraft(value); setEditing(true) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus])

  useEffect(() => {
    if (editing) { ref.current?.focus(); ref.current?.select() }
  }, [editing])

  function commit() {
    const t = draft.trim()
    if (t) { onSave(t); setEditing(false) }
    else { if (onBlurWithEmpty) onBlurWithEmpty(); else { setDraft(value); setEditing(false) } }
  }

  if (editing) {
    return (
      <input ref={ref} value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(value); setEditing(false) } }}
        className={`bg-card border border-accent rounded px-1.5 py-0.5 outline-none text-foreground text-sm ${inputClassName}`}
        style={{ minWidth: 80 }}
      />
    )
  }

  return (
    <span className={`group/lbl flex items-center gap-1 min-w-0 ${className}`}>
      <span className="truncate cursor-default" onDoubleClick={() => { setDraft(value); setEditing(true) }}>
        {value}
      </span>
      <button
        onClick={e => { e.stopPropagation(); setDraft(value); setEditing(true) }}
        className="opacity-0 group-hover/lbl:opacity-100 transition-opacity text-muted-foreground hover:text-accent flex-shrink-0"
        title="Rename"
      >
        <Pencil size={11} />
      </button>
    </span>
  )
}

// ── MonthlyDetailPanel ────────────────────────────────────────
function MonthlyDetailPanel({
  item, categoryId, onClose,
}: {
  item: ExpenseLineItem; categoryId: string; onClose: () => void
}) {
  const updateExpenseLineItem = useFinStartStore(s => s.updateExpenseLineItem)

  function setMonth(i: number, val: number) {
    const next = [...item.monthly_amounts]; next[i] = val
    updateExpenseLineItem(categoryId, item.id, { monthly_amounts: next })
  }

  function clearDetail() {
    updateExpenseLineItem(categoryId, item.id, { use_monthly_detail: false, monthly_amounts: Array(12).fill(0) })
    onClose()
  }

  const hasData = item.monthly_amounts.some(v => v > 0)
  const avg = item.monthly_amounts.reduce((a, b) => a + b, 0) / 12

  return (
    <div className="bg-secondary border-t border-border px-3 py-3">
      <div className="grid grid-cols-6 gap-1.5 mb-2">
        {MONTHS.map((mo, i) => (
          <div key={mo} className="flex flex-col gap-0.5">
            <span className="text-[10px] text-muted-foreground text-center uppercase tracking-wide">{mo}</span>
            <NumericInput value={item.monthly_amounts[i] ?? 0} onChange={v => setMonth(i, v)} className="w-full" placeholder="0" />
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">
            ↑ collapse
          </button>
          {hasData && (
            <button onClick={clearDetail} className="text-[11px] text-muted-foreground hover:text-negative transition-colors">
              clear all
            </button>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          avg / mo: <span className="font-semibold text-foreground font-[tabular-nums]">{fmtLine(avg)}</span>
        </span>
      </div>
    </div>
  )
}

// ── LineItemRow ───────────────────────────────────────────────
// Input zone is always 268px wide — inline style used here intentionally
// because fixed pixel widths are not design tokens and belong in layout code
function LineItemRow({
  item, categoryId, autoFocusLabel = false, locked = false, lockedLabel,
}: {
  item: ExpenseLineItem; categoryId: string; autoFocusLabel?: boolean
  locked?: boolean; lockedLabel?: string
}) {
  const updateExpenseLineItem = useFinStartStore(s => s.updateExpenseLineItem)
  const removeExpenseLineItem = useFinStartStore(s => s.removeExpenseLineItem)
  const [panelOpen, setPanelOpen] = useState(false)

  const hasMonthlyData  = item.monthly_amounts.some(v => v > 0)
  const isMonthlyActive = item.use_monthly_detail && hasMonthlyData
  const monthly         = resolveLineItemMonthly(item)

  function update(u: Partial<ExpenseLineItem>) { updateExpenseLineItem(categoryId, item.id, u) }
  function togglePanel() { if (!item.use_monthly_detail) update({ use_monthly_detail: true }); setPanelOpen(p => !p) }

  if (locked) {
    return (
      <div className="flex items-center gap-1.5 py-1.5 border-b border-muted last:border-0">
        <span className="w-4 flex-shrink-0" />
        <span className="flex-1 text-xs text-foreground flex items-center gap-1.5 min-w-0">
          <span className="truncate">{lockedLabel ?? item.label}</span>
          <span className="text-[9px] bg-selection text-accent border border-accent/30 rounded px-1.5 py-0.5 flex-shrink-0 font-semibold tracking-wide uppercase">
            linked
          </span>
        </span>
        <div className="flex items-center justify-end flex-shrink-0" style={{ width: 268 }}>
          <span className="text-xs font-semibold text-foreground font-[tabular-nums]">{fmtLine(monthly)}</span>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="group flex items-center gap-1.5 py-1.5 border-b border-muted last:border-0">
        <button
          onClick={() => removeExpenseLineItem(categoryId, item.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-negative flex-shrink-0 w-4 flex items-center justify-center"
        >
          <X size={11} />
        </button>

        <EditableLabel
          value={item.label || 'Untitled'}
          onSave={v => update({ label: v })}
          autoFocus={autoFocusLabel}
          className="flex-1 text-xs text-foreground min-w-0"
          inputClassName="text-xs w-full"
        />

        {/* Fixed 268px input zone — same width in both states */}
        <div className="flex items-center gap-1.5 flex-shrink-0" style={{ width: 268 }}>
          {isMonthlyActive ? (
            <>
              <div className="flex items-center justify-between flex-1 bg-card border border-border rounded px-2 py-1" style={{ height: 26 }}>
                <span className="text-[10px] text-muted-foreground">avg / mo</span>
                <span className="text-xs font-semibold text-foreground font-[tabular-nums]">{fmtLine(monthly)}</span>
              </div>
              <button
                onClick={togglePanel}
                className="text-[10px] text-accent hover:underline whitespace-nowrap flex-shrink-0"
                style={{ width: 40 }}
              >
                {panelOpen ? '↑ hide' : '↓ edit'}
              </button>
            </>
          ) : (
            <>
              <NumericInput
                value={item.amount}
                onChange={v => update({ amount: v })}
                className="flex-shrink-0"
                style={{ width: 80 }}
                decimals={2}
                placeholder="0.00"
              />
              <select
                value={item.frequency}
                onChange={e => update({ frequency: e.target.value as ExpenseLineItem['frequency'] })}
                className="text-[11px] text-muted-foreground bg-card border border-border rounded px-1 py-1 cursor-pointer outline-none flex-shrink-0"
                style={{ width: 58 }}
              >
                {FREQ_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <span
                className="text-[11px] text-muted-foreground font-[tabular-nums] text-right flex-shrink-0"
                style={{ width: 48 }}
              >
                {item.frequency === 'monthly' ? '' : fmtLine(monthly)}
              </span>
              <button
                onClick={togglePanel}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-muted-foreground hover:text-accent flex-shrink-0 border border-dashed border-border rounded bg-card whitespace-nowrap"
                style={{ width: 52, padding: '2px 0', textAlign: 'center' }}
              >
                by mo
              </button>
            </>
          )}
        </div>
      </div>
      {panelOpen && (
        <MonthlyDetailPanel item={item} categoryId={categoryId} onClose={() => setPanelOpen(false)} />
      )}
    </>
  )
}

// ── CategoryCard ──────────────────────────────────────────────
function CategoryCard({
  category, flashId, mortgageMonthly,
}: {
  category: ExpenseCategory; flashId: string | null; mortgageMonthly: number
}) {
  const updateExpenseCategory = useFinStartStore(s => s.updateExpenseCategory)
  const removeExpenseCategory = useFinStartStore(s => s.removeExpenseCategory)
  const addExpenseLineItem    = useFinStartStore(s => s.addExpenseLineItem)

  const [open, setOpen]                   = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [newItemId, setNewItemId]         = useState<string | null>(null)

  const isHousing        = category.label.toLowerCase() === 'housing'
  const isFlashing       = flashId === category.id
  const showMortgageLine = isHousing && mortgageMonthly > 0
  const itemsTotal       = category.items.reduce((sum, item) => sum + resolveLineItemMonthly(item), 0)
  const total            = itemsTotal + (showMortgageLine ? mortgageMonthly : 0)
  const isEmpty          = total === 0

  function addLine() {
    const item = blankLineItem('')
    addExpenseLineItem(category.id, item)
    setNewItemId(item.id)
    setOpen(true)
  }

  function handleDelete() {
    if ((category.items.length > 0 || showMortgageLine) && !confirmDelete) { setConfirmDelete(true); return }
    removeExpenseCategory(category.id)
  }

  const mortgageLinkedItem: ExpenseLineItem = {
    id: '__mortgage_linked__', label: 'Mortgage (P&I + Escrow)',
    amount: mortgageMonthly, frequency: 'monthly',
    use_monthly_detail: false, monthly_amounts: Array(12).fill(0),
  }

  return (
    <div className={`border rounded-xl mb-2 overflow-hidden shadow-sm transition-all duration-500 ${isFlashing ? 'bg-selection border-accent' : 'bg-card border-border'}`}>

      {/* Header — full row clickable to toggle open/closed */}
      <div
        className="group flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-hover transition-colors select-none"
        onClick={() => setOpen(o => !o)}
      >
        {/* F/V pill */}
        <div
          className="flex border border-border rounded-full overflow-hidden opacity-40 group-hover:opacity-100 transition-opacity flex-shrink-0"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => updateExpenseCategory(category.id, { is_fixed: true })}
            className={`px-2 py-0.5 text-[10px] font-semibold transition-colors ${category.is_fixed ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
            title="Mark as Fixed"
          >F</button>
          <button
            onClick={() => updateExpenseCategory(category.id, { is_fixed: false })}
            className={`px-2 py-0.5 text-[10px] font-semibold transition-colors ${!category.is_fixed ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
            title="Mark as Variable"
          >V</button>
        </div>

        {/* Name */}
        <div className="flex-1 min-w-0" onClick={e => e.stopPropagation()}>
          <EditableLabel
            value={category.label}
            onSave={v => updateExpenseCategory(category.id, { label: v })}
            className="text-sm font-semibold text-foreground"
            inputClassName="text-sm font-semibold w-full"
          />
        </div>

        {/* Total pill */}
        <span className={`text-xs font-semibold font-[tabular-nums] px-2 py-0.5 rounded-full flex-shrink-0 ${isEmpty ? 'text-muted-foreground' : 'bg-selection text-primary'}`}>
          {formatCurrency(total)}
        </span>

        {/* Delete */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
          {confirmDelete ? (
            <>
              <span className="text-[11px] text-negative">Remove?</span>
              <button onClick={() => removeExpenseCategory(category.id)} className="text-[11px] text-negative hover:underline ml-1">Yes</button>
              <span className="text-muted-foreground text-[11px] mx-0.5">/</span>
              <button onClick={() => setConfirmDelete(false)} className="text-[11px] text-muted-foreground hover:underline">No</button>
            </>
          ) : (
            <button onClick={handleDelete} className="text-muted-foreground hover:text-negative p-0.5 rounded transition-colors">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Chevron — pointer-events-none so it doesn't block the parent onClick */}
        <div className="text-muted-foreground flex-shrink-0 ml-1 pointer-events-none">
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {/* Expanded content */}
      {open && (
        <>
          {(category.items.length > 0 || showMortgageLine) && (
            <div className="px-3 border-t border-border bg-secondary">
              {showMortgageLine && (
                <LineItemRow item={mortgageLinkedItem} categoryId={category.id} locked lockedLabel="Mortgage (P&I + Escrow)" />
              )}
              {category.items.map(item => (
                <LineItemRow key={item.id} item={item} categoryId={category.id} autoFocusLabel={item.id === newItemId} />
              ))}
            </div>
          )}
          {category.items.length === 0 && !showMortgageLine && (
            <div className="px-3 py-3 border-t border-border bg-secondary">
              <p className="text-xs text-muted-foreground italic">No line items yet — add one below.</p>
            </div>
          )}
          <button
            onClick={addLine}
            className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-muted-foreground hover:text-accent border-t border-dashed border-border bg-card transition-colors"
          >
            <Plus size={11} /> add line
          </button>
        </>
      )}
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
      if (!window.confirm('Remove mortgage? This will clear all mortgage data and unlink it from Housing.')) return
      updateMortgage({ is_active: false, balance: 0, interest_rate: 0, pi_payment: 0, minimum_pi_payment: 0, escrow_taxes: 0, escrow_insurance: 0, escrow_pmi: 0 })
    } else {
      updateMortgage({ is_active: checked })
    }
  }

  return (
    <div className="mb-3">
      <label className="flex items-center gap-2.5 cursor-pointer group select-none mb-2">
        <div
          onClick={() => toggle(!mortgage.is_active)}
          className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors cursor-pointer flex-shrink-0 ${mortgage.is_active ? 'bg-primary border-primary' : 'border-border group-hover:border-accent'}`}
        >
          {mortgage.is_active && (
            <svg viewBox="0 0 10 8" className="w-2.5 h-2 fill-none stroke-white stroke-2">
              <polyline points="1,4 3.5,6.5 9,1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <span className="text-sm font-semibold text-foreground">I have a mortgage</span>
        <span className="text-xs text-muted-foreground">— payment appears automatically in Housing</span>
      </label>

      {mortgage.is_active && (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-muted">
            <div className="grid grid-cols-[1fr_96px_80px_96px_96px] gap-3 items-end">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">Loan balance</p>
                <NumericInput value={mortgage.balance} onChange={v => updateMortgage({ balance: v })} prefix="$" className="w-full" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">Rate</p>
                <NumericInput value={mortgage.interest_rate} onChange={v => updateMortgage({ interest_rate: v })} suffix="%" decimals={3} className="w-full" placeholder="0.000" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">P&amp;I pmt</p>
                <NumericInput value={mortgage.pi_payment} onChange={v => updateMortgage({ pi_payment: v })} prefix="$" className="w-full" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">Min. P&amp;I</p>
                <NumericInput value={mortgage.minimum_pi_payment} onChange={v => updateMortgage({ minimum_pi_payment: v })} prefix="$" className="w-full" />
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowEscrow(s => !s)}
            className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-hover transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Escrow — property taxes, insurance, PMI</span>
              {hasEscrow && (
                <span className="text-[10px] text-primary font-semibold font-[tabular-nums] bg-selection px-1.5 py-0.5 rounded">
                  {fmtLine(escrowTotal)} / mo
                </span>
              )}
            </div>
            {showEscrow ? <ChevronUp size={13} className="text-muted-foreground" /> : <ChevronDown size={13} className="text-muted-foreground" />}
          </button>

          {showEscrow && (
            <div className="px-4 py-3 border-t border-muted bg-secondary">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">Property taxes</p>
                  <NumericInput value={mortgage.escrow_taxes} onChange={v => updateMortgage({ escrow_taxes: v })} prefix="$" className="w-full" />
                  <p className="text-[10px] text-muted-foreground mt-1">Monthly equivalent</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">Homeowner's ins.</p>
                  <NumericInput value={mortgage.escrow_insurance} onChange={v => updateMortgage({ escrow_insurance: v })} prefix="$" className="w-full" />
                  <p className="text-[10px] text-muted-foreground mt-1">Monthly equivalent</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5 flex items-center gap-1">
                    PMI
                    <Tooltip text="Required when your down payment was less than 20% of the home price. Disappears when your loan balance reaches 80% of the home's value.">
                      <span className="w-3.5 h-3.5 rounded-full bg-muted text-muted-foreground text-[9px] flex items-center justify-center cursor-help font-bold">?</span>
                    </Tooltip>
                  </p>
                  <NumericInput value={mortgage.escrow_pmi} onChange={v => updateMortgage({ escrow_pmi: v })} prefix="$" className="w-full" />
                  <p className="text-[10px] text-muted-foreground mt-1">Monthly equivalent</p>
                </div>
              </div>
            </div>
          )}

          {totalMonthly > 0 && (
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-secondary">
              <span className="text-xs text-muted-foreground">Total monthly housing payment</span>
              <span className="text-sm font-semibold text-foreground font-[tabular-nums]">{fmtLine(totalMonthly)}</span>
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
    <div
      className="bg-card border border-border rounded-xl overflow-hidden shadow-sm"
      style={{ borderLeftWidth: 4, borderLeftColor: 'var(--primary)' }}
    >
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-secondary">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Other debt payments</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Auto loans, student loans, credit cards — balance and rate carry forward to the Debt Payoff planner
          </p>
        </div>
        <div className="text-right flex-shrink-0 ml-4">
          <span className="text-[11px] text-muted-foreground uppercase tracking-wide block">Monthly total</span>
          <span className="text-lg font-bold text-foreground font-[tabular-nums]">{formatCurrency(total)}</span>
        </div>
      </div>

      {debts.length > 0 && (
        <div className="grid grid-cols-[1fr_100px_64px_88px_88px_24px] gap-2 px-5 py-2 border-b border-muted bg-secondary">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Name</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide text-right">Balance</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide text-right">Rate</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide text-right">Payment</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide text-right">Min. pmt</span>
          <span />
        </div>
      )}

      {debts.length === 0 && (
        <p className="px-5 py-4 text-xs text-muted-foreground italic">
          No other debts added yet — auto loans, student loans, credit cards.
        </p>
      )}

      {debts.map(debt => (
        <div
          key={debt.id}
          className="group grid grid-cols-[1fr_100px_64px_88px_88px_24px] gap-2 px-5 py-2 border-b border-muted last:border-0 items-center hover:bg-hover transition-colors"
        >
          <input
            type="text" value={debt.label} placeholder="e.g. Student loan"
            onChange={e => updateDebtPayment(debt.id, { label: e.target.value })}
            className="bg-card border border-border focus:border-accent rounded px-2 py-1 text-xs outline-none text-foreground placeholder:text-muted-foreground w-full transition-colors"
          />
          <NumericInput value={debt.balance}         onChange={v => updateDebtPayment(debt.id, { balance: v })}         prefix="$" className="w-full" />
          <NumericInput value={debt.interest_rate}   onChange={v => updateDebtPayment(debt.id, { interest_rate: v })}   suffix="%" decimals={2} className="w-full" placeholder="0.00" />
          <NumericInput value={debt.monthly_payment} onChange={v => updateDebtPayment(debt.id, { monthly_payment: v })} prefix="$" className="w-full" />
          <NumericInput value={debt.minimum_payment} onChange={v => updateDebtPayment(debt.id, { minimum_payment: v })} prefix="$" className="w-full" />
          <button
            onClick={() => removeDebtPayment(debt.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-negative flex items-center justify-center"
          >
            <X size={13} />
          </button>
        </div>
      ))}

      <button
        onClick={() => addDebtPayment(blankDebt())}
        className="w-full flex items-center gap-1.5 px-5 py-2.5 text-[11px] text-muted-foreground hover:text-accent border-t border-dashed border-border bg-card transition-colors"
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
  const summary = active.length === 0 ? 'No subscriptions added yet' : active.map(g => g.name).join(', ')
  const isEmpty = total === 0

  return (
    <div className="bg-card border border-border rounded-xl mb-2 overflow-hidden shadow-sm">
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="flex border border-border rounded-full overflow-hidden opacity-40 flex-shrink-0">
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-primary text-primary-foreground">F</span>
          <span className="px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">V</span>
        </div>
        <span className="flex-1 text-sm font-semibold text-foreground">Subscriptions & memberships</span>
        <span className={`text-xs font-semibold font-[tabular-nums] px-2 py-0.5 rounded-full flex-shrink-0 ${isEmpty ? 'text-muted-foreground' : 'bg-selection text-primary'}`}>
          {formatCurrency(total)}
        </span>
      </div>
      <button
        onClick={onManage}
        className="w-full flex items-center px-3 py-2 border-t border-border hover:bg-hover transition-colors group"
      >
        <span className="flex-1 text-xs text-muted-foreground text-left truncate">
          {count > 0 ? `${summary} · ${count} subscription${count !== 1 ? 's' : ''}` : summary}
        </span>
        <span className="flex items-center gap-1 text-xs text-accent group-hover:gap-2 transition-all">
          <ArrowRight size={12} /> manage
        </span>
      </button>
    </div>
  )
}

// ── SubscriptionsModal ────────────────────────────────────────
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
    if (editingGroupId) { groupInputRef.current?.focus(); groupInputRef.current?.select() }
  }, [editingGroupId])

  function commitGroupName(id: string) {
    const t = groupDraft.trim(); if (t) updateSubscriptionGroup(id, { name: t }); setEditingGroupId(null)
  }
  function addGroup() {
    const id = newId()
    addSubscriptionGroup({ id, name: 'New group', subscriptions: [] })
    setGroupDraft('New group'); setEditingGroupId(id)
  }
  function handleAddSubscription(groupId: string) {
    const sub = blankSubscription(); addSubscription(groupId, sub); setNewSubId(sub.id)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-card rounded-xl border border-border w-full max-w-xl max-h-[85vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border flex-shrink-0">
          <span className="text-base font-bold text-foreground" style={{ letterSpacing: '-0.4px' }}>
            Subscriptions & memberships
          </span>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">
              Total: <span className="text-foreground font-semibold font-[tabular-nums]">{fmtLine(total)} / mo</span>
            </span>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {groups.map(group => {
            const groupTotal = group.subscriptions.reduce((sum, s) => sum + toMonthly(s.amount, s.frequency), 0)
            return (
              <div key={group.id} className="border-b border-border last:border-0">
                <div className="group/grp flex items-center gap-2 px-5 py-2 hover:bg-hover transition-colors">
                  {editingGroupId === group.id ? (
                    <input
                      ref={groupInputRef} value={groupDraft}
                      onChange={e => setGroupDraft(e.target.value)}
                      onBlur={() => commitGroupName(group.id)}
                      onKeyDown={e => { if (e.key === 'Enter') commitGroupName(group.id); if (e.key === 'Escape') setEditingGroupId(null) }}
                      className="flex-1 text-xs font-semibold uppercase tracking-wide bg-card border border-accent rounded px-1.5 py-0.5 outline-none text-foreground"
                    />
                  ) : (
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide truncate">{group.name}</span>
                      <button
                        onClick={() => { setGroupDraft(group.name); setEditingGroupId(group.id) }}
                        className="opacity-0 group-hover/grp:opacity-100 transition-opacity text-muted-foreground hover:text-accent flex-shrink-0"
                      >
                        <Pencil size={10} />
                      </button>
                    </div>
                  )}
                  <span className="text-[11px] text-muted-foreground font-[tabular-nums] flex-shrink-0">{fmtLine(groupTotal)} / mo</span>
                  <button
                    onClick={() => removeSubscriptionGroup(group.id)}
                    className="opacity-0 group-hover/grp:opacity-100 transition-opacity text-muted-foreground hover:text-negative p-0.5 flex-shrink-0"
                  >
                    <X size={11} />
                  </button>
                </div>

                {group.subscriptions.length > 0 && (
                  <div className="px-5">
                    <div className="grid grid-cols-[1fr_72px_80px_60px_20px] gap-2 pb-1 border-b border-muted">
                      <span className="text-[10px] text-muted-foreground">Name</span>
                      <span className="text-[10px] text-muted-foreground text-right">Amount</span>
                      <span className="text-[10px] text-muted-foreground text-right">Frequency</span>
                      <span className="text-[10px] text-muted-foreground text-right">/ mo</span>
                      <span />
                    </div>
                    {group.subscriptions.map(sub => {
                      const monthly = toMonthly(sub.amount, sub.frequency)
                      return (
                        <div key={sub.id} className="group grid grid-cols-[1fr_72px_80px_60px_20px] gap-2 py-1.5 border-b border-muted last:border-0 items-center">
                          <input
                            autoFocus={sub.id === newSubId} type="text" value={sub.name} placeholder="Name"
                            onChange={e => { updateSubscription(group.id, sub.id, { name: e.target.value }); if (sub.id === newSubId) setNewSubId(null) }}
                            onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                            className="bg-card border border-border focus:border-accent rounded px-1.5 py-1 text-xs outline-none text-foreground placeholder:text-muted-foreground w-full transition-colors"
                          />
                          <NumericInput value={sub.amount} onChange={v => updateSubscription(group.id, sub.id, { amount: v })} prefix="$" className="w-full" />
                          <select
                            value={sub.frequency}
                            onChange={e => updateSubscription(group.id, sub.id, { frequency: e.target.value as Subscription['frequency'] })}
                            className="text-xs text-muted-foreground bg-card border border-border rounded px-1 py-1 cursor-pointer outline-none w-full"
                          >
                            {FREQ_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                          <span className="text-xs text-muted-foreground font-[tabular-nums] text-right">{fmtLine(monthly)}</span>
                          <button
                            onClick={() => removeSubscription(group.id, sub.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-negative flex items-center justify-center"
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
                  className="w-full flex items-center gap-1.5 px-5 py-1.5 text-[11px] text-muted-foreground hover:text-accent transition-colors"
                >
                  <Plus size={10} /> add to {group.name.toLowerCase()}
                </button>
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-border flex-shrink-0">
          <button onClick={addGroup} className="flex items-center gap-1.5 text-xs text-accent hover:text-foreground transition-colors">
            <Plus size={12} /> add group
          </button>
          <button onClick={onClose} className="bg-primary text-primary-foreground text-xs font-semibold px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity">
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
  return (
    <button
      onClick={() => addExpenseCategory({ id: newId(), label: 'New category', is_fixed: isFixed, items: [] })}
      className="w-full flex items-center justify-center gap-1.5 px-2 py-2 text-[11px] text-muted-foreground hover:text-accent border border-dashed border-border rounded-lg mt-1 bg-card transition-colors"
    >
      <Plus size={11} /> add category
    </button>
  )
}

// ── SectionHeader ─────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-xs font-bold text-primary uppercase tracking-widest">
        {title}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function ExpensesPage() {
  const fixed_expenses           = useFinStartStore(s => s.fixed_expenses)
  const variable_expenses        = useFinStartStore(s => s.variable_expenses)
  const updateExpenseCategoryRaw = useFinStartStore(s => s.updateExpenseCategory)

  const [showSubsModal, setShowSubsModal] = useState(false)
  const [flashId, setFlashId]             = useState<string | null>(null)

  const updateExpenseCategory = useCallback(
    (id: string, updates: Parameters<typeof updateExpenseCategoryRaw>[1]) => {
      updateExpenseCategoryRaw(id, updates)
      if ('is_fixed' in updates) { setFlashId(id); setTimeout(() => setFlashId(null), 900) }
    },
    [updateExpenseCategoryRaw]
  )
  void updateExpenseCategory

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
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground" style={{ letterSpacing: '-0.4px' }}>
            Expenses
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your monthly spending — hover any name and click the pencil to rename it
          </p>
        </div>

        {/* Summary bar */}
        <div className="bg-card border border-border rounded-xl px-5 py-4 flex gap-0 mb-6 shadow-sm">
          <div className="flex flex-col gap-0.5 flex-1">
            <span className="text-[11px] text-muted-foreground uppercase tracking-widest">Total monthly</span>
            <span className="text-2xl font-bold text-foreground font-[tabular-nums]" style={{ letterSpacing: '-0.4px' }}>
              {formatCurrency(totalExpenses)}
            </span>
          </div>
          <div className="w-px bg-border mx-5" />
          <div className="flex flex-col gap-0.5 flex-1">
            <span className="text-[11px] text-muted-foreground uppercase tracking-widest">Fixed</span>
            <span className="text-2xl font-bold text-primary font-[tabular-nums]" style={{ letterSpacing: '-0.4px' }}>
              {formatCurrency(totalFixed)}
            </span>
          </div>
          <div className="w-px bg-border mx-5" />
          <div className="flex flex-col gap-0.5 flex-1">
            <span className="text-[11px] text-muted-foreground uppercase tracking-widest">Variable</span>
            <span className="text-2xl font-bold text-accent font-[tabular-nums]" style={{ letterSpacing: '-0.4px' }}>
              {formatCurrency(totalVariable)}
            </span>
          </div>
        </div>

        {/* Debt section */}
        <div className="mb-8">
          <SectionHeader title="Debt" />
          <MortgageSection />
          <DebtSection />
        </div>

        {/* Fixed + Variable columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <SectionHeader title="Fixed" />
            {fixedCategories.map(cat => (
              <CategoryCard key={cat.id} category={cat} flashId={flashId} mortgageMonthly={mortgageMonthly} />
            ))}
            <SubscriptionsCard onManage={() => setShowSubsModal(true)} />
            <AddCategoryButton isFixed={true} />
          </div>
          <div>
            <SectionHeader title="Variable" />
            {variableCategories.map(cat => (
              <CategoryCard key={cat.id} category={cat} flashId={flashId} mortgageMonthly={mortgageMonthly} />
            ))}
            <AddCategoryButton isFixed={false} />
          </div>
        </div>
      </div>
    </>
  )
}