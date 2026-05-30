// ============================================================
// FINSTART TAX CONFIGURATION
// ============================================================
// All tax constants live here. When tax law changes, update
// this file only — calculations.ts imports from here.
//
// Sources:
// - Federal brackets: IRS Rev. Proc. 2025-xx (2026 tax year)
// - FICA: Social Security Administration 2026
// - State rates: State revenue departments (flat marginal estimates)
//
// TO UPDATE ANNUALLY:
// 1. Update TAX_YEAR
// 2. Update FEDERAL_BRACKETS for new income thresholds
// 3. Update STANDARD_DEDUCTION
// 4. Update FICA.ss_wage_base
// 5. Update FICA.additional_medicare_threshold_single and _married_jointly
// 6. Verify state rates haven't changed materially
// ============================================================

export const TAX_YEAR = 2026

// ============================================================
// FEDERAL INCOME TAX — SINGLE FILER BRACKETS
// ============================================================

export interface TaxBracket {
  min: number
  max: number
  rate: number
  base_tax: number
}

export const FEDERAL_BRACKETS_SINGLE_2026: TaxBracket[] = [
  { min: 0,       max: 11925,    rate: 0.10, base_tax: 0 },
  { min: 11925,   max: 48475,    rate: 0.12, base_tax: 1192.50 },
  { min: 48475,   max: 103350,   rate: 0.22, base_tax: 5578.50 },
  { min: 103350,  max: 197300,   rate: 0.24, base_tax: 17651.50 },
  { min: 197300,  max: 250525,   rate: 0.32, base_tax: 40199.50 },
  { min: 250525,  max: 626350,   rate: 0.35, base_tax: 57231.50 },
  { min: 626350,  max: Infinity, rate: 0.37, base_tax: 188769.75 },
]

// ============================================================
// FEDERAL INCOME TAX — MARRIED FILING JOINTLY BRACKETS
// ============================================================

export const FEDERAL_BRACKETS_MARRIED_JOINTLY_2026: TaxBracket[] = [
  { min: 0,       max: 23850,    rate: 0.10, base_tax: 0 },
  { min: 23850,   max: 96950,    rate: 0.12, base_tax: 2385.00 },
  { min: 96950,   max: 206700,   rate: 0.22, base_tax: 11157.00 },
  { min: 206700,  max: 394600,   rate: 0.24, base_tax: 35302.00 },
  { min: 394600,  max: 501050,   rate: 0.32, base_tax: 80398.00 },
  { min: 501050,  max: 751600,   rate: 0.35, base_tax: 114462.00 },
  { min: 751600,  max: Infinity, rate: 0.37, base_tax: 202154.50 },
]

// ============================================================
// STANDARD DEDUCTIONS 2026
// ============================================================

export const STANDARD_DEDUCTION = {
  single: 15000,
  married_jointly: 30000,
  married_separately: 15000,
}

// ============================================================
// FICA TAXES 2026
// ============================================================
// additional_medicare_rate: 0.9% surtax on earned income above threshold
// Threshold differs by filing status — do NOT use a single number
// Single / MFS: $200,000 | Married Filing Jointly: $250,000
// ============================================================

export const FICA = {
  ss_rate: 0.062,
  ss_wage_base: 176100,
  medicare_rate: 0.0145,
  additional_medicare_rate: 0.009,
  additional_medicare_threshold_single: 200000,
  additional_medicare_threshold_married_jointly: 250000,
  additional_medicare_threshold_married_separately: 125000,
}

// ============================================================
// SUPPLEMENTAL (BONUS) TAX RATE
// Flat federal withholding rate for supplemental wages
// ============================================================

export const BONUS_SUPPLEMENTAL_RATE = 0.22

// ============================================================
// STATE INCOME TAX RATES
// Flat marginal rate estimates for planning purposes
// Note: Some states use graduated brackets — these are
// approximate effective rates for planning use
// ============================================================

export const STATE_TAX_RATES: Record<string, number> = {
  AL: 0.05,   AK: 0.00,   AZ: 0.025,  AR: 0.047,  CA: 0.093,
  CO: 0.044,  CT: 0.065,  DE: 0.066,  FL: 0.00,   GA: 0.055,
  HI: 0.11,   ID: 0.058,  IL: 0.0495, IN: 0.0305, IA: 0.057,
  KS: 0.057,  KY: 0.045,  LA: 0.0425, ME: 0.075,  MD: 0.0575,
  MA: 0.05,   MI: 0.0425, MN: 0.0985, MS: 0.05,   MO: 0.048,
  MT: 0.059,  NE: 0.0664, NV: 0.00,   NH: 0.00,   NJ: 0.0637,
  NM: 0.059,  NY: 0.0685, NC: 0.0499, ND: 0.0290, OH: 0.0399,
  OK: 0.0475, OR: 0.099,  PA: 0.0307, RI: 0.0599, SC: 0.064,
  SD: 0.00,   TN: 0.00,   TX: 0.00,   UT: 0.0465, VT: 0.0875,
  VA: 0.0575, WA: 0.00,   WV: 0.065,  WI: 0.0765, WY: 0.00,
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