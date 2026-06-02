'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  TrendingUp,
  Receipt,
  PiggyBank,
  Scale,
  Home,
  Car,
  Baby,
  Briefcase,
  Sunset,
  Settings,
} from 'lucide-react'

const FOUNDATION_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/income', label: 'Income', icon: TrendingUp },
  { href: '/dashboard/expenses', label: 'Expenses', icon: Receipt },
  { href: '/dashboard/savings', label: 'Savings', icon: PiggyBank },
  { href: '/dashboard/balance-sheet', label: 'Balance Sheet', icon: Scale },
]

const MODULE_LINKS = [
  { href: '/dashboard/home', label: 'Home', icon: Home },
  { href: '/dashboard/car', label: 'Car', icon: Car },
  { href: '/dashboard/family', label: 'Family', icon: Baby },
  { href: '/dashboard/career', label: 'Career', icon: Briefcase },
  { href: '/dashboard/retirement', label: 'Retirement', icon: Sunset },
]

export default function DashboardSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-52 flex-shrink-0 flex flex-col bg-[var(--card)] border-r border-[var(--border)] h-screen">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[var(--border)]">
        <span className="text-base font-bold text-[var(--foreground)] tracking-tight">
          Alderways
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Foundation */}
        <div>
          <p className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-widest px-3 mb-2">
            Foundation
          </p>
          <div className="space-y-0.5">
            {FOUNDATION_LINKS.map((link) => {
              const Icon = link.icon
              const isActive =
                link.href === '/dashboard'
                  ? pathname === '/dashboard'
                  : pathname.startsWith(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 ${
                    isActive
                      ? 'bg-[var(--primary)] text-[var(--primary-foreground)] font-medium'
                      : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
                  }`}
                >
                  <Icon size={16} />
                  {link.label}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Life Decisions */}
        <div>
          <p className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-widest px-3 mb-2">
            Life Decisions
          </p>
          <div className="space-y-0.5">
            {MODULE_LINKS.map((link) => {
              const Icon = link.icon
              const isActive = pathname.startsWith(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 ${
                    isActive
                      ? 'bg-[var(--primary)] text-[var(--primary-foreground)] font-medium'
                      : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
                  }`}
                >
                  <Icon size={16} />
                  {link.label}
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-[var(--border)]">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition-all duration-150"
        >
          <Settings size={16} />
          Settings
        </Link>
      </div>
    </aside>
  )
}