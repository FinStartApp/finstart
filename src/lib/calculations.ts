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
// FREQUENCY CONVERSION
// Converts any amount + frequency to a monthly equivalent
// ============================================================

export function toMonthly(amount: number, frequency: string): number {
  switch (frequency) {
    case 'weekly':
      return (amount * 52) / 12
    case 'biweekly':
      return (amount * 26) / 12
    case 'semi_monthly':
      return amount * 2
    case 'monthly':
      return amount
    case 'quarterly':
      return amount / 3
    case 'annual':
      return amount / 12
    case 'one_time':
      return 0
    default:
      return amount
  }
}

export function toAnnual(amount: number, frequency: string): number {
  return toMonthly(amount, frequency) * 12
}

// ============================================================
// INCOME CALCULATIONS
// Gross to net for a single earner
// ============================================================

export interface EarnerCalculation {
  gross_annual: number
  gross_monthly: number
  bonus_annual: number
  bonus_monthly: number
  pretax_deductions_monthly: number
  taxable_income_annual: number
  estimated_federal_tax_annual: number
  estimated_federal_tax_monthly: number
  fica_tax_annual: number
  fica_tax_monthly: number
  total_tax_monthly: number
  net_monthly_take_home: number
  employer_401k_match_annual: number
  total_401k_annual: number
}

export function calculateEarner(earner: Earner): EarnerCalculation {
  // Step 1: Gross income
  let gross_annual = 0

  if (earner.employment_type === 'hourly') {
    gross_annual = earner.hourly_rate * earner.hours_per_week * 52
  } else {
    gross_annual = earner.gross_annual_salary
  }

  const gross_monthly = gross_annual / 12

  // Step 2: Bonus
  const bonus_annual = toAnnual(earner.bonus_amount, earner.bonus_frequency)
  const bonus_monthly = bonus_annual / 12

  // Step 3: Pre-tax deductions (monthly)
  const d = earner.pre_tax_deductions
  const retirement_monthly =
    d.retirement401k_percent > 0
      ? (gross_monthly * d.retirement401k_percent) / 100
      : toMonthly(d.retirement401k_dollar, 'monthly')

  const pretax_deductions_monthly =
    retirement_monthly +
    d.health_insurance +
    d.dental +
    d.vision +
    d.hsa +
    d.fsa +
    d.other_pretax

  // Step 4: Employer 401k match
  const employer_match_monthly =
    (gross_monthly *
      Math.min(
        d.retirement401k_percent,
        d.employer_match_up_to_percent
      ) *
      d.employer_match_percent) /
    10000

  const employer_401k_match_annual = employer_match_monthly * 12
  const total_401k_annual =
    retirement_monthly * 12 + employer_401k_match_annual

  // Step 5: Taxable income
  const taxable_income_annual =
    gross_annual - pretax_deductions_monthly * 12

  // Step 6: Estimated federal income tax (2024 brackets, single filer)
  // Note: This is an estimate. Actual tax depends on filing status,
  // deductions, credits, and other factors.
  const estimated_federal_tax_annual = estimateFederalTax(
    taxable_income_annual
  )
  const estimated_federal_tax_monthly = estimated_federal_tax_annual / 12

  // Step 7: FICA taxes (Social Security 6.2% up to $168,600, Medicare 1.45%)
  const ss_wage_base = 168600
  const social_security =
    Math.min(gross_annual, ss_wage_base) * 0.062
  const medicare = gross_annual * 0.0145
  const additional_medicare =
    gross_annual > 200000 ? (gross_annual - 200000) * 0.009 : 0
  const fica_tax_annual = social_security + medicare + additional_medicare
  const fica_tax_monthly = fica_tax_annual / 12

  // Step 8: Total tax
  const total_tax_monthly =
    estimated_federal_tax_monthly + fica_tax_monthly

  // Step 9: Net take-home
  const net_monthly_take_home =
    gross_monthly - pretax_deductions_monthly - total_tax_monthly

  return {
    gross_annual,
    gross_monthly,
    bonus_annual,
    bonus_monthly,
    pretax_deductions_monthly,
    taxable_income_annual,
    estimated_federal_tax_annual,
    estimated_federal_tax_monthly,
    fica_tax_annual,
    fica_tax_monthly,
    total_tax_monthly,
    net_monthly_take_home,
    employer_401k_match_annual,
    total_401k_annual,
  }
}

// 2024 federal income tax brackets (single filer)
// We apply standard deduction of $14,600 before bracket calculation
function estimateFederalTax(taxable_income: number): number {
  const standard_deduction = 14600
  const income = Math.max(0, taxable_income - standard_deduction)

  if (income <= 11600) return income * 0.1
  if (income <= 47150)
    return 1160 + (income - 11600) * 0.12
  if (income <= 100525)
    return 5426 + (income - 47150) * 0.22
  if (income <= 191950)
    return 17168.5 + (income - 100525) * 0.24
  if (income <= 243725)
    return 39110.5 + (income - 191950) * 0.32
  if (income <= 609350)
    return 55678.5 + (income - 243725) * 0.35
  return 183647.25 + (income - 609350) * 0.37
}

