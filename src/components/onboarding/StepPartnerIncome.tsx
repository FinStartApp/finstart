'use client'

import { useFinStartStore } from '@/store/useFinStartStore'
import CurrencyInput from '@/components/ui/CurrencyInput'
import SalaryGrowthSlider from '@/components/onboarding/SalaryGrowthSlider'

interface Props {
  onNext: () => void
  onBack: () => void
}

const EMPLOYMENT_TYPES = [
  { value: 'salaried', label: 'Salaried' },
  { value: 'hourly', label: 'Hourly' },
  { value: 'self_employed', label: 'Self-Employed' },
  { value: 'commission', label: 'Commission' },
]

const PAY_FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 Weeks' },
  { value: 'semi_monthly', label: 'Twice a Month' },
  { value: 'monthly', label: 'Monthly' },
]

function ConfigButton({ selected, onClick, children, className = '' }: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
  className?: string
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${className}`}
      style={{
        border: selected ? '1.5px solid var(--primary)' : '0.5px solid var(--border)',
        background: selected ? '#DDE6F5' : 'var(--card)',
        color: 'var(--foreground)',
      }}
    >
      {children}
    </button>
  )
}

function DecisionButton({ selected, onClick, children }: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="px-4 py-3 rounded-xl text-sm font-semibold transition-all"
      style={{
        border: selected ? '1.5px solid var(--primary)' : '0.5px solid var(--border)',
        background: selected ? 'var(--primary)' : 'var(--card)',
        color: selected ? 'white' : 'var(--foreground)',
      }}
    >
      {children}
    </button>
  )
}

export default function StepPartnerIncome({ onNext, onBack }: Props) {
  const { earners, updateEarner } = useFinStartStore()
  const earner = earners[1]

  if (!earner) return null

  function update(field: string, value: unknown) {
    updateEarner(earner.id, { [field]: value } as never)
  }

  function updateDeduction(field: string, value: number | boolean | string) {
    updateEarner(earner.id, {
      pre_tax_deductions: { ...earner.pre_tax_deductions, [field]: value },
    })
  }

  const canContinue =
    earner.label.trim() !== '' &&
    (earner.gross_annual_salary > 0 || earner.hourly_rate > 0)

  const d = earner.pre_tax_deductions

  return (
    <div className="space-y-7">

      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-4"
          style={{ background: '#EAF3DE' }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#3B6D11' }} />
          <span className="text-xs font-semibold" style={{ color: '#3B6D11' }}>
            Partner income
          </span>
        </div>
        <h1 className="text-2xl font-bold text-[var(--foreground)] mb-2 leading-tight"
          style={{ letterSpacing: '-0.4px' }}>
          Now let's add your partner's income
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
          Same process — we'll calculate their take-home pay to complete your household picture.
        </p>
      </div>

      {/* Name */}
      <div className="space-y-2">
        <label className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-widest">
          Partner's Name
        </label>
        <input
          type="text"
          value={earner.label}
          onChange={(e) => update('label', e.target.value)}
          placeholder="First name or nickname"
          className="w-full px-4 py-3 rounded-xl text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] bg-[var(--card)] focus:outline-none transition-all"
          style={{ border: '0.5px solid var(--border)' }}
        />
      </div>

      {/* Date of Birth */}
      <div className="space-y-2">
        <label className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-widest">
          Date of Birth
        </label>
        <p className="text-xs text-[var(--muted-foreground)] -mt-1">
          Used to calculate retirement timing and Social Security estimates
        </p>
        <input
          type="date"
          value={earner.date_of_birth}
          onChange={(e) => update('date_of_birth', e.target.value)}
          className="w-full px-4 py-3 rounded-xl text-sm text-[var(--foreground)] bg-[var(--card)] focus:outline-none transition-all"
          style={{ border: '0.5px solid var(--border)' }}
        />
      </div>

      {/* First Year of Work */}
      <div className="space-y-2">
        <label className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-widest">
          First Year They Started Working
        </label>
        <p className="text-xs text-[var(--muted-foreground)] -mt-1">
          Used to estimate their Social Security benefit
        </p>
        <input
          type="number"
          value={earner.first_year_of_work || ''}
          onChange={(e) =>
            update('first_year_of_work', parseInt(e.target.value) || new Date().getFullYear())
          }
          placeholder={String(new Date().getFullYear())}
          className="w-full px-4 py-3 rounded-xl text-sm text-[var(--foreground)] bg-[var(--card)] focus:outline-none transition-all"
          style={{ border: '0.5px solid var(--border)' }}
        />
      </div>

      {/* Employment Type — config, light blue */}
      <div className="space-y-2.5">
        <label className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-widest">
          Employment Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          {EMPLOYMENT_TYPES.map((type) => (
            <ConfigButton
              key={type.value}
              selected={earner.employment_type === type.value}
              onClick={() => update('employment_type', type.value)}
            >
              {type.label}
            </ConfigButton>
          ))}
        </div>
      </div>

      {/* Salary or Hourly */}
      {earner.employment_type === 'hourly' ? (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-widest">
              Hourly Rate
            </label>
            <CurrencyInput value={earner.hourly_rate} onChange={(val) => update('hourly_rate', val)} />
          </div>
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-widest">
              Hours / Week
            </label>
            <input
              type="number"
              value={earner.hours_per_week || ''}
              onChange={(e) => update('hours_per_week', parseFloat(e.target.value) || 0)}
              placeholder="40"
              className="w-full px-4 py-3 rounded-xl text-sm text-[var(--foreground)] bg-[var(--card)] focus:outline-none transition-all"
              style={{ border: '0.5px solid var(--border)' }}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-widest">
            Gross Annual Salary
          </label>
          <p className="text-xs text-[var(--muted-foreground)] -mt-1">
            Total salary before taxes or deductions — not including bonuses
          </p>
          <CurrencyInput value={earner.gross_annual_salary} onChange={(val) => update('gross_annual_salary', val)} />
        </div>
      )}

      {/* Pay Frequency — config, light blue */}
      <div className="space-y-2.5">
        <label className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-widest">
          How Often Are They Paid?
        </label>
        <div className="grid grid-cols-2 gap-2">
          {PAY_FREQUENCIES.map((freq) => (
            <ConfigButton
              key={freq.value}
              selected={earner.pay_frequency === freq.value}
              onClick={() => update('pay_frequency', freq.value)}
            >
              {freq.label}
            </ConfigButton>
          ))}
        </div>
      </div>

      {/* Bonus — binary, dark navy */}
      <div className="space-y-2.5">
        <label className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-widest">
          Does your partner receive a bonus?
        </label>
        <div className="grid grid-cols-2 gap-2">
          {[{ value: true, label: 'Yes' }, { value: false, label: 'No' }].map((opt) => (
            <DecisionButton
              key={String(opt.value)}
              selected={earner.bonus.has_bonus === opt.value}
              onClick={() => update('bonus', { ...earner.bonus, has_bonus: opt.value })}
            >
              {opt.label}
            </DecisionButton>
          ))}
        </div>
        {earner.bonus.has_bonus && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--muted-foreground)]">
              Estimated Gross Annual Bonus
            </label>
            <CurrencyInput
              value={earner.bonus.gross_annual_bonus}
              onChange={(val) => update('bonus', { ...earner.bonus, gross_annual_bonus: val })}
            />
            <p className="text-xs text-[var(--muted-foreground)]">Enter gross amount before taxes</p>
          </div>
        )}
      </div>

      {/* Deductions toggle — binary, dark navy */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-widest">
              Paycheck Deductions
            </label>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
              Do you have your partner's paystub handy?
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => updateEarner(earner.id, { deductions_complete: false })}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                border: !earner.deductions_complete ? '1.5px solid var(--primary)' : '0.5px solid var(--border)',
                background: !earner.deductions_complete ? 'var(--primary)' : 'var(--card)',
                color: !earner.deductions_complete ? 'white' : 'var(--foreground)',
              }}
            >
              Fill in later
            </button>
            <button
              onClick={() => updateEarner(earner.id, { deductions_complete: true })}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                border: earner.deductions_complete ? '1.5px solid var(--primary)' : '0.5px solid var(--border)',
                background: earner.deductions_complete ? 'var(--primary)' : 'var(--card)',
                color: earner.deductions_complete ? 'white' : 'var(--foreground)',
              }}
            >
              I have it
            </button>
          </div>
        </div>

        {!earner.deductions_complete && (
          <div className="rounded-xl px-4 py-3"
            style={{ background: '#FEF3C7', border: '0.5px solid #FCD34D' }}>
            <p className="text-xs" style={{ color: '#92400E' }}>
              That's okay — your take-home pay estimate will show on your dashboard
              with a reminder to come back and add this later.
            </p>
          </div>
        )}

        {earner.deductions_complete && (
          <div className="space-y-4">

            {/* 401k type — config, light blue */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-[var(--muted-foreground)]">401(k) Type</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'traditional', label: 'Traditional', hint: 'Pre-tax' },
                  { value: 'roth', label: 'Roth', hint: 'Post-tax' },
                  { value: 'both', label: 'Both', hint: 'Split' },
                ].map((opt) => (
                  <ConfigButton
                    key={opt.value}
                    selected={d.retirement_type === opt.value}
                    onClick={() =>
                      updateEarner(earner.id, {
                        pre_tax_deductions: {
                          ...earner.pre_tax_deductions,
                          retirement_type: opt.value as 'traditional' | 'roth' | 'both',
                        },
                      })
                    }
                    className="flex flex-col"
                  >
                    <div>{opt.label}</div>
                    <div className="text-[var(--muted-foreground)] font-normal text-xs mt-0.5">{opt.hint}</div>
                  </ConfigButton>
                ))}
              </div>
            </div>

            {(d.retirement_type === 'traditional' || d.retirement_type === 'both') && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--muted-foreground)]">Traditional 401(k) — % of salary</label>
                <div className="relative">
                  <input
                    type="number"
                    value={d.retirement401k_traditional_percent || ''}
                    onChange={(e) => updateDeduction('retirement401k_traditional_percent', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full pl-4 pr-8 py-2.5 rounded-lg text-sm text-[var(--foreground)] bg-[var(--card)] focus:outline-none transition-all"
                    style={{ border: '0.5px solid var(--border)' }}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] text-xs">%</span>
                </div>
              </div>
            )}

            {(d.retirement_type === 'roth' || d.retirement_type === 'both') && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--muted-foreground)]">Roth 401(k) — % of salary</label>
                <div className="relative">
                  <input
                    type="number"
                    value={d.retirement401k_roth_percent || ''}
                    onChange={(e) => updateDeduction('retirement401k_roth_percent', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full pl-4 pr-8 py-2.5 rounded-lg text-sm text-[var(--foreground)] bg-[var(--card)] focus:outline-none transition-all"
                    style={{ border: '0.5px solid var(--border)' }}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] text-xs">%</span>
                </div>
              </div>
            )}

            {/* Employer match */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--muted-foreground)]">Employer Match %</label>
                <div className="relative">
                  <input
                    type="number"
                    value={d.employer_match_percent || ''}
                    onChange={(e) => updateDeduction('employer_match_percent', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full pl-4 pr-8 py-2.5 rounded-lg text-sm text-[var(--foreground)] bg-[var(--card)] focus:outline-none transition-all"
                    style={{ border: '0.5px solid var(--border)' }}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] text-xs">%</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--muted-foreground)]">Up To % of Salary</label>
                <div className="relative">
                  <input
                    type="number"
                    value={d.employer_match_up_to_percent || ''}
                    onChange={(e) => updateDeduction('employer_match_up_to_percent', parseFloat(e.target.value) || 0)}
                    placeholder="100"
                    className="w-full pl-4 pr-8 py-2.5 rounded-lg text-sm text-[var(--foreground)] bg-[var(--card)] focus:outline-none transition-all"
                    style={{ border: '0.5px solid var(--border)' }}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] text-xs">%</span>
                </div>
              </div>
            </div>

            {/* Insurance deductions */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { field: 'health_insurance', label: 'Health Insurance' },
                { field: 'dental', label: 'Dental' },
                { field: 'vision', label: 'Vision' },
                { field: 'other_pretax', label: 'Other Pre-Tax' },
              ].map(({ field, label }) => (
                <div key={field} className="space-y-1.5">
                  <label className="text-xs font-medium text-[var(--muted-foreground)]">{label}</label>
                  <CurrencyInput
                    value={(d as never)[field] || 0}
                    onChange={(val) => updateDeduction(field, val)}
                  />
                </div>
              ))}
            </div>

            {/* HSA */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={d.has_hsa}
                  onChange={(e) => updateDeduction('has_hsa', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium text-[var(--foreground)]">
                  Partner contributes to an HSA through their paycheck
                </span>
                <span className="text-xs text-[var(--muted-foreground)]">(Health Savings Account — pre-tax)</span>
              </label>
              {d.has_hsa && (
                <div className="space-y-1.5">
                  <CurrencyInput value={d.hsa} onChange={(val) => updateDeduction('hsa', val)} placeholder="Per paycheck amount" />
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Paycheck deductions only. If they transfer to their HSA directly from their bank,
                    do not include that here — add it under Expenses instead to avoid double counting.
                  </p>
                </div>
              )}
            </div>

            {/* FSA */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={d.has_fsa}
                  onChange={(e) => updateDeduction('has_fsa', e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium text-[var(--foreground)]">
                  Partner contributes to an FSA through their paycheck
                </span>
                <span className="text-xs text-[var(--muted-foreground)]">(Flexible Spending Account — pre-tax)</span>
              </label>
              {d.has_fsa && (
                <div className="space-y-1.5">
                  <CurrencyInput value={d.fsa} onChange={(val) => updateDeduction('fsa', val)} placeholder="Per paycheck amount" />
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Paycheck deductions only. FSA funds are use-it-or-lose-it —
                    only include what comes out of their paycheck here.
                  </p>
                </div>
              )}
            </div>

            {/* Post-tax */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--muted-foreground)]">Other Post-Tax Deductions</label>
              <p className="text-xs text-[var(--muted-foreground)]">Gym membership, parking, charity, etc. — per paycheck</p>
              <CurrencyInput
                value={earner.post_tax_deductions.other_posttax}
                onChange={(val) => updateEarner(earner.id, { post_tax_deductions: { other_posttax: val } })}
              />
            </div>

            {/* Pension — binary, dark navy */}
            <div className="space-y-2.5">
              <label className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-widest">
                Does your partner have a pension?
              </label>
              <p className="text-xs text-[var(--muted-foreground)] -mt-1">
                A pension is a retirement benefit paid by their employer based on years of service and salary
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[{ value: true, label: 'Yes' }, { value: false, label: 'No' }].map((opt) => (
                  <DecisionButton
                    key={String(opt.value)}
                    selected={earner.pension.has_pension === opt.value}
                    onClick={() => update('pension', { ...earner.pension, has_pension: opt.value })}
                  >
                    {opt.label}
                  </DecisionButton>
                ))}
              </div>

              {earner.pension.has_pension && (
                <div className="space-y-3 rounded-xl p-4"
                  style={{ background: 'var(--secondary)', border: '0.5px solid var(--border)' }}>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-[var(--muted-foreground)]">First Year of Contribution</label>
                      <input
                        type="number"
                        value={earner.pension.first_contribution_year || ''}
                        onChange={(e) => update('pension', { ...earner.pension, first_contribution_year: parseInt(e.target.value) || new Date().getFullYear() })}
                        placeholder={String(new Date().getFullYear())}
                        className="w-full px-3 py-2.5 rounded-lg text-sm text-[var(--foreground)] bg-[var(--card)] focus:outline-none transition-all"
                        style={{ border: '0.5px solid var(--border)' }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-[var(--muted-foreground)]">Benefit Multiplier %</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={earner.pension.benefit_multiplier_percent || ''}
                          onChange={(e) => update('pension', { ...earner.pension, benefit_multiplier_percent: parseFloat(e.target.value) || 1.0 })}
                          placeholder="1.0"
                          className="w-full pl-3 pr-8 py-2.5 rounded-lg text-sm text-[var(--foreground)] bg-[var(--card)] focus:outline-none transition-all"
                          style={{ border: '0.5px solid var(--border)' }}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] text-xs">%</span>
                      </div>
                      <p className="text-xs text-[var(--muted-foreground)]">Common range: 1–2.5%. Check your plan documents.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-[var(--muted-foreground)]">Their Contribution %</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={earner.pension.employee_contribution_percent || ''}
                          onChange={(e) => update('pension', { ...earner.pension, employee_contribution_percent: parseFloat(e.target.value) || 0 })}
                          placeholder="0"
                          className="w-full pl-3 pr-8 py-2.5 rounded-lg text-sm text-[var(--foreground)] bg-[var(--card)] focus:outline-none transition-all"
                          style={{ border: '0.5px solid var(--border)' }}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] text-xs">%</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-[var(--muted-foreground)]">Employer Contribution %</label>
                      <div className="relative">
                        <input
                          type="number"
                          value={earner.pension.employer_contribution_percent || ''}
                          onChange={(e) => update('pension', { ...earner.pension, employer_contribution_percent: parseFloat(e.target.value) || 0 })}
                          placeholder="0"
                          className="w-full pl-3 pr-8 py-2.5 rounded-lg text-sm text-[var(--foreground)] bg-[var(--card)] focus:outline-none transition-all"
                          style={{ border: '0.5px solid var(--border)' }}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] text-xs">%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Retirement balances */}
      {earner.deductions_complete && (
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-widest">
              Partner's Current Retirement Account Balances
            </label>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              Their current saved balance — not their monthly contribution.
              Used to project your household retirement picture accurately.
            </p>
          </div>
          <div className="space-y-3 rounded-xl p-4"
            style={{ background: 'var(--secondary)', border: '0.5px solid var(--border)' }}>
            {(d.retirement_type === 'traditional' || d.retirement_type === 'both') && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--muted-foreground)]">Traditional 401(k) Current Balance</label>
                <CurrencyInput value={earner.balance_401k_traditional} onChange={(val) => update('balance_401k_traditional', val)} />
              </div>
            )}
            {(d.retirement_type === 'roth' || d.retirement_type === 'both') && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--muted-foreground)]">Roth 401(k) Current Balance</label>
                <CurrencyInput value={earner.balance_401k_roth} onChange={(val) => update('balance_401k_roth', val)} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Salary Growth Rate */}
      <SalaryGrowthSlider
        value={earner.salary_growth_rate}
        onChange={(val) => update('salary_growth_rate', val)}
        label="Partner's Expected Annual Raises"
      />

      {/* Target Retirement Age */}
      <div className="space-y-2">
        <label className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-widest">
          Partner's Target Retirement Age
        </label>
        <input
          type="number"
          value={earner.target_retirement_age || ''}
          onChange={(e) => update('target_retirement_age', parseInt(e.target.value) || 65)}
          placeholder="65"
          className="w-full px-4 py-3 rounded-xl text-sm text-[var(--foreground)] bg-[var(--card)] focus:outline-none transition-all"
          style={{ border: '0.5px solid var(--border)' }}
        />
      </div>

      {/* Navigation */}
      <div className="space-y-3 pt-1">
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 py-3.5 rounded-xl font-semibold text-sm transition-all hover:opacity-80"
            style={{ border: '0.5px solid var(--border)', background: 'var(--card)', color: 'var(--foreground)' }}
          >
            Back
          </button>
          <button
            onClick={onNext}
            disabled={!canContinue}
            className="flex-[2] py-3.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: 'var(--primary)', color: 'white' }}
          >
            Continue →
          </button>
        </div>
        <p className="text-xs text-[var(--muted-foreground)] text-center">
          Your data stays on your device
        </p>
      </div>

    </div>
  )
}