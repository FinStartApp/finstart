import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ============================================================
// TYPE DEFINITIONS
// These describe the shape of every piece of data in the app
// ============================================================

export type HouseholdType = 'single_person' | 'single_income' | 'dual_income'
export type FilingStatus = 'single' | 'married_jointly' | 'married_separately'
export type EmploymentType = 'salaried' | 'hourly' | 'self_employed' | 'commission'
export type PayFrequency = 'weekly' | 'biweekly' | 'semi_monthly' | 'monthly'
export type Frequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual' | 'one_time'

// --- Earner ---
export interface PreTaxDeductions {
  retirement401k_percent: number
  retirement401k_dollar: number
  employer_match_percent: number
  employer_match_up_to_percent: number
  health_insurance: number
  dental: number
  vision: number
  hsa: number
  fsa: number
  other_pretax: number
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
  employment_type: EmploymentType
  gross_annual_salary: number
  hourly_rate: number
  hours_per_week: number
  pay_frequency: PayFrequency
  bonus_amount: number
  bonus_frequency: Frequency
  pre_tax_deductions: PreTaxDeductions
  target_retirement_age: number
  additional_income: AdditionalIncomeSource[]
}

// --- Expenses ---
export interface ExpenseLineItem {
  id: string
  label: string
  amount: number
  frequency: Frequency
  is_custom: boolean
}

export interface Subscription {
  id: string
  name: string
  amount: number
  frequency: Frequency
  category: string
}

export interface FixedExpenses {
  housing: number
  utilities: number
  internet_phone: number
  insurance: number
  subscriptions: Subscription[]
  childcare_education: number
  custom_fixed: ExpenseLineItem[]
  debt_payments: DebtPayment[]
}

export interface VariableExpenses {
  groceries: number
  dining_takeout: number
  auto_transportation: number
  health_medical: number
  personal_care: number
  clothing_shopping: number
  entertainment_activities: number
  travel_vacation: number
  gifts_giving: number
  pet_care: number
  home_maintenance: number
  custom_variable: ExpenseLineItem[]
}

// --- Debt ---
export interface DebtPayment {
  id: string
  label: string
  minimum_payment: number
  balance: number
  interest_rate: number
  type: 'mortgage' | 'auto' | 'student_loan' | 'credit_card' | 'other'
}

// --- Savings ---
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

// --- Balance Sheet ---
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

// --- Forecast ---
export interface ForecastAssumptions {
  inflation_rate: number
  salary_growth_rate: number
  investment_return_rate: number
  forecast_end_age: number
}

// --- Modules ---
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

// --- Root State ---
export interface FinStartState {
  // Household
  household_type: HouseholdType
  filing_status: FilingStatus
  state_of_residence: string
  number_of_dependents: number

  // Income
  earners: Earner[]

  // Expenses
  fixed_expenses: FixedExpenses
  variable_expenses: VariableExpenses

  // Savings
  savings_and_investments: SavingsAndInvestments

  // Balance Sheet
  assets: Asset[]
  liabilities: Liability[]

  // Forecast
  forecast_assumptions: ForecastAssumptions

  // Modules
  active_modules: ActiveModules
  module_data: Record<string, unknown>

  // Actions
  setHouseholdType: (type: HouseholdType) => void
  setFilingStatus: (status: FilingStatus) => void
  setStateOfResidence: (state: string) => void
  setNumberOfDependents: (count: number) => void
  addEarner: (earner: Earner) => void
  updateEarner: (id: string, updates: Partial<Earner>) => void
  removeEarner: (id: string) => void
  updateFixedExpenses: (updates: Partial<FixedExpenses>) => void
  updateVariableExpenses: (updates: Partial<VariableExpenses>) => void
  addSubscription: (subscription: Subscription) => void
  updateSubscription: (id: string, updates: Partial<Subscription>) => void
  removeSubscription: (id: string) => void
  addCustomFixedExpense: (item: ExpenseLineItem) => void
  removeCustomFixedExpense: (id: string) => void
  addCustomVariableExpense: (item: ExpenseLineItem) => void
  removeCustomVariableExpense: (id: string) => void
  updateSavingsAndInvestments: (updates: Partial<SavingsAndInvestments>) => void
  addSavingsGoal: (goal: SavingsGoal) => void
  removeSavingsGoal: (id: string) => void
  addAsset: (asset: Asset) => void
  updateAsset: (id: string, updates: Partial<Asset>) => void
  removeAsset: (id: string) => void
  addLiability: (liability: Liability) => void
  updateLiability: (id: string, updates: Partial<Liability>) => void
  removeLiability: (id: string) => void
  updateForecastAssumptions: (updates: Partial<ForecastAssumptions>) => void
  toggleModule: (moduleId: ModuleId) => void
  setModuleData: (moduleId: string, data: unknown) => void
}