// ============================================================
// HOUSEHOLD INCOME SUMMARY
// Combines all earners into household totals
// ============================================================

export interface HouseholdIncomeSummary {
  total_gross_monthly: number
  total_gross_annual: number
  total_net_monthly: number
  total_net_annual: number
  total_additional_income_monthly: number
  total_take_home_monthly: number
}

export function calculateHouseholdIncome(
  earners: Earner[]
): HouseholdIncomeSummary {
  const earner_calcs = earners.map(calculateEarner)

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

  return {
    total_gross_monthly,
    total_gross_annual,
    total_net_monthly,
    total_net_annual,
    total_additional_income_monthly,
    total_take_home_monthly,
  }
}

// ============================================================
// SUBSCRIPTION TOTALS
// Rolls up subscription table to monthly total
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
  const subscription_total = calculateSubscriptionMonthly(
    fixed.subscriptions
  )

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
// The core financial picture
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
}

export function calculateMonthlyPL(
  earners: Earner[],
  fixed: FixedExpenses,
  variable: VariableExpenses,
  savings: SavingsAndInvestments
): MonthlyPLSummary {
  const income = calculateHouseholdIncome(earners)
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
  }
}

// ============================================================
// BALANCE SHEET
// Net worth calculation
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

  return {
    total_assets,
    total_liabilities,
    net_worth,
  }
}

// ============================================================
// MULTI-YEAR FORECAST
// Projects current year forward with growth assumptions
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
  retirement_balance: number
  net_worth: number
  is_retirement_year_earner1: boolean
  is_retirement_year_earner2: boolean
}

export function calculateForecast(
  earners: Earner[],
  fixed: FixedExpenses,
  variable: VariableExpenses,
  savings: SavingsAndInvestments,
  assets: Asset[],
  liabilities: Liability[],
  assumptions: ForecastAssumptions
): ForecastYear[] {
  const currentYear = new Date().getFullYear()
  const pl = calculateMonthlyPL(earners, fixed, variable, savings)
  const bs = calculateBalanceSheet(assets, liabilities)

  const earner1_dob = earners[0]?.date_of_birth
  const earner2_dob = earners[1]?.date_of_birth ?? null
  const earner1_birth_year = earner1_dob
    ? new Date(earner1_dob).getFullYear()
    : currentYear - 30
  const earner2_birth_year = earner2_dob
    ? new Date(earner2_dob).getFullYear()
    : null

  const earner1_retirement_age = earners[0]?.target_retirement_age ?? 65
  const earner2_retirement_age = earners[1]?.target_retirement_age ?? 65

  const retirement_balance_start = assets
    .filter((a) => a.type === 'retirement')
    .reduce((sum, a) => sum + a.value, 0)

  const annual_retirement_contribution =
    calculateSavingsMonthly(savings) * 12

  const forecast: ForecastYear[] = []
  let running_net_worth = bs.net_worth
  let running_retirement = retirement_balance_start

  const earner1_age_now = currentYear - earner1_birth_year
  const forecast_years = assumptions.forecast_end_age - earner1_age_now

  for (let i = 0; i < forecast_years; i++) {
    const year = currentYear + i
    const earner1_age = earner1_age_now + i
    const earner2_age = earner2_birth_year
      ? year - earner2_birth_year
      : null

    const is_retirement_year_earner1 =
      earner1_age === earner1_retirement_age
    const is_retirement_year_earner2 =
      earner2_age !== null && earner2_age === earner2_retirement_age

    const earner1_retired = earner1_age >= earner1_retirement_age
    const earner2_retired =
      earner2_age !== null && earner2_age >= earner2_retirement_age

    const income_multiplier = Math.pow(
      1 + assumptions.salary_growth_rate / 100,
      i
    )
    const expense_multiplier = Math.pow(
      1 + assumptions.inflation_rate / 100,
      i
    )

    let gross_income = pl.total_take_home * 12 * income_multiplier
    if (earner1_retired) gross_income = gross_income * 0.3
    if (earner2_retired && earners.length > 1)
      gross_income = gross_income * 0.5

    const total_expenses =
      pl.total_expenses * 12 * expense_multiplier
    const total_savings = pl.total_savings * 12
    const net_income = gross_income
    const net_cash_flow = net_income - total_expenses - total_savings

    running_retirement =
      running_retirement *
        (1 + assumptions.investment_return_rate / 100) +
      (earner1_retired ? -running_retirement * 0.04 : annual_retirement_contribution)

    running_net_worth += net_cash_flow
    if (running_retirement > 0) running_net_worth += running_retirement * (assumptions.investment_return_rate / 100)

    forecast.push({
      year,
      age_earner1: earner1_age,
      age_earner2: earner2_age,
      gross_income,
      net_income,
      total_expenses,
      total_savings,
      net_cash_flow,
      retirement_balance: Math.max(0, running_retirement),
      net_worth: running_net_worth,
      is_retirement_year_earner1,
      is_retirement_year_earner2,
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