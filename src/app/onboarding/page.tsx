'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import StepHousehold from '@/components/onboarding/StepHousehold'
import StepPrimaryIncome from '@/components/onboarding/StepPrimaryIncome'
import StepPartnerIncome from '@/components/onboarding/StepPartnerIncome'
import StepForecast from '@/components/onboarding/StepForecast'
import { useFinStartStore } from '@/store/useFinStartStore'
import { useRouter } from 'next/navigation'

const STEPS = [
  { id: 'household', title: 'Your Household' },
  { id: 'primary_income', title: 'Your Income' },
  { id: 'partner_income', title: 'Partner Income' },
  { id: 'forecast', title: 'Final Settings' },
]

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [direction, setDirection] = useState(1)
  const { filing_status, earners } = useFinStartStore()
  const router = useRouter()
  const contentRef = useRef<HTMLDivElement>(null)

  const isDualIncome =
    earners.length > 1 ||
    filing_status === 'married_jointly' ||
    filing_status === 'married_separately'

  const visibleSteps = STEPS.filter((step) => {
    if (step.id === 'partner_income' && !isDualIncome) return false
    return true
  })

  const totalSteps = visibleSteps.length
  const progress = ((currentStep + 1) / totalSteps) * 100

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'smooth' })
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [currentStep])

  function goNext() {
    if (currentStep < totalSteps - 1) {
      setDirection(1)
      setCurrentStep((s) => s + 1)
    } else {
      router.push('/dashboard')
    }
  }

  function goBack() {
    if (currentStep > 0) {
      setDirection(-1)
      setCurrentStep((s) => s - 1)
    }
  }

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 60 : -60,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -60 : 60,
      opacity: 0,
    }),
  }

  const currentStepId = visibleSteps[currentStep]?.id

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      {/* Sticky header */}
      <div className="sticky top-0 z-50 bg-[var(--background)] border-b border-[var(--border)] px-6 pt-5 pb-4">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xl font-bold text-[var(--foreground)] tracking-tight">
              FinStart
            </span>
            <span className="text-sm text-[var(--muted-foreground)]">
              Step {currentStep + 1} of {totalSteps}
            </span>
          </div>
          <div className="h-1.5 w-full bg-[var(--muted)] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[var(--primary)] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
            />
          </div>
          <div className="mt-2">
            <span className="text-xs text-[var(--muted-foreground)] font-medium uppercase tracking-wider">
              {visibleSteps[currentStep]?.title}
            </span>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div ref={contentRef} className="flex-1 overflow-y-auto">
        <div className="flex items-start justify-center px-6 py-8">
          <div className="w-full max-w-xl">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentStepId}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                {currentStepId === 'household' && (
                  <StepHousehold onNext={goNext} />
                )}
                {currentStepId === 'primary_income' && (
                  <StepPrimaryIncome onNext={goNext} onBack={goBack} />
                )}
                {currentStepId === 'partner_income' && (
                  <StepPartnerIncome onNext={goNext} onBack={goBack} />
                )}
                {currentStepId === 'forecast' && (
                  <StepForecast onNext={goNext} onBack={goBack} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}