// ============================================================
// DEFAULT VALUES
// What the app looks like before any user input
// ============================================================

const defaultEarner: Earner = {
  id: 'earner_1',
  label: 'Person 1',
  date_of_birth: '',
  employment_type: 'salaried',
  gross_annual_salary: 0,
  hourly_rate: 0,
  hours_per_week: 40,
  pay_frequency: 'biweekly',
  bonus_amount: 0,
  bonus_frequency: 'annual',
  pre_tax_deductions: {
    retirement401k_percent: 0,
    retirement401k_dollar: 0,
    employer_match_percent: 0,
    employer_match_up_to_percent: 0,
    health_insurance: 0,
    dental: 0,
    vision: 0,
    hsa: 0,
    fsa: 0,
    other_pretax: 0,
  },
  target_retirement_age: 65,
  additional_income: [],
}

const defaultFixedExpenses: FixedExpenses = {
  housing: 0,
  utilities: 0,
  internet_phone: 0,
  insurance: 0,
  subscriptions: [],
  childcare_education: 0,
  custom_fixed: [],
  debt_payments: [],
}

const defaultVariableExpenses: VariableExpenses = {
  groceries: 0,
  dining_takeout: 0,
  auto_transportation: 0,
  health_medical: 0,
  personal_care: 0,
  clothing_shopping: 0,
  entertainment_activities: 0,
  travel_vacation: 0,
  gifts_giving: 0,
  pet_care: 0,
  home_maintenance: 0,
  custom_variable: [],
}

const defaultSavings: SavingsAndInvestments = {
  emergency_fund_contribution: 0,
  additional_retirement_contribution: 0,
  brokerage_contribution: 0,
  savings_goals: [],
}

const defaultForecastAssumptions: ForecastAssumptions = {
  inflation_rate: 3.0,
  salary_growth_rate: 3.5,
  investment_return_rate: 7.0,
  forecast_end_age: 95,
}

// ============================================================
// THE STORE
// This is the actual shared memory of the application
// ============================================================

