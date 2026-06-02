import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ============================================================
// TYPE DEFINITIONS
// ============================================================

export type HouseholdType = 'single_person' | 'single_income' | 'dual_income'
export type FilingStatus = 'single' | 'married_jointly' | 'married_separately'
export type EmploymentType = 'salaried' | 'hourly' | 'self_employed' | 'commission'
export type PayFrequency = 'weekly' | 'biweekly' | 'semi_monthly' | 'monthly'
export type Frequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual' | 'one_time'
export type RetirementAccountType = 'traditional' | 'roth' | 'both'

export interface PreTaxDeductions {
  retirement_type: RetirementAccountType
  retirement401k_traditional_percent: number
  retirement401k_roth_percent: number
  employer_match_percent: number
  employer_match_up_to_percent: number
  health_insurance: number
  dental: number
  vision: number
  has_hsa: boolean
  hsa: number
  has_fsa: boolean
  fsa: number
  other_pretax: number
}

export interface PostTaxDeductions {
  other_posttax: number
}

export interface BonusInfo {
  has_bonus: boolean
  gross_annual_bonus: number
}

export interface PensionInfo {
  has_pension: boolean
  first_contribution_year: number
  employee_contribution_percent: number
  employer_contribution_percent: number
  benefit_multiplier_percent: number
}

export interface AdditionalIncomeSource {
  id: string
  label: string
  amount: number
  frequency: Frequency
}

export interface Earner {
  id: string
  label: string
  date_of_birth: string
  first_year_of_work: number
  employment_type: EmploymentType
  gross_annual_salary: number
  hourly_rate: number
  hours_per_week: number
  pay_frequency: PayFrequency
  bonus: BonusInfo
  pre_tax_deductions: PreTaxDeductions
  post_tax_deductions: PostTaxDeductions
  deductions_complete: boolean
  pension: PensionInfo
  balance_401k_traditional: number
  balance_401k_roth: number
  salary_growth_rate: number
  target_retirement_age: number
  additional_income: AdditionalIncomeSource[]
}

// ============================================================
// EXPENSE TYPES
// ============================================================

export interface ExpenseLineItem {
  id: string
  label: string
  amount: number
  frequency: Frequency
  use_monthly_detail: boolean
  monthly_amounts: number[]
}

export interface Subscription {
  id: string
  name: string
  amount: number
  frequency: Frequency
}

export interface SubscriptionGroup {
  id: string
  name: string
  subscriptions: Subscription[]
}

export interface DebtPayment {
  id: string
  label: string
  balance: number
  interest_rate: number
  monthly_payment: number
  minimum_payment: number
  type: 'mortgage' | 'auto' | 'student_loan' | 'credit_card' | 'other'
}

// ============================================================
// MORTGAGE — separate from generic debt payments
// P&I feeds debt calculations and payoff module.
// Escrow (taxes, insurance, PMI) feeds cash flow only.
// Total housing expense = pi_payment + all escrow fields.
// ============================================================

export interface MortgageData {
  is_active: boolean          // "I have a mortgage" checkbox
  // Debt fields — feed balance sheet + debt payoff module
  balance: number
  interest_rate: number
  pi_payment: number          // principal + interest only
  minimum_pi_payment: number  // for DTI calculations
  // Escrow fields — feed cash flow only, not debt calculations
  escrow_taxes: number        // monthly equivalent of property taxes
  escrow_insurance: number    // monthly homeowner's insurance
  escrow_pmi: number          // PMI — required when LTV > 80%, optional field
}

export interface ExpenseCategory {
  id: string
  label: string
  is_fixed: boolean
  items: ExpenseLineItem[]
}

// ============================================================
// FIXED & VARIABLE EXPENSE STRUCTURES
// ============================================================

export interface FixedExpenses {
  mortgage: MortgageData
  categories: ExpenseCategory[]
  subscription_groups: SubscriptionGroup[]
  debt_payments: DebtPayment[]
}

export interface VariableExpenses {
  categories: ExpenseCategory[]
}

export interface SavingsGoal {
  id: string
  label: string
  target_amount: number
  target_date: string
  monthly_contribution: number
}

export interface SavingsAndInvestments {
  emergency_fund_contribution: number
  additional_retirement_contribution: number
  brokerage_contribution: number
  savings_goals: SavingsGoal[]
}

