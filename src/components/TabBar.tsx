export type Tab = 'katalog' | 'plan' | 'workout' | 'ziele' | 'analyse' | 'profil'

const TABS: { id: Tab; label: string; aktivKlasse: string; icon: React.ReactNode }[] = [
  {
    id: 'katalog',
    label: 'Katalog',
    aktivKlasse: 'text-neon-lime',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M4 9v6M7 6.5v11M17 6.5v11M20 9v6M7 12h10" />
      </svg>
    ),
  },
  {
    id: 'plan',
    label: 'Plan',
    aktivKlasse: 'text-neon-lime',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M8 3v4M16 3v4M4 10h16M8.5 14.5l2 2 4-4" />
      </svg>
    ),
  },
  {
    id: 'workout',
    label: 'Workout',
    aktivKlasse: 'text-neon-cyan',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M10 8.5l5 3.5-5 3.5z" />
      </svg>
    ),
  },
  {
    id: 'ziele',
    label: 'Ziele',
    aktivKlasse: 'text-neon-violet',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1" />
      </svg>
    ),
  },
  {
    id: 'analyse',
    label: 'Analyse',
    aktivKlasse: 'text-amber-300',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19h16M6 16v-5m4 5V8m4 8v-3m4 3V6" />
      </svg>
    ),
  },
  {
    id: 'profil',
    label: 'Profil',
    aktivKlasse: 'text-gray-100',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 20c1.5-4 4-5.5 7-5.5s5.5 1.5 7 5.5" />
      </svg>
    ),
  },
]

export default function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-surface/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg">
      <div className="mx-auto flex max-w-lg">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`flex h-16 flex-1 flex-col items-center justify-center gap-1 transition-colors ${
              tab === t.id ? t.aktivKlasse : 'text-gray-500'
            }`}
          >
            {t.icon}
            <span className="text-xs font-medium">{t.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