export const useFinStartStore = create<FinStartState>()(
  persist(
    (set) => ({
      // Initial state
      household_type: 'single_person',
      filing_status: 'single',
      state_of_residence: '',
      number_of_dependents: 0,
      earners: [defaultEarner],
      fixed_expenses: defaultFixedExpenses,
      variable_expenses: defaultVariableExpenses,
      savings_and_investments: defaultSavings,
      assets: [],
      liabilities: [],
      forecast_assumptions: defaultForecastAssumptions,
      active_modules: {},
      module_data: {},

      // Actions
      setHouseholdType: (type) => set({ household_type: type }),
      setFilingStatus: (status) => set({ filing_status: status }),
      setStateOfResidence: (state) => set({ state_of_residence: state }),
      setNumberOfDependents: (count) => set({ number_of_dependents: count }),

      addEarner: (earner) =>
        set((state) => ({ earners: [...state.earners, earner] })),
      updateEarner: (id, updates) =>
        set((state) => ({
          earners: state.earners.map((e) =>
            e.id === id ? { ...e, ...updates } : e
          ),
        })),
      removeEarner: (id) =>
        set((state) => ({
          earners: state.earners.filter((e) => e.id !== id),
        })),

      updateFixedExpenses: (updates) =>
        set((state) => ({
          fixed_expenses: { ...state.fixed_expenses, ...updates },
        })),
      updateVariableExpenses: (updates) =>
        set((state) => ({
          variable_expenses: { ...state.variable_expenses, ...updates },
        })),

      addSubscription: (subscription) =>
        set((state) => ({
          fixed_expenses: {
            ...state.fixed_expenses,
            subscriptions: [
              ...state.fixed_expenses.subscriptions,
              subscription,
            ],
          },
        })),
      updateSubscription: (id, updates) =>
        set((state) => ({
          fixed_expenses: {
            ...state.fixed_expenses,
            subscriptions: state.fixed_expenses.subscriptions.map((s) =>
              s.id === id ? { ...s, ...updates } : s
            ),
          },
        })),
      removeSubscription: (id) =>
        set((state) => ({
          fixed_expenses: {
            ...state.fixed_expenses,
            subscriptions: state.fixed_expenses.subscriptions.filter(
              (s) => s.id !== id
            ),
          },
        })),

      addCustomFixedExpense: (item) =>
        set((state) => ({
          fixed_expenses: {
            ...state.fixed_expenses,
            custom_fixed: [...state.fixed_expenses.custom_fixed, item],
          },
        })),
      removeCustomFixedExpense: (id) =>
        set((state) => ({
          fixed_expenses: {
            ...state.fixed_expenses,
            custom_fixed: state.fixed_expenses.custom_fixed.filter(
              (i) => i.id !== id
            ),
          },
        })),

      addCustomVariableExpense: (item) =>
        set((state) => ({
          variable_expenses: {
            ...state.variable_expenses,
            custom_variable: [
              ...state.variable_expenses.custom_variable,
              item,
            ],
          },
        })),
      removeCustomVariableExpense: (id) =>
        set((state) => ({
          variable_expenses: {
            ...state.variable_expenses,
            custom_variable: state.variable_expenses.custom_variable.filter(
              (i) => i.id !== id
            ),
          },
        })),

      updateSavingsAndInvestments: (updates) =>
        set((state) => ({
          savings_and_investments: {
            ...state.savings_and_investments,
            ...updates,
          },
        })),
      addSavingsGoal: (goal) =>
        set((state) => ({
          savings_and_investments: {
            ...state.savings_and_investments,
            savings_goals: [
              ...state.savings_and_investments.savings_goals,
              goal,
            ],
          },
        })),
      removeSavingsGoal: (id) =>
        set((state) => ({
          savings_and_investments: {
            ...state.savings_and_investments,
            savings_goals: state.savings_and_investments.savings_goals.filter(
              (g) => g.id !== id
            ),
          },
        })),

      addAsset: (asset) =>
        set((state) => ({ assets: [...state.assets, asset] })),
      updateAsset: (id, updates) =>
        set((state) => ({
          assets: state.assets.map((a) =>
            a.id === id ? { ...a, ...updates } : a
          ),
        })),
      removeAsset: (id) =>
        set((state) => ({
          assets: state.assets.filter((a) => a.id !== id),
        })),

      addLiability: (liability) =>
        set((state) => ({ liabilities: [...state.liabilities, liability] })),
      updateLiability: (id, updates) =>
        set((state) => ({
          liabilities: state.liabilities.map((l) =>
            l.id === id ? { ...l, ...updates } : l
          ),
        })),
      removeLiability: (id) =>
        set((state) => ({
          liabilities: state.liabilities.filter((l) => l.id !== id),
        })),

      updateForecastAssumptions: (updates) =>
        set((state) => ({
          forecast_assumptions: {
            ...state.forecast_assumptions,
            ...updates,
          },
        })),

      toggleModule: (moduleId) =>
        set((state) => ({
          active_modules: {
            ...state.active_modules,
            [moduleId]: !state.active_modules[moduleId],
          },
        })),

      setModuleData: (moduleId, data) =>
        set((state) => ({
          module_data: {
            ...state.module_data,
            [moduleId]: data,
          },
        })),
    }),
    {
      name: 'finstart-storage',
    }
  )
)