export type Tab = 'plan' | 'katalog' | 'workout' | 'ziele' | 'analyse' | 'profil'

const TABS: { id: Tab; label: string; aktivKlasse: string; icon: React.ReactNode }[] = [
  {
    id: 'plan',
    label: 'Start',
    aktivKlasse: 'text-neon-lime',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 11.5 12 4l8 7.5M6 10v9h12v-9" />
        <path d="M10.5 13.5l4 2.25-4 2.25z" />
      </svg>
    ),
  },
  {
    id: 'katalog',
    label: 'Katalog',
    aktivKlasse: 'text-neon-cyan',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M4 9v6M7 6.5v11M17 6.5v11M20 9v6M7 12h10" />
      </svg>
    ),
  },
  {
    id: 'workout',
    label: 'Historie',
    aktivKlasse: 'text-neon-cyan',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3.5 2" />
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
    aktivKlasse: 'text-warn',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19h16M6 16v-5m4 5V8m4 8v-3m4 3V6" />
      </svg>
    ),
  },
  {
    id: 'profil',
    label: 'Profil',
    aktivKlasse: 'text-txt',
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
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg">
      <div className="mx-auto flex max-w-lg">
        {TABS.map((t) => {
          const aktiv = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              aria-current={aktiv ? 'page' : undefined}
              className={`flex h-16 flex-1 flex-col items-center justify-center gap-0.5 transition-colors ${
                aktiv ? t.aktivKlasse : 'text-muted'
              }`}
            >
              <span className={`rounded-full px-3 py-0.5 transition-colors ${aktiv ? 'bg-elev2' : ''}`}>
                {t.icon}
              </span>
              <span className="text-[11px] font-medium">{t.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
