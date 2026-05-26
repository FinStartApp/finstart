import type {
  Earner,
  FixedExpenses,
  VariableExpenses,
  SavingsAndInvestments,
  Asset,
  Liability,
  Subscription,
  ForecastAssumptions,
} from '@/store/useFinStartStore'

// ============================================================
// US STATE INCOME TAX RATES (flat estimate for planning)
// ============================================================

export const STATE_TAX_RATES: Record<string, number> = {
  AL: 0.05, AK: 0.00, AZ: 0.025, AR: 0.047, CA: 0.093,
  CO: 0.044, CT: 0.065, DE: 0.066, FL: 0.00, GA: 0.055,
  HI: 0.11, ID: 0.058, IL: 0.0495, IN: 0.0305, IA: 0.057,
  KS: 0.057, KY: 0.045, LA: 0.0425, ME: 0.075, MD: 0.0575,
  MA: 0.05, MI: 0.0425, MN: 0.0985, MS: 0.05, MO: 0.048,
  MT: 0.059, NE: 0.0664, NV: 0.00, NH: 0.00, NJ: 0.0637,
  NM: 0.059, NY: 0.0685, NC: 0.0499, ND: 0.0290, OH: 0.0399,
  OK: 0.0475, OR: 0.099, PA: 0.0307, RI: 0.0599, SC: 0.064,
  SD: 0.00, TN: 0.00, TX: 0.00, UT: 0.0465, VT: 0.0875,
  VA: 0.0575, WA: 0.00, WV: 0.065, WI: 0.0765, WY: 0.00,
  DC: 0.085,
}

export const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'Washington D.C.' },
]

// ============================================================
// FREQUENCY CONVERSION
// ============================================================

export function toMonthly(amount: number, frequency: string): number {
  switch (frequency) {
    case 'weekly': return (amount * 52) / 12
    case 'biweekly': return (amount * 26) / 12
    case 'semi_monthly': return amount * 2
    case 'monthly': return amount
    case 'quarterly': return amount / 3
    case 'annual': return amount / 12
    case 'one_time': return 0
    default: return amount
  }
}

export function toAnnual(amount: number, frequency: string): number {
  return toMonthly(amount, frequency) * 12
}

// ============================================================
// FEDERAL INCOME TAX (2024 brackets, single filer)
// Standard deduction applied before bracket calculation
// ============================================================

function estimateFederalTax(taxable_income: number): number {
  const standard_deduction = 14600
  const income = Math.max(0, taxable_income - standard_deduction)

  if (income <= 11600) return income * 0.10
  if (income <= 47150) return 1160 + (income - 11600) * 0.12
  if (income <= 100525) return 5426 + (income - 47150) * 0.22
  if (income <= 191950) return 17168.5 + (income - 100525) * 0.24
  if (income <= 243725) return 39110.5 + (income - 191950) * 0.32
  if (income <= 609350) return 55678.5 + (income - 243725) * 0.35
  return 183647.25 + (income - 609350) * 0.37
}

// ============================================================
// EARNER CALCULATION — Gross to Net
// ============================================================

export interface EarnerCalculation {
  gross_annual: number
  gross_monthly: number
  bonus_annual: number
  bonus_monthly: number
  bonus_tax_monthly: number
  pretax_deductions_monthly: number
  posttax_deductions_monthly: number
  pension_contribution_monthly: number
  taxable_income_annual: number
  estimated_federal_tax_annual: number
  estimated_federal_tax_monthly: number
  state_tax_annual: number
  state_tax_monthly: number
  fica_tax_annual: number
  fica_tax_monthly: number
  total_tax_monthly: number
  net_monthly_take_home: number
  employer_401k_match_annual: number
  total_401k_traditional_annual: number
  total_401k_roth_annual: number
  estimated_pension_monthly_at_retirement: number
  deductions_complete: boolean
}