export interface Asset {
  id: string
  label: string
  value: number
  type: 'checking_savings' | 'retirement' | 'brokerage' | 'real_estate' | 'vehicle' | 'other'
}

export interface Liability {
  id: string
  label: string
  balance: number
  interest_rate: number
  monthly_payment: number
  type: 'mortgage' | 'auto' | 'student_loan' | 'credit_card' | 'other'
}

export interface ForecastAssumptions {
  inflation_rate: number
  investment_return_rate: number
  withdrawal_rate: number
  forecast_end_age: number
}

export type ModuleId =
  | 'home_affordability'
  | 'car_purchase'
  | 'baby_planning'
  | 'job_comparison'
  | 'retirement_planner'
  | 'benefits_selection'
  | 'emergency_fund'
  | 'debt_payoff'
  | 'wedding_budget'
  | 'student_loan'
  | 'tax_withholding'
  | 'childcare_breakeven'
  | 'hsa_maximizer'

export interface ActiveModules {
  [key: string]: boolean
}

export interface FinStartState {
  household_type: HouseholdType
  filing_status: FilingStatus
  state_of_residence: string
  number_of_dependents: number
  earners: Earner[]
  fixed_expenses: FixedExpenses
  variable_expenses: VariableExpenses
  savings_and_investments: SavingsAndInvestments
  assets: Asset[]
  liabilities: Liability[]
  forecast_assumptions: ForecastAssumptions
  active_modules: ActiveModules
  module_data: Record<string, unknown>

  // Earner actions
  setHouseholdType: (type: HouseholdType) => void
  setFilingStatus: (status: FilingStatus) => void
  setStateOfResidence: (state: string) => void
  setNumberOfDependents: (count: number) => void
  addEarner: (earner: Earner) => void
  updateEarner: (id: string, updates: Partial<Earner>) => void
  removeEarner: (id: string) => void
  removeSecondEarner: () => void

  // Mortgage action
  updateMortgage: (updates: Partial<MortgageData>) => void

  // Expense category actions
  addExpenseCategory: (category: ExpenseCategory) => void
  updateExpenseCategory: (id: string, updates: Partial<Pick<ExpenseCategory, 'label' | 'is_fixed'>>) => void
  removeExpenseCategory: (id: string) => void

  // Line item actions
  addExpenseLineItem: (categoryId: string, item: ExpenseLineItem) => void
  updateExpenseLineItem: (categoryId: string, itemId: string, updates: Partial<ExpenseLineItem>) => void
  removeExpenseLineItem: (categoryId: string, itemId: string) => void

  // Subscription group actions
  addSubscriptionGroup: (group: SubscriptionGroup) => void
  updateSubscriptionGroup: (groupId: string, updates: Partial<Pick<SubscriptionGroup, 'name'>>) => void
  removeSubscriptionGroup: (groupId: string) => void

  // Subscription actions
  addSubscription: (groupId: string, subscription: Subscription) => void
  updateSubscription: (groupId: string, subId: string, updates: Partial<Subscription>) => void
  removeSubscription: (groupId: string, subId: string) => void

  // Debt payment actions
  addDebtPayment: (debt: DebtPayment) => void
  updateDebtPayment: (id: string, updates: Partial<DebtPayment>) => void
  removeDebtPayment: (id: string) => void

  // Savings actions
  updateSavingsAndInvestments: (updates: Partial<SavingsAndInvestments>) => void
  addSavingsGoal: (goal: SavingsGoal) => void
  removeSavingsGoal: (id: string) => void

  // Balance sheet actions
  addAsset: (asset: Asset) => void
  updateAsset: (id: string, updates: Partial<Asset>) => void
  removeAsset: (id: string) => void
  addLiability: (liability: Liability) => void
  updateLiability: (id: string, updates: Partial<Liability>) => void
  removeLiability: (id: string) => void

  // Forecast / module actions
  updateForecastAssumptions: (updates: Partial<ForecastAssumptions>) => void
  toggleModule: (moduleId: ModuleId) => void
  setModuleData: (moduleId: string, data: unknown) => void
}

// ============================================================
// HELPERS
// ============================================================

