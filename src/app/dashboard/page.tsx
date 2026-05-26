export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold text-[var(--foreground)]">
          Dashboard
        </h1>
        <p className="text-[var(--muted-foreground)]">
          Your financial picture will appear here.
        </p>
      </div>
    </div>
  )
}