export function calculateEarner(
  earner: Earner,
  state_code: string
): EarnerCalculation {
  // Step 1: Gross income
  let gross_annual = 0
  if (earner.employment_type === 'hourly') {
    gross_annual = earner.hourly_rate * earner.hours_per_week * 52
  } else {
    gross_annual = earner.gross_annual_salary
  }
  const gross_monthly = gross_annual / 12

  // Step 2: Bonus — taxed at 22% supplemental rate
  const bonus_annual = earner.bonus.has_bonus
    ? earner.bonus.gross_annual_bonus
    : 0
  const bonus_monthly = bonus_annual / 12
  const bonus_tax_monthly = bonus_monthly * 0.22

  // Step 3: Pre-tax deductions (monthly)
  const d = earner.pre_tax_deductions

  const traditional_monthly =
    d.retirement_type === 'traditional' || d.retirement_type === 'both'
      ? (gross_monthly * d.retirement401k_traditional_percent) / 100
      : 0

  const roth_monthly =
    d.retirement_type === 'roth' || d.retirement_type === 'both'
      ? (gross_monthly * d.retirement401k_roth_percent) / 100
      : 0

  // Only traditional reduces taxable income
  const pretax_retirement = traditional_monthly

  const insurance_pretax =
    d.health_insurance + d.dental + d.vision

  const hsa_monthly = d.has_hsa ? d.hsa : 0
  const fsa_monthly = d.has_fsa ? d.fsa : 0

  const pretax_deductions_monthly =
    pretax_retirement +
    insurance_pretax +
    hsa_monthly +
    fsa_monthly +
    d.other_pretax

  // Step 4: Post-tax deductions
  const posttax_deductions_monthly =
    earner.post_tax_deductions.other_posttax +
    roth_monthly // Roth comes out post-tax

  // Step 5: Pension employee contribution
  const pension_contribution_monthly = earner.pension.has_pension
    ? (gross_monthly * earner.pension.employee_contribution_percent) / 100
    : 0

  // Step 6: Employer 401k match
  const effective_contribution_percent =
    d.retirement_type === 'both'
      ? d.retirement401k_traditional_percent +
        d.retirement401k_roth_percent
      : d.retirement_type === 'traditional'
      ? d.retirement401k_traditional_percent
      : d.retirement401k_roth_percent

  const matched_percent = Math.min(
    effective_contribution_percent,
    d.employer_match_up_to_percent
  )
  const employer_match_monthly =
    (gross_monthly * matched_percent * d.employer_match_percent) / 10000
  const employer_401k_match_annual = employer_match_monthly * 12

  const total_401k_traditional_annual = traditional_monthly * 12
  const total_401k_roth_annual = roth_monthly * 12

  // Step 7: Taxable income
  const taxable_income_annual =
    gross_annual - pretax_deductions_monthly * 12

  // Step 8: Federal income tax
  const estimated_federal_tax_annual =
    estimateFederalTax(taxable_income_annual)
  const estimated_federal_tax_monthly = estimated_federal_tax_annual / 12

  // Step 9: State income tax
  const state_rate = STATE_TAX_RATES[state_code] ?? 0
  const state_tax_annual = taxable_income_annual * state_rate
  const state_tax_monthly = state_tax_annual / 12

  // Step 10: FICA
  const ss_wage_base = 168600
  const social_security = Math.min(gross_annual, ss_wage_base) * 0.062
  const medicare = gross_annual * 0.0145
  const additional_medicare =
    gross_annual > 200000 ? (gross_annual - 200000) * 0.009 : 0
  const fica_tax_annual = social_security + medicare + additional_medicare
  const fica_tax_monthly = fica_tax_annual / 12

  // Step 11: Total tax
  const total_tax_monthly =
    estimated_federal_tax_monthly +
    state_tax_monthly +
    fica_tax_monthly

  // Step 12: Net take-home
  const net_monthly_take_home =
    gross_monthly +
    bonus_monthly -
    pretax_deductions_monthly -
    posttax_deductions_monthly -
    pension_contribution_monthly -
    total_tax_monthly -
    bonus_tax_monthly

  // Step 13: Estimated pension at retirement
  const estimated_pension_monthly_at_retirement =
    earner.pension.has_pension
      ? estimatePensionPayment(earner)
      : 0

  return {
    gross_annual,
    gross_monthly,
    bonus_annual,
    bonus_monthly,
    bonus_tax_monthly,
    pretax_deductions_monthly,
    posttax_deductions_monthly,
    pension_contribution_monthly,
    taxable_income_annual,
    estimated_federal_tax_annual,
    estimated_federal_tax_monthly,
    state_tax_annual,
    state_tax_monthly,
    fica_tax_annual,
    fica_tax_monthly,
    total_tax_monthly,
    net_monthly_take_home: Math.max(0, net_monthly_take_home),
    employer_401k_match_annual,
    total_401k_traditional_annual,
    total_401k_roth_annual,
    estimated_pension_monthly_at_retirement,
    deductions_complete: earner.deductions_complete,
  }
}

