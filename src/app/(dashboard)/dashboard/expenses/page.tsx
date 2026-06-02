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
  annualizedMonthlyDebt,
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
  return { id: newId(), label: '', balance: 0, interest_rate: 0, monthly_payment: 0, minimum_payment: 0, type: 'other', start_month: null, start_year: null }
}
function blankSubscription(): Subscription {
  return { id: newId(), name: '', amount: 0, frequency: 'monthly' }
}
function sortCategories(cats: ExpenseCategory[]): ExpenseCategory[] {
  return [...cats].sort((a, b) => {
    const aNew = a.label === 'New category'
    const bNew = b.label === 'New category'
    if (aNew && !bNew) return 1
    if (!aNew && bNew) return -1
    return a.label.localeCompare(b.label)
  })
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

const FREQ_OPTIONS: { value: ExpenseLineItem['frequency']; label: string }[] = [
  { value: 'weekly',    label: '/ wk'  },
  { value: 'biweekly',  label: '/ 2wk' },
  { value: 'monthly',   label: '/ mo'  },
  { value: 'quarterly', label: '/ qtr' },
  { value: 'annual',    label: '/ yr'  },
]

function fmtLine(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n)
}

// ── Tooltip ───────────────────────────────────────────────────
function Tooltip({ text, children, align = 'center' }: { text: string; children: React.ReactNode; align?: 'center' | 'right' }) {
  return (
    <span className="relative inline-flex group/tip">
      {children}
      <span
        className="pointer-events-none absolute bottom-full mb-2 w-72 rounded-lg bg-primary text-primary-foreground text-[11px] leading-snug px-2.5 py-1.5 text-center opacity-0 group-hover/tip:opacity-100 transition-opacity duration-75 z-50 shadow-md whitespace-normal"
        style={align === 'right' ? { right: 0, transform: 'translateX(20px)' } : { left: '50%', transform: 'translateX(-50%)' }}
      >
        {text}
        {align === 'right'
          ? <span className="absolute top-full right-3 border-4 border-transparent border-t-primary" />
          : <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-primary" />
        }
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
  const [raw, setRaw]         = useState('')
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
  const [draft, setDraft]     = useState(value)
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
    // Only activate monthly detail mode when the user actually enters a value
    // This prevents opening and closing the panel from wiping the standard amount/frequency
    const hasAnyValue = next.some(v => v > 0)
    updateExpenseLineItem(categoryId, item.id, {
      monthly_amounts: next,
      use_monthly_detail: hasAnyValue,
    })
  }

  function clearDetail() {
    updateExpenseLineItem(categoryId, item.id, { use_monthly_detail: false, monthly_amounts: Array(12).fill(0) })
    onClose()
  }

  const hasData = item.monthly_amounts.some(v => v > 0)
  const avg     = item.monthly_amounts.reduce((a, b) => a + b, 0) / 12

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
            <button onClick={clearDetail} className="text-[11px] text-negative hover:underline transition-colors font-semibold">
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
// The input zone uses a fixed 268px width (inline style — intentional, not a design token)
// The avg/mo row uses IDENTICAL column widths as the normal input row so they align perfectly
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
  function togglePanel() { setPanelOpen(p => !p) }

  if (locked) {
    return (
      <div className="flex items-center gap-2 py-1.5 border-b border-muted last:border-0">
        {/* w-4 spacer matches the delete button column */}
        <span className="w-4 flex-shrink-0" />
        {/* Label gets flex-1 so it can show as much text as possible */}
        <span className="text-xs text-foreground truncate flex-1 min-w-0">
          {lockedLabel ?? item.label}
        </span>
        {/* Linked pill — flex-shrink-0 so it never gets crushed */}
        <span className="text-[9px] bg-selection text-accent border border-accent/30 rounded px-1.5 py-0.5 flex-shrink-0 font-semibold tracking-wide uppercase">
          linked
        </span>
        {/* Amount — right-aligned, separated by a gap from the pill */}
        <span className="text-xs font-semibold text-foreground font-[tabular-nums] flex-shrink-0 text-right ml-3">
          {fmtLine(monthly)}
        </span>
      </div>
    )
  }

  return (
    <>
      {/* ── Single line item row — layout never changes, only the input zone contents swap ── */}
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

        {/* Fixed 268px input zone — same structure always, contents swap when monthly active */}
        <div className="flex items-center gap-1.5 flex-shrink-0" style={{ width: 268 }}>
          {isMonthlyActive ? (
            <>
              {/* Read-only avg amount — same 80px width as NumericInput */}
              <div
                className="flex items-center justify-end bg-selection border border-border rounded px-1.5 py-1 font-[tabular-nums] text-xs font-semibold text-accent flex-shrink-0"
                style={{ width: 80 }}
              >
                {fmtLine(monthly)}
              </div>
              {/* Static /mo label — same 58px width as frequency select, left-padded like the select */}
              <div
                className="flex items-center bg-selection border border-border rounded text-[11px] text-accent font-medium flex-shrink-0 px-1"
                style={{ width: 58, height: 26 }}
              >
                / mo
              </div>
              {/* Spacer matching the converted-amount column */}
              <span className="flex-shrink-0" style={{ width: 48 }} />
              {/* Edit/hide toggle — same 52px width as "by month" button */}
              <button
                onClick={togglePanel}
                className="text-[10px] text-accent hover:underline whitespace-nowrap flex-shrink-0 border border-dashed border-border rounded bg-card"
                style={{ width: 52, padding: '2px 0', textAlign: 'center' }}
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
                by month
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
  category, flashId, mortgageMonthly, mortgageIsActive, autoFocusLabel = false,
}: {
  category: ExpenseCategory; flashId: string | null; mortgageMonthly: number; mortgageIsActive: boolean; autoFocusLabel?: boolean
}) {
  const updateExpenseCategory = useFinStartStore(s => s.updateExpenseCategory)
  const removeExpenseCategory = useFinStartStore(s => s.removeExpenseCategory)
  const addExpenseLineItem    = useFinStartStore(s => s.addExpenseLineItem)

  const [open, setOpen]                   = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [newItemId, setNewItemId]         = useState<string | null>(null)

  const isHousing        = category.label.toLowerCase() === 'housing'
  const isFlashing       = flashId === category.id
  // Show mortgage linked row as soon as the checkbox is checked — amount shows $0 until filled in
  const showMortgageLine = isHousing && mortgageIsActive
  // Hide the default rent/housing cost item when mortgage is active — it's replaced by the linked row
  const visibleItems     = isHousing && mortgageIsActive
    ? category.items.filter(item => item.label.toLowerCase() !== 'housing cost / rent')
    : category.items
  const itemsTotal       = visibleItems.reduce((sum, item) => sum + resolveLineItemMonthly(item), 0)
  const total            = itemsTotal + (showMortgageLine ? mortgageMonthly : 0)
  const isEmpty          = total === 0

  function addLine() {
    const item = blankLineItem('')
    addExpenseLineItem(category.id, item)
    setNewItemId(item.id)
    setOpen(true)
  }

  function handleDelete() {
    if ((visibleItems.length > 0 || showMortgageLine) && !confirmDelete) { setConfirmDelete(true); return }
    removeExpenseCategory(category.id)
  }

  const mortgageLinkedItem: ExpenseLineItem = {
    id: '__mortgage_linked__', label: 'Mortgage (P&I + Escrow)',
    amount: mortgageMonthly, frequency: 'monthly',
    use_monthly_detail: false, monthly_amounts: Array(12).fill(0),
  }

  return (
    <div className={`border rounded-xl mb-2 overflow-hidden shadow-sm transition-all duration-500 ${isFlashing ? 'bg-selection border-accent' : 'bg-card border-border'}`}>

      {/* ── Header — ENTIRE ROW is the click target for expand/collapse ── */}
      <div
        className="group flex items-center gap-2 px-3 py-3 cursor-pointer hover:bg-hover transition-colors select-none"
        onClick={() => setOpen(o => !o)}
      >
        {/* F/V toggle — stopPropagation so clicking F or V doesn't expand/collapse */}
        <div
          className="flex border border-border rounded-full overflow-hidden flex-shrink-0"
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

        {/* Category name — pencil button inside EditableLabel has its own stopPropagation */}
        <div className="flex-1 min-w-0">
          <EditableLabel
            value={category.label}
            onSave={v => updateExpenseCategory(category.id, { label: v })}
            autoFocus={autoFocusLabel}
            className="text-sm font-semibold text-foreground"
            inputClassName="text-sm font-semibold w-full"
          />
        </div>

        {/* Total pill — larger and clearly readable */}
        <span className={`text-sm font-bold font-[tabular-nums] px-3 py-0.5 rounded-full flex-shrink-0 ${isEmpty ? 'bg-secondary text-muted-foreground' : 'bg-selection text-primary'}`}>
          {formatCurrency(total)}
        </span>

        {/* Delete controls — stopPropagation */}
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

        {/* Chevron — pointer-events-none, purely decorative, parent div handles the click */}
        <div className="text-muted-foreground flex-shrink-0 ml-1 pointer-events-none">
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {/* ── Expanded content ── */}
      {open && (
        <>
          {(visibleItems.length > 0 || showMortgageLine) && (
            <div className="px-3 border-t border-border bg-secondary">
              {showMortgageLine && (
                <LineItemRow item={mortgageLinkedItem} categoryId={category.id} locked lockedLabel="Mortgage (P&I + Escrow)" />
              )}
              {visibleItems.map(item => (
                <LineItemRow key={item.id} item={item} categoryId={category.id} autoFocusLabel={item.id === newItemId} />
              ))}
            </div>
          )}
          {visibleItems.length === 0 && !showMortgageLine && (
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
      setShowEscrow(false)
    } else {
      updateMortgage({ is_active: checked })
      // Auto-open escrow when user first checks the mortgage box
      if (checked) setShowEscrow(true)
    }
  }

  return (
    <div className="mb-3">
      {/* Single outer container carries the continuous navy left border across toggle + detail */}
      <div
        className="bg-card border border-border rounded-xl overflow-hidden shadow-sm"
        style={{ borderLeftWidth: 4, borderLeftColor: 'var(--primary)' }}
      >
        {/* Toggle row */}
        <div className="px-4 py-3 border-b border-border">
          <label className="flex items-center gap-2.5 cursor-pointer group select-none">
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
        </div>

        {mortgage.is_active && (
          <>
            {/* Column headers — white bg with border-bottom only, no gray fill */}
            <div className="grid grid-cols-[1fr_100px_64px_88px_88px] gap-2 px-5 py-2 border-b border-border">
              <span className="text-[10px] text-foreground font-semibold uppercase tracking-wide">Name</span>
              <span className="text-[10px] text-foreground font-semibold uppercase tracking-wide text-right">Balance</span>
              <span className="text-[10px] text-foreground font-semibold uppercase tracking-wide text-right">Rate</span>
              <span className="text-[10px] text-foreground font-semibold uppercase tracking-wide text-right">Payment</span>
              <span className="text-[10px] text-foreground font-semibold uppercase tracking-wide text-right">Min. pmt</span>
            </div>

            {/* Single mortgage data row — white bg, border-bottom */}
            <div className="grid grid-cols-[1fr_100px_64px_88px_88px] gap-2 px-5 py-3 border-b border-border items-center">
              <input
                type="text"
                defaultValue="Mortgage P&I"
                readOnly
                className="bg-secondary border border-border rounded px-2 py-1 text-xs text-muted-foreground w-full cursor-default"
              />
              <NumericInput value={mortgage.balance}            onChange={v => updateMortgage({ balance: v })}            prefix="$" className="w-full" />
              <NumericInput value={mortgage.interest_rate}      onChange={v => updateMortgage({ interest_rate: v })}      suffix="%" decimals={3} className="w-full" placeholder="0.000" />
              <NumericInput value={mortgage.pi_payment}         onChange={v => updateMortgage({ pi_payment: v })}         prefix="$" className="w-full" />
              <NumericInput value={mortgage.minimum_pi_payment} onChange={v => updateMortgage({ minimum_pi_payment: v })} prefix="$" className="w-full" />
            </div>

            {/* Escrow accordion toggle — text-foreground (not muted) so it reads as actionable */}
            <button
              onClick={() => setShowEscrow(s => !s)}
              className="w-full flex items-center justify-between px-5 py-2.5 hover:bg-hover transition-colors border-b border-border group"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground">Escrow</span>
                <span className="text-xs text-muted-foreground">— property taxes, insurance, PMI</span>
                {hasEscrow && (
                  <span className="text-[10px] text-primary font-semibold font-[tabular-nums] bg-selection px-1.5 py-0.5 rounded">
                    {fmtLine(escrowTotal)} / mo
                  </span>
                )}
                {/* Hint shown only when collapsed and no escrow values entered yet */}
                {!showEscrow && !hasEscrow && (
                  <span className="text-[11px] text-accent font-medium">
                    — click to enter amounts
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {showEscrow
                  ? <ChevronUp size={15} className="text-accent" />
                  : <ChevronDown size={15} className="text-accent group-hover:text-primary transition-colors" />
                }
              </div>
            </button>

            {/* Escrow fields — the ONE gray sub-section in this card, clearly contained */}
            {showEscrow && (
              <div className="px-5 py-4 border-b border-border bg-secondary">
                <div className="grid grid-cols-3 gap-6">
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

            {/* Total row — white bg, label and amount bold navy */}
            {totalMonthly > 0 && (
              <div className="flex items-center justify-between px-5 py-3">
                <span className="text-xs font-bold text-primary">Total monthly housing payment</span>
                <span className="text-sm font-bold text-primary font-[tabular-nums]">{fmtLine(totalMonthly)}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ── DebtSection ───────────────────────────────────────────────
// Each debt row tracks start_month / start_year (nullable).
// annualizedMonthlyDebt() prorates mid-year debts consistently
// with how expense line items use 12-month averaging.
// Avg/mo = annualized figure; Payment = what you actually pay each month.
// They differ only when a debt started in the current calendar year.

const MONTH_NAMES = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec',
]

function DebtRow({
  debt,
  updateDebtPayment,
  removeDebtPayment,
}: {
  debt: DebtPayment
  updateDebtPayment: (id: string, updates: Partial<DebtPayment>) => void
  removeDebtPayment: (id: string) => void
}) {
  const [showStartDate, setShowStartDate] = useState(false)
  // Local draft for year — lets user type freely without store fighting each keystroke
  const [yearDraft, setYearDraft] = useState(debt.start_year ? String(debt.start_year) : '')

  const avgMonthly = annualizedMonthlyDebt(debt)
  const hasStartDate = debt.start_month !== null && debt.start_year !== null
  const avgDiffersFromPayment = Math.abs(avgMonthly - debt.monthly_payment) > 0.01

  function commitYear(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, 4)
    setYearDraft(digits)
    if (digits.length === 4) {
      updateDebtPayment(debt.id, { start_year: parseInt(digits) })
    } else {
      updateDebtPayment(debt.id, { start_year: null })
    }
  }

  return (
    <>
      {/* ── Main debt row ── */}
      <div className="group grid grid-cols-[1fr_96px_60px_80px_80px_80px_24px] gap-2 px-5 py-2 border-b border-muted last:border-0 items-center hover:bg-hover transition-colors">
        {/* Name — with subtle start date tag on hover or when set */}
        <div className="flex items-center gap-1.5 min-w-0">
          <input
            type="text" value={debt.label} placeholder="e.g. Student loan"
            onChange={e => updateDebtPayment(debt.id, { label: e.target.value })}
            className="bg-card border border-border focus:border-accent rounded px-2 py-1 text-xs outline-none text-foreground placeholder:text-muted-foreground w-full transition-colors"
          />
          {/* Start date tag — always visible when set, hover-only when not */}
          <button
            onClick={() => setShowStartDate(s => !s)}
            className={`flex-shrink-0 text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap transition-colors border text-center ${
              hasStartDate
                ? 'text-accent border-accent/30 bg-selection'
                : 'text-muted-foreground border-border bg-card opacity-0 group-hover:opacity-100'
            }`}
            style={{ width: 88 }}
            title={hasStartDate ? 'Edit start date' : 'Set start date'}
          >
            {hasStartDate
              ? `since ${MONTH_NAMES[(debt.start_month ?? 1) - 1]} ${debt.start_year}`
              : '+ start date'
            }
          </button>
        </div>
        <NumericInput value={debt.balance}         onChange={v => updateDebtPayment(debt.id, { balance: v })}         prefix="$" className="w-full" />
        <NumericInput value={debt.interest_rate}   onChange={v => updateDebtPayment(debt.id, { interest_rate: v })}   suffix="%" decimals={2} className="w-full" placeholder="0.00" />
        <NumericInput value={debt.monthly_payment} onChange={v => updateDebtPayment(debt.id, { monthly_payment: v })} prefix="$" className="w-full" />
        <NumericInput value={debt.minimum_payment} onChange={v => updateDebtPayment(debt.id, { minimum_payment: v })} prefix="$" className="w-full" />
        {/* Avg/mo — shows annualized figure, muted when same as payment */}
        <div className="text-right">
          <span className={`text-xs font-semibold font-[tabular-nums] ${avgDiffersFromPayment ? 'text-accent' : 'text-muted-foreground'}`}>
            {fmtLine(avgMonthly)}
          </span>
          {avgDiffersFromPayment && (
            <Tooltip align="right" text={`Based on ${13 - (debt.start_month ?? 1)} months of payments in ${debt.start_year} (started ${MONTH_NAMES[(debt.start_month ?? 1) - 1]} ${debt.start_year})`}>
              <span className="ml-0.5 w-3 h-3 rounded-full bg-muted text-muted-foreground text-[9px] inline-flex items-center justify-center cursor-help font-bold">?</span>
            </Tooltip>
          )}
        </div>
        <button
          onClick={() => removeDebtPayment(debt.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-negative flex items-center justify-center"
        >
          <X size={13} />
        </button>
      </div>

      {/* ── Inline start date selector — appears below this row when open ── */}
      {showStartDate && (
        <div className="grid grid-cols-[1fr_auto] gap-3 px-5 py-2.5 border-b border-muted bg-hover items-center">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground whitespace-nowrap">Debt started:</span>
            <select
              value={debt.start_month ?? ''}
              onChange={e => updateDebtPayment(debt.id, {
                start_month: e.target.value ? parseInt(e.target.value) : null
              })}
              className="text-xs bg-card border border-border rounded px-2 py-1 outline-none text-foreground cursor-pointer"
            >
              <option value="">Month</option>
              {MONTH_NAMES.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
            <input
              type="text" inputMode="numeric"
              placeholder="Year (e.g. 2025)"
              value={yearDraft}
              onChange={e => commitYear(e.target.value)}
              className="text-xs bg-card border border-border rounded px-2 py-1 outline-none text-foreground w-28"
            />
            {hasStartDate && (
              <button
                onClick={() => { updateDebtPayment(debt.id, { start_month: null, start_year: null }); setYearDraft('') }}
                className="text-[11px] text-muted-foreground hover:text-negative transition-colors"
              >
                clear
              </button>
            )}
            <span className="text-[11px] text-muted-foreground italic">
              — affects Avg/mo for the current year only
            </span>
          </div>
          <button
            onClick={() => setShowStartDate(false)}
            className="text-[11px] text-accent hover:underline whitespace-nowrap"
          >
            done
          </button>
        </div>
      )}
    </>
  )
}

function DebtSection() {
  const debts             = useFinStartStore(s => s.fixed_expenses.debt_payments)
  const addDebtPayment    = useFinStartStore(s => s.addDebtPayment)
  const updateDebtPayment = useFinStartStore(s => s.updateDebtPayment)
  const removeDebtPayment = useFinStartStore(s => s.removeDebtPayment)
  // Monthly total uses annualized figures — consistent with P&L calculation
  const total = debts.reduce((sum, d) => sum + annualizedMonthlyDebt(d), 0)

  return (
    <div
      className="bg-card border border-border rounded-xl overflow-hidden shadow-sm"
      style={{ borderLeftWidth: 4, borderLeftColor: 'var(--primary)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div>
          <h2 className="text-sm font-bold text-foreground">Other debt payments</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Auto loans, student loans, credit cards — balance and rate carry forward to the Debt Payoff planner
          </p>
        </div>
        <div className="text-right flex-shrink-0 ml-4">
          <span className="text-[11px] text-muted-foreground uppercase tracking-wide block">Monthly total</span>
          <span className="text-lg font-bold text-foreground font-[tabular-nums]">{formatCurrency(total)}</span>
        </div>
      </div>

      {/* Column headers */}
      {debts.length > 0 && (
        <div className="grid grid-cols-[1fr_96px_60px_80px_80px_80px_24px] gap-2 px-5 py-2 bg-secondary border-b border-border">
          <span className="text-[10px] text-foreground font-semibold uppercase tracking-wide">Name</span>
          <span className="text-[10px] text-foreground font-semibold uppercase tracking-wide text-right">Balance</span>
          <span className="text-[10px] text-foreground font-semibold uppercase tracking-wide text-right">Rate</span>
          <span className="text-[10px] text-foreground font-semibold uppercase tracking-wide text-right">Payment</span>
          <span className="text-[10px] text-foreground font-semibold uppercase tracking-wide text-right">Min. pmt</span>
          <span className="text-[10px] text-foreground font-semibold uppercase tracking-wide text-right">Avg / mo</span>
          <span />
        </div>
      )}

      {debts.length === 0 && (
        <p className="px-5 py-4 text-xs text-muted-foreground italic">
          No other debts added yet — auto loans, student loans, credit cards.
        </p>
      )}

      {debts.map(debt => (
        <DebtRow
          key={debt.id}
          debt={debt}
          updateDebtPayment={updateDebtPayment}
          removeDebtPayment={removeDebtPayment}
        />
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
      <div className="flex items-center gap-2 px-3 py-3">
        <div className="flex border border-border rounded-full overflow-hidden flex-shrink-0">
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-primary text-primary-foreground">F</span>
          <span className="px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">V</span>
        </div>
        <span className="flex-1 text-sm font-semibold text-foreground">Subscriptions & memberships</span>
        <span className={`text-sm font-bold font-[tabular-nums] px-3 py-0.5 rounded-full flex-shrink-0 ${isEmpty ? 'bg-secondary text-muted-foreground' : 'bg-selection text-primary'}`}>
          {formatCurrency(total)}
        </span>
        {/* Invisible chevron-sized spacer — matches CategoryCard header exactly so pill aligns */}
        <ChevronDown size={14} className="flex-shrink-0 ml-1 opacity-0" aria-hidden="true" />
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
function AddCategoryButton({ isFixed, onAdded }: { isFixed: boolean; onAdded: (id: string) => void }) {
  const addExpenseCategory = useFinStartStore(s => s.addExpenseCategory)

  function handleAdd() {
    const id = newId()
    addExpenseCategory({ id, label: 'New category', is_fixed: isFixed, items: [] })
    onAdded(id)
  }

  return (
    <button
      onClick={handleAdd}
      className="w-full flex items-center justify-center gap-1.5 px-2 py-2 text-[11px] text-muted-foreground hover:text-accent border border-dashed border-border rounded-lg mt-1 bg-card transition-colors"
    >
      <Plus size={11} /> add category
    </button>
  )
}

// ── SectionHeader ─────────────────────────────────────────────
// Intentionally larger and heavier than category card labels (text-sm font-semibold)
// These are structural page anchors — they must dominate the category names below them
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-base font-extrabold text-primary uppercase tracking-widest flex-shrink-0">
        {title}
      </span>
      <div className="flex-1 h-0.5 bg-primary" style={{ opacity: 0.2 }} />
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
  const [newCategoryId, setNewCategoryId] = useState<string | null>(null)

  const updateExpenseCategory = useCallback(
    (id: string, updates: Parameters<typeof updateExpenseCategoryRaw>[1]) => {
      updateExpenseCategoryRaw(id, updates)
      if ('is_fixed' in updates) { setFlashId(id); setTimeout(() => setFlashId(null), 900) }
    },
    [updateExpenseCategoryRaw]
  )
  void updateExpenseCategory

  const mortgageMonthly    = calculateMortgageMonthlyTotal(fixed_expenses.mortgage)
  const mortgageIsActive   = fixed_expenses.mortgage.is_active
  const fixedCategories    = sortCategories(fixed_expenses.categories)
  const variableCategories = sortCategories(variable_expenses.categories)
  const totalFixed         = calculateFixedExpensesMonthly(fixed_expenses)
  const totalVariable      = calculateVariableExpensesMonthly(variable_expenses)
  const totalExpenses      = totalFixed + totalVariable

  return (
    <>
      {showSubsModal && <SubscriptionsModal onClose={() => setShowSubsModal(false)} />}

      <div className="p-6 max-w-5xl mx-auto">
        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground" style={{ letterSpacing: '-0.4px' }}>
            Expenses
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your monthly spending — hover any name and click the pencil to rename it
          </p>
        </div>

        {/* Summary bar — larger numbers, clear visual weight */}
        <div className="bg-card border border-border rounded-xl mb-8 shadow-sm overflow-hidden">
          <div className="flex divide-x divide-border">
            <div className="flex flex-col gap-1 flex-1 px-6 py-4">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Total monthly</span>
              <span className="text-3xl font-bold text-foreground font-[tabular-nums]" style={{ letterSpacing: '-0.5px' }}>
                {formatCurrency(totalExpenses)}
              </span>
            </div>
            <div className="flex flex-col gap-1 flex-1 px-6 py-4">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Fixed</span>
              <span className="text-3xl font-bold text-primary font-[tabular-nums]" style={{ letterSpacing: '-0.5px' }}>
                {formatCurrency(totalFixed)}
              </span>
            </div>
            <div className="flex flex-col gap-1 flex-1 px-6 py-4">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Variable</span>
              <span className="text-3xl font-bold text-accent font-[tabular-nums]" style={{ letterSpacing: '-0.5px' }}>
                {formatCurrency(totalVariable)}
              </span>
            </div>
          </div>
        </div>

        {/* Debt section — white tray matching categories tray below */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-5 mb-8">
          <SectionHeader title="Debt" />
          <MortgageSection />
          <DebtSection />
        </div>

        {/* Fixed + Variable columns — white tray groups them as one workspace */}
        <div className="bg-card border border-border rounded-xl shadow-sm p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <SectionHeader title="Fixed" />
              {fixedCategories.map(cat => (
                <CategoryCard key={cat.id} category={cat} flashId={flashId} mortgageMonthly={mortgageMonthly} mortgageIsActive={mortgageIsActive} autoFocusLabel={cat.id === newCategoryId} />
              ))}
              <SubscriptionsCard onManage={() => setShowSubsModal(true)} />
              <AddCategoryButton isFixed={true} onAdded={id => setNewCategoryId(id)} />
            </div>
            <div>
              <SectionHeader title="Variable" />
              {variableCategories.map(cat => (
                <CategoryCard key={cat.id} category={cat} flashId={flashId} mortgageMonthly={mortgageMonthly} mortgageIsActive={mortgageIsActive} autoFocusLabel={cat.id === newCategoryId} />
              ))}
              <AddCategoryButton isFixed={false} onAdded={id => setNewCategoryId(id)} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}