function makeLineItem(label: string): ExpenseLineItem {
  return {
    id: crypto.randomUUID(),
    label,
    amount: 0,
    frequency: 'monthly',
    use_monthly_detail: false,
    monthly_amounts: Array(12).fill(0),
  }
}

function makeCategory(
  label: string,
  is_fixed: boolean,
  itemLabels: string[] = []
): ExpenseCategory {
  return {
    id: crypto.randomUUID(),
    label,
    is_fixed,
    items: itemLabels.map(makeLineItem),
  }
}

// ============================================================
// DEFAULT VALUES
// ============================================================

export const defaultPreTaxDeductions: PreTaxDeductions = {
  retirement_type: 'traditional',
  retirement401k_traditional_percent: 0,
  retirement401k_roth_percent: 0,
  employer_match_percent: 0,
  employer_match_up_to_percent: 100,
  health_insurance: 0,
  dental: 0,
  vision: 0,
  has_hsa: false,
  hsa: 0,
  has_fsa: false,
  fsa: 0,
  other_pretax: 0,
}

export const defaultPostTaxDeductions: PostTaxDeductions = {
  other_posttax: 0,
}

export const defaultBonus: BonusInfo = {
  has_bonus: false,
  gross_annual_bonus: 0,
}

export const defaultPension: PensionInfo = {
  has_pension: false,
  first_contribution_year: new Date().getFullYear(),
  employee_contribution_percent: 0,
  employer_contribution_percent: 0,
  benefit_multiplier_percent: 1.0,
}

export function createDefaultEarner(id: string, label: string): Earner {
  return {
    id,
    label,
    date_of_birth: '',
    first_year_of_work: new Date().getFullYear(),
    employment_type: 'salaried',
    gross_annual_salary: 0,
    hourly_rate: 0,
    hours_per_week: 40,
    pay_frequency: 'biweekly',
    bonus: { ...defaultBonus },
    pre_tax_deductions: { ...defaultPreTaxDeductions },
    post_tax_deductions: { ...defaultPostTaxDeductions },
    deductions_complete: false,
    pension: { ...defaultPension },
    balance_401k_traditional: 0,
    balance_401k_roth: 0,
    salary_growth_rate: 3.5,
    target_retirement_age: 65,
    additional_income: [],
  }
}

const defaultMortgage: MortgageData = {
  is_active: false,
  balance: 0,
  interest_rate: 0,
  pi_payment: 0,
  minimum_pi_payment: 0,
  escrow_taxes: 0,
  escrow_insurance: 0,
  escrow_pmi: 0,
}

const defaultFixedCategories: ExpenseCategory[] = [
  makeCategory('Housing', true, [
    'Housing cost / rent',
    'House maintenance',
    'Renovations',
    'House cleaning',
  ]),
  makeCategory('Insurance', true, ['Car insurance', 'Life insurance']),
  makeCategory('Utilities', true, ['Cell phone', 'Internet', 'Utilities']),
  makeCategory('Children & education', true, [
    'Preschool / daycare',
    'Babysitter',
    'Extracurriculars',
  ]),
  makeCategory('Giving & donations', true, [
    'Church / tithe',
    'Charitable giving',
  ]),
]

const defaultVariableCategories: ExpenseCategory[] = [
  makeCategory('Food & groceries', false, ['Groceries', 'Fast food']),
  makeCategory('Dining & takeout', false, ['Restaurants', 'Delivery apps']),
  makeCategory('Shopping', false, ['General spending', 'Large purchases']),
  makeCategory('Entertainment', false, ['Events & activities', 'In-app purchases']),
  makeCategory('Medical & health', false, [
    'Doctor visits',
    'Pharmacy',
    'Gym membership',
  ]),
  makeCategory('Auto & transportation', false, [
    'Gas',
    'Car maintenance',
    'Registration',
  ]),
  makeCategory('Personal care', false, ['Hair & grooming', 'Nails']),
  makeCategory('Pets', false, ['Pet food', 'Vet', 'Grooming']),
  makeCategory('Travel & vacation', false, ['Vacation budget']),
  makeCategory('Gifts & celebrations', false, [
    'Birthday gifts',
    'Christmas',
    'Anniversaries',
  ]),
]