// ============================================================
// PENSION ESTIMATE
// Uses salary projection + YOS to estimate monthly benefit
// AFC calculated from projected final 5 years of salary
// ============================================================

export function estimatePensionPayment(earner: Earner): number {
  if (!earner.pension.has_pension || !earner.date_of_birth) return 0

  const current_year = new Date().getFullYear()
  const birth_year = new Date(earner.date_of_birth).getFullYear()
  const current_age = current_year - birth_year
  const years_to_retirement = Math.max(
    0,
    earner.target_retirement_age - current_age
  )

  const first_contribution_year = earner.pension.first_contribution_year
  const years_of_service_at_retirement =
    earner.target_retirement_age -
    (current_age - (current_year - first_contribution_year))

  if (years_of_service_at_retirement <= 0) return 0

  // Project salary to retirement using 3.5% growth assumption
  const growth_rate = 0.035
  const salary_at_retirement =
    earner.gross_annual_salary *
    Math.pow(1 + growth_rate, years_to_retirement)

  // AFC = average of final 5 years of projected salary
  const afc_years = 5
  let afc_sum = 0
  for (let i = 0; i < afc_years; i++) {
    const years_back = years_to_retirement - i
    afc_sum +=
      earner.gross_annual_salary * Math.pow(1 + growth_rate, years_back)
  }
  const afc = afc_sum / afc_years

  // Monthly pension = (AFC × multiplier% × YOS) / 12
  const annual_pension =
    afc *
    (earner.pension.benefit_multiplier_percent / 100) *
    years_of_service_at_retirement

  return annual_pension / 12
}

// ============================================================
// HOUSEHOLD INCOME SUMMARY
// ============================================================

export interface HouseholdIncomeSummary {
  total_gross_monthly: number
  total_gross_annual: number
  total_net_monthly: number
  total_net_annual: number
  total_additional_income_monthly: number
  total_take_home_monthly: number
  any_deductions_incomplete: boolean
}

export function calculateHouseholdIncome(
  earners: Earner[],
  state_code: string
): HouseholdIncomeSummary {
  const earner_calcs = earners.map((e) => calculateEarner(e, state_code))

  const total_gross_monthly = earner_calcs.reduce(
    (sum, e) => sum + e.gross_monthly,
    0
  )
  const total_gross_annual = total_gross_monthly * 12
  const total_net_monthly = earner_calcs.reduce(
    (sum, e) => sum + e.net_monthly_take_home,
    0
  )
  const total_net_annual = total_net_monthly * 12

  const total_additional_income_monthly = earners.reduce((sum, earner) => {
    return (
      sum +
      earner.additional_income.reduce((s, source) => {
        return s + toMonthly(source.amount, source.frequency)
      }, 0)
    )
  }, 0)

  const total_take_home_monthly =
    total_net_monthly + total_additional_income_monthly

  const any_deductions_incomplete = earners.some(
    (e) => !e.deductions_complete
  )

  return {
    total_gross_monthly,
    total_gross_annual,
    total_net_monthly,
    total_net_annual,
    total_additional_income_monthly,
    total_take_home_monthly,
    any_deductions_incomplete,
  }
}

// ============================================================
// SUBSCRIPTION TOTALS
// ============================================================

export function calculateSubscriptionMonthly(
  subscriptions: Subscription[]
): number {
  return subscriptions.reduce((sum, sub) => {
    return sum + toMonthly(sub.amount, sub.frequency)
  }, 0)
}

// ============================================================
// EXPENSE TOTALS
// ============================================================

export function calculateFixedExpensesMonthly(
  fixed: FixedExpenses
): number {
  const subscription_total =
    fixed.subscriptions.length > 0
      ? calculateSubscriptionMonthly(fixed.subscriptions)
      : fixed.subscriptions_total_override

  const debt_total = fixed.debt_payments.reduce(
    (sum, d) => sum + d.minimum_payment,
    0
  )

  const custom_total = fixed.custom_fixed.reduce((sum, item) => {
    return sum + toMonthly(item.amount, item.frequency)
  }, 0)

  return (
    fixed.housing +
    fixed.utilities +
    fixed.internet_phone +
    fixed.insurance +
    subscription_total +
    fixed.childcare_education +
    debt_total +
    custom_total
  )
}

