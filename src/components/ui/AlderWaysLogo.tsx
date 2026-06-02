// AlderWaysLogo — full lockup: icon + wordmark
// Use for: onboarding header, main nav, marketing pages
// Props: height (default 48), variant (light/dark)

import AlderWaysIcon from './AlderWaysIcon'

interface AlderWaysLogoProps {
  height?: number
  variant?: 'light' | 'dark'
  accentColor?: string
  className?: string
}

export default function AlderWaysLogo({
  height = 48,
  variant = 'light',
  accentColor,
  className,
}: AlderWaysLogoProps) {
  const primaryColor = variant === 'dark' ? '#FFFFFF' : '#0D223B'
  const accent = accentColor ?? (variant === 'dark' ? '#FFFFFF' : '#0D223B')

  return (
    <div
      className={`flex items-center gap-3 ${className ?? ''}`}
      style={{ height }}
    >
      <AlderWaysIcon
        size={height}
        primaryColor={primaryColor}
        accentColor={accent}
      />
      <span
        style={{
          color: primaryColor,
          fontSize: height * 0.5,
          fontWeight: 600,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
        }}
      >
        Alderways
      </span>
    </div>
  )
}