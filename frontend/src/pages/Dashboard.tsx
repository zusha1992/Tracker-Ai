export const Dashboard = () => {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-8 text-center">
        <p className="text-2xl font-semibold text-[var(--text-primary)] mb-2">Dashboard</p>
        <p className="text-sm text-[var(--text-muted)]">
          Stats and your winnings graph will appear here after you import a hand history file.
        </p>
      </div>
    </div>
  )
}