export function calculateVariableExpensesMonthly(
  variable: VariableExpenses
): number {
  const custom_total = variable.custom_variable.reduce((sum, item) => {
    return sum + toMonthly(item.amount, item.frequency)
  }, 0)

  return (
    variable.groceries +
    variable.dining_takeout +
    variable.auto_transportation +
    variable.health_medical +
    variable.personal_care +
    variable.clothing_shopping +
    variable.entertainment_activities +
    variable.travel_vacation +
    variable.gifts_giving +
    variable.pet_care +
    variable.home_maintenance +
    custom_total
  )
}

export function calculateSavingsMonthly(
  savings: SavingsAndInvestments
): number {
  const goals_total = savings.savings_goals.reduce((sum, goal) => {
    return sum + goal.monthly_contribution
  }, 0)

  return (
    savings.emergency_fund_contribution +
    savings.additional_retirement_contribution +
    savings.brokerage_contribution +
    goals_total
  )
}

// ============================================================
// MONTHLY P&L SUMMARY
// ============================================================

export interface MonthlyPLSummary {
  total_take_home: number
  total_fixed_expenses: number
  total_variable_expenses: number
  total_expenses: number
  total_savings: number
  total_outflows: number
  net_cash_flow: number
  savings_rate: number
  any_deductions_incomplete: boolean
}

export function calculateMonthlyPL(
  earners: Earner[],
  fixed: FixedExpenses,
  variable: VariableExpenses,
  savings: SavingsAndInvestments,
  state_code: string
): MonthlyPLSummary {
  const income = calculateHouseholdIncome(earners, state_code)
  const total_take_home = income.total_take_home_monthly
  const total_fixed_expenses = calculateFixedExpensesMonthly(fixed)
  const total_variable_expenses = calculateVariableExpensesMonthly(variable)
  const total_expenses = total_fixed_expenses + total_variable_expenses
  const total_savings = calculateSavingsMonthly(savings)
  const total_outflows = total_expenses + total_savings
  const net_cash_flow = total_take_home - total_outflows
  const savings_rate =
    total_take_home > 0 ? (total_savings / total_take_home) * 100 : 0

  return {
    total_take_home,
    total_fixed_expenses,
    total_variable_expenses,
    total_expenses,
    total_savings,
    total_outflows,
    net_cash_flow,
    savings_rate,
    any_deductions_incomplete: income.any_deductions_incomplete,
  }
}

// ============================================================
// BALANCE SHEET
// ============================================================

export interface BalanceSheetSummary {
  total_assets: number
  total_liabilities: number
  net_worth: number
}

export function calculateBalanceSheet(
  assets: Asset[],
  liabilities: Liability[]
): BalanceSheetSummary {
  const total_assets = assets.reduce((sum, a) => sum + a.value, 0)
  const total_liabilities = liabilities.reduce(
    (sum, l) => sum + l.balance,
    0
  )
  const net_worth = total_assets - total_liabilities

  return { total_assets, total_liabilities, net_worth }
}

// ============================================================
// MULTI-YEAR FORECAST
// ============================================================

export interface ForecastYear {
  year: number
  age_earner1: number
  age_earner2: number | null
  gross_income: number
  net_income: number
  total_expenses: number
  total_savings: number
  net_cash_flow: number
  retirement_balance_traditional: number
  retirement_balance_roth: number
  pension_income_monthly: number
  net_worth: number
  is_retirement_year_earner1: boolean
  is_retirement_year_earner2: boolean
  phase: 'accumulation' | 'retirement'
}