const defaultSubscriptionGroups: SubscriptionGroup[] = [
  { id: crypto.randomUUID(), name: 'Streaming', subscriptions: [] },
  { id: crypto.randomUUID(), name: 'Music', subscriptions: [] },
  { id: crypto.randomUUID(), name: 'Gaming', subscriptions: [] },
  { id: crypto.randomUUID(), name: 'Health & fitness', subscriptions: [] },
  { id: crypto.randomUUID(), name: 'Cloud storage', subscriptions: [] },
  { id: crypto.randomUUID(), name: 'News & reading', subscriptions: [] },
  { id: crypto.randomUUID(), name: 'Home & security', subscriptions: [] },
  { id: crypto.randomUUID(), name: 'Other services', subscriptions: [] },
]

const defaultFixedExpenses: FixedExpenses = {
  mortgage: defaultMortgage,
  categories: defaultFixedCategories,
  subscription_groups: defaultSubscriptionGroups,
  debt_payments: [],
}

const defaultVariableExpenses: VariableExpenses = {
  categories: defaultVariableCategories,
}

const defaultSavings: SavingsAndInvestments = {
  emergency_fund_contribution: 0,
  additional_retirement_contribution: 0,
  brokerage_contribution: 0,
  savings_goals: [],
}

const defaultForecastAssumptions: ForecastAssumptions = {
  inflation_rate: 3.0,
  investment_return_rate: 7.0,
  withdrawal_rate: 4.0,
  forecast_end_age: 95,
}

// ============================================================
// HELPER — find which collection a category lives in
// ============================================================

function findCategory(
  state: FinStartState,
  id: string
): { collection: 'fixed' | 'variable'; index: number } | null {
  const fi = state.fixed_expenses.categories.findIndex(c => c.id === id)
  if (fi !== -1) return { collection: 'fixed', index: fi }
  const vi = state.variable_expenses.categories.findIndex(c => c.id === id)
  if (vi !== -1) return { collection: 'variable', index: vi }
  return null
}

// ============================================================
// THE STORE
// ============================================================

export const useFinStartStore = create<FinStartState>()(
  persist(
    (set, get) => ({
      household_type: 'single_person',
      filing_status: 'single',
      state_of_residence: '',
      number_of_dependents: 0,
      earners: [createDefaultEarner('earner_1', 'Person 1')],
      fixed_expenses: defaultFixedExpenses,
      variable_expenses: defaultVariableExpenses,
      savings_and_investments: defaultSavings,
      assets: [],
      liabilities: [],
      forecast_assumptions: defaultForecastAssumptions,
      active_modules: {},
      module_data: {},

      // ── Household ──
      setHouseholdType: (type) => set({ household_type: type }),
      setFilingStatus:  (status) => set({ filing_status: status }),
      setStateOfResidence: (state) => set({ state_of_residence: state }),
      setNumberOfDependents: (count) => set({ number_of_dependents: count }),

      // ── Earners ──
      addEarner: (earner) =>
        set(state => ({ earners: [...state.earners, earner] })),

      updateEarner: (id, updates) =>
        set(state => ({
          earners: state.earners.map(e => e.id === id ? { ...e, ...updates } : e),
        })),

      removeEarner: (id) =>
        set(state => ({ earners: state.earners.filter(e => e.id !== id) })),

      removeSecondEarner: () =>
        set(state => ({ earners: state.earners.slice(0, 1) })),

      // ── Mortgage ──
      updateMortgage: (updates) =>
        set(state => ({
          fixed_expenses: {
            ...state.fixed_expenses,
            mortgage: { ...state.fixed_expenses.mortgage, ...updates },
          },
        })),

      // ── Expense categories ──
      addExpenseCategory: (category) =>
        set(state => {
          if (category.is_fixed) {
            return {
              fixed_expenses: {
                ...state.fixed_expenses,
                categories: [...state.fixed_expenses.categories, category],
              },
            }
          }
          return {
            variable_expenses: {
              ...state.variable_expenses,
              categories: [...state.variable_expenses.categories, category],
            },
          }
        }),

      updateExpenseCategory: (id, updates) =>
        set(state => {
          const loc = findCategory(state, id)
          if (!loc) return {}

          if (loc.collection === 'fixed') {
            const categories = state.fixed_expenses.categories.map(c =>
              c.id === id ? { ...c, ...updates } : c
            )
            const updated = categories.find(c => c.id === id)!
            if (updates.is_fixed === false) {
              return {
                fixed_expenses: {
                  ...state.fixed_expenses,
                  categories: state.fixed_expenses.categories.filter(c => c.id !== id),
                },
                variable_expenses: {
                  ...state.variable_expenses,
                  categories: [...state.variable_expenses.categories, { ...updated, is_fixed: false }],
                },
              }
            }
            return { fixed_expenses: { ...state.fixed_expenses, categories } }
          }

          const categories = state.variable_expenses.categories.map(c =>
            c.id === id ? { ...c, ...updates } : c
          )
          const updated = categories.find(c => c.id === id)!
          if (updates.is_fixed === true) {
            return {
              variable_expenses: {
                ...state.variable_expenses,
                categories: state.variable_expenses.categories.filter(c => c.id !== id),
              },
              fixed_expenses: {
                ...state.fixed_expenses,
                categories: [...state.fixed_expenses.categories, { ...updated, is_fixed: true }],
              },
            }
          }
          return { variable_expenses: { ...state.variable_expenses, categories } }
        }),

      removeExpenseCategory: (id) =>
        set(state => {
          const loc = findCategory(state, id)
          if (!loc) return {}
          if (loc.collection === 'fixed') {
            return {
              fixed_expenses: {
                ...state.fixed_expenses,
                categories: state.fixed_expenses.categories.filter(c => c.id !== id),
              },
            }
          }
          return {
            variable_expenses: {
              ...state.variable_expenses,
              categories: state.variable_expenses.categories.filter(c => c.id !== id),
            },
          }
        }),

      // ── Line items ──
      addExpenseLineItem: (categoryId, item) =>
        set(state => {
          const loc = findCategory(state, categoryId)
          if (!loc) return {}
          if (loc.collection === 'fixed') {
            return {
              fixed_expenses: {
                ...state.fixed_expenses,
                categories: state.fixed_expenses.categories.map(c =>
                  c.id === categoryId ? { ...c, items: [...c.items, item] } : c
                ),
              },
            }
          }
          return {
            variable_expenses: {
              ...state.variable_expenses,
              categories: state.variable_expenses.categories.map(c =>
                c.id === categoryId ? { ...c, items: [...c.items, item] } : c
              ),
            },
          }
        }),

      updateExpenseLineItem: (categoryId, itemId, updates) =>
        set(state => {
          const loc = findCategory(state, categoryId)
          if (!loc) return {}
          const updateItems = (c: ExpenseCategory) =>
            c.id === categoryId
              ? { ...c, items: c.items.map(i => i.id === itemId ? { ...i, ...updates } : i) }
              : c
          if (loc.collection === 'fixed') {
            return {
              fixed_expenses: {
                ...state.fixed_expenses,
                categories: state.fixed_expenses.categories.map(updateItems),
              },
            }
          }
          return {
            variable_expenses: {
              ...state.variable_expenses,
              categories: state.variable_expenses.categories.map(updateItems),
            },
          }
        }),

      removeExpenseLineItem: (categoryId, itemId) =>
        set(state => {
          const loc = findCategory(state, categoryId)
          if (!loc) return {}
          const removeItem = (c: ExpenseCategory) =>
            c.id === categoryId
              ? { ...c, items: c.items.filter(i => i.id !== itemId) }
              : c
          if (loc.collection === 'fixed') {
            return {
              fixed_expenses: {
                ...state.fixed_expenses,
                categories: state.fixed_expenses.categories.map(removeItem),
              },
            }
          }
          return {
            variable_expenses: {
              ...state.variable_expenses,
              categories: state.variable_expenses.categories.map(removeItem),
            },
          }
        }),

      // ── Subscription groups ──
      addSubscriptionGroup: (group) =>
        set(state => ({
          fixed_expenses: {
            ...state.fixed_expenses,
            subscription_groups: [...state.fixed_expenses.subscription_groups, group],
          },
        })),

      updateSubscriptionGroup: (groupId, updates) =>
        set(state => ({
          fixed_expenses: {
            ...state.fixed_expenses,
            subscription_groups: state.fixed_expenses.subscription_groups.map(g =>
              g.id === groupId ? { ...g, ...updates } : g
            ),
          },
        })),

      removeSubscriptionGroup: (groupId) =>
        set(state => ({
          fixed_expenses: {
            ...state.fixed_expenses,
            subscription_groups: state.fixed_expenses.subscription_groups.filter(
              g => g.id !== groupId
            ),
          },
        })),

      // ── Subscriptions ──
      addSubscription: (groupId, subscription) =>
        set(state => ({
          fixed_expenses: {
            ...state.fixed_expenses,
            subscription_groups: state.fixed_expenses.subscription_groups.map(g =>
              g.id === groupId
                ? { ...g, subscriptions: [...g.subscriptions, subscription] }
                : g
            ),
          },
        })),

      updateSubscription: (groupId, subId, updates) =>
        set(state => ({
          fixed_expenses: {
            ...state.fixed_expenses,
            subscription_groups: state.fixed_expenses.subscription_groups.map(g =>
              g.id === groupId
                ? {
                    ...g,
                    subscriptions: g.subscriptions.map(s =>
                      s.id === subId ? { ...s, ...updates } : s
                    ),
                  }
                : g
            ),
          },
        })),

      removeSubscription: (groupId, subId) =>
        set(state => ({
          fixed_expenses: {
            ...state.fixed_expenses,
            subscription_groups: state.fixed_expenses.subscription_groups.map(g =>
              g.id === groupId
                ? { ...g, subscriptions: g.subscriptions.filter(s => s.id !== subId) }
                : g
            ),
          },
        })),

      // ── Debt payments ──
      addDebtPayment: (debt) =>
        set(state => ({
          fixed_expenses: {
            ...state.fixed_expenses,
            debt_payments: [...state.fixed_expenses.debt_payments, debt],
          },
        })),

      updateDebtPayment: (id, updates) =>
        set(state => ({
          fixed_expenses: {
            ...state.fixed_expenses,
            debt_payments: state.fixed_expenses.debt_payments.map(d =>
              d.id === id ? { ...d, ...updates } : d
            ),
          },
        })),

      removeDebtPayment: (id) =>
        set(state => ({
          fixed_expenses: {
            ...state.fixed_expenses,
            debt_payments: state.fixed_expenses.debt_payments.filter(d => d.id !== id),
          },
        })),

      // ── Savings ──
      updateSavingsAndInvestments: (updates) =>
        set(state => ({
          savings_and_investments: { ...state.savings_and_investments, ...updates },
        })),

      addSavingsGoal: (goal) =>
        set(state => ({
          savings_and_investments: {
            ...state.savings_and_investments,
            savings_goals: [...state.savings_and_investments.savings_goals, goal],
          },
        })),

      removeSavingsGoal: (id) =>
        set(state => ({
          savings_and_investments: {
            ...state.savings_and_investments,
            savings_goals: state.savings_and_investments.savings_goals.filter(
              g => g.id !== id
            ),
          },
        })),

      // ── Balance sheet ──
      addAsset: (asset) =>
        set(state => ({ assets: [...state.assets, asset] })),

      updateAsset: (id, updates) =>
        set(state => ({
          assets: state.assets.map(a => a.id === id ? { ...a, ...updates } : a),
        })),

      removeAsset: (id) =>
        set(state => ({ assets: state.assets.filter(a => a.id !== id) })),

      addLiability: (liability) =>
        set(state => ({ liabilities: [...state.liabilities, liability] })),

      updateLiability: (id, updates) =>
        set(state => ({
          liabilities: state.liabilities.map(l =>
            l.id === id ? { ...l, ...updates } : l
          ),
        })),

      removeLiability: (id) =>
        set(state => ({ liabilities: state.liabilities.filter(l => l.id !== id) })),

      // ── Forecast / modules ──
      updateForecastAssumptions: (updates) =>
        set(state => ({
          forecast_assumptions: { ...state.forecast_assumptions, ...updates },
        })),

      toggleModule: (moduleId) =>
        set(state => ({
          active_modules: {
            ...state.active_modules,
            [moduleId]: !state.active_modules[moduleId],
          },
        })),

      setModuleData: (moduleId, data) =>
        set(state => ({
          module_data: { ...state.module_data, [moduleId]: data },
        })),
    }),
    { name: 'finstart-storage' }
  )
)