export function calculateForecast(
  earners: Earner[],
  fixed: FixedExpenses,
  variable: VariableExpenses,
  savings: SavingsAndInvestments,
  assets: Asset[],
  liabilities: Liability[],
  assumptions: ForecastAssumptions,
  state_code: string
): ForecastYear[] {
  const current_year = new Date().getFullYear()
  const pl = calculateMonthlyPL(
    earners, fixed, variable, savings, state_code
  )
  const bs = calculateBalanceSheet(assets, liabilities)

  const earner1_birth_year = earners[0]?.date_of_birth
    ? new Date(earners[0].date_of_birth).getFullYear()
    : current_year - 30
  const earner2_birth_year = earners[1]?.date_of_birth
    ? new Date(earners[1].date_of_birth).getFullYear()
    : null

  const earner1_retirement_age = earners[0]?.target_retirement_age ?? 65
  const earner2_retirement_age = earners[1]?.target_retirement_age ?? 65

  const retirement_traditional_start = assets
    .filter((a) => a.type === 'retirement')
    .reduce((sum, a) => sum + a.value, 0) * 0.7
  const retirement_roth_start = assets
    .filter((a) => a.type === 'retirement')
    .reduce((sum, a) => sum + a.value, 0) * 0.3

  const earner1_age_now = current_year - earner1_birth_year
  const forecast_years = assumptions.forecast_end_age - earner1_age_now

  const forecast: ForecastYear[] = []
  let running_net_worth = bs.net_worth
  let running_traditional = retirement_traditional_start
  let running_roth = retirement_roth_start

  const annual_traditional_contribution = earners.reduce((sum, e) => {
    return sum + (e.pre_tax_deductions.retirement401k_traditional_percent / 100) *
      e.gross_annual_salary
  }, 0)

  const annual_roth_contribution = earners.reduce((sum, e) => {
    return sum + (e.pre_tax_deductions.retirement401k_roth_percent / 100) *
      e.gross_annual_salary
  }, 0)

  const pension_monthly = earners.reduce((sum, e) => {
    return sum + estimatePensionPayment(e)
  }, 0)

  for (let i = 0; i < forecast_years; i++) {
    const year = current_year + i
    const earner1_age = earner1_age_now + i
    const earner2_age = earner2_birth_year
      ? year - earner2_birth_year
      : null

    const earner1_retired = earner1_age >= earner1_retirement_age
    const earner2_retired =
      earner2_age !== null && earner2_age >= earner2_retirement_age
    const all_retired =
      earner1_retired && (earners.length === 1 || earner2_retired)

    const is_retirement_year_earner1 =
      earner1_age === earner1_retirement_age
    const is_retirement_year_earner2 =
      earner2_age !== null && earner2_age === earner2_retirement_age

    const income_multiplier = Math.pow(
      1 + assumptions.salary_growth_rate / 100, i
    )
    const expense_multiplier = Math.pow(
      1 + assumptions.inflation_rate / 100, i
    )

    let net_income: number
    let pension_income_monthly = 0

    if (all_retired) {
      const withdrawal_annual =
        (running_traditional + running_roth) *
        (assumptions.withdrawal_rate / 100)
      pension_income_monthly = pension_monthly
      net_income = withdrawal_annual + pension_monthly * 12
    } else {
      net_income = pl.total_take_home * 12 * income_multiplier
      if (earner1_retired && earners.length > 1) net_income *= 0.6
      else if (earner2_retired && earners.length > 1) net_income *= 0.6
    }

    const total_expenses = pl.total_expenses * 12 * expense_multiplier
    const total_savings = all_retired ? 0 : pl.total_savings * 12
    const net_cash_flow = net_income - total_expenses - total_savings

    const return_rate = assumptions.investment_return_rate / 100

    if (all_retired) {
      const total_balance = running_traditional + running_roth
      const withdrawal =
        total_balance * (assumptions.withdrawal_rate / 100)
      const traditional_ratio =
        total_balance > 0 ? running_traditional / total_balance : 0.7
      running_traditional = Math.max(
        0,
        (running_traditional - withdrawal * traditional_ratio) *
          (1 + return_rate)
      )
      running_roth = Math.max(
        0,
        (running_roth - withdrawal * (1 - traditional_ratio)) *
          (1 + return_rate)
      )
    } else {
      running_traditional =
        running_traditional * (1 + return_rate) +
        annual_traditional_contribution
      running_roth =
        running_roth * (1 + return_rate) + annual_roth_contribution
    }

    running_net_worth += net_cash_flow

    forecast.push({
      year,
      age_earner1: earner1_age,
      age_earner2: earner2_age,
      gross_income: net_income,
      net_income,
      total_expenses,
      total_savings,
      net_cash_flow,
      retirement_balance_traditional: Math.max(0, running_traditional),
      retirement_balance_roth: Math.max(0, running_roth),
      pension_income_monthly,
      net_worth: running_net_worth,
      is_retirement_year_earner1,
      is_retirement_year_earner2,
      phase: all_retired ? 'retirement' : 'accumulation',
    })
  }

  return forecast
}

// ============================================================
// UTILITY HELPERS
// ============================================================

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}