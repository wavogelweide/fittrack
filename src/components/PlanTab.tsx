import { DEHN_UEBUNGEN, KRAFT_UEBUNGEN } from '../db/seed'
import type { KraftVorschlag, TrainingsTag } from '../logic/vorschlag'
import ExerciseIllustration from './ExerciseIllustration'
import { useWochenplan } from './useWochenplan'

const KRAFT_NAME = Object.fromEntries(KRAFT_UEBUNGEN.map((u) => [u.id, u.name]))
const DEHN_INFO = Object.fromEntries(DEHN_UEBUNGEN.map((u) => [u.id, u]))
const KRAFT_ILLU = Object.fromEntries(KRAFT_UEBUNGEN.map((u) => [u.id, u.illustrationId]))

const PRIO: Record<KraftVorschlag['prioritaet'], { label: string; klasse: string } | null> = {
  hoch: { label: 'Priorität', klasse: 'border-neon-lime/40 bg-neon-lime/10 text-neon-lime' },
  erhaltung: { label: 'Erhaltung', klasse: 'border-line-strong bg-elev text-txt3' },
  normal: null,
}

const kg = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 1 })

// Progressions-Chips: automatische Steigerung/Reduktion aus der letzten Einheit
const PROGRESSION_CHIP: Partial<
  Record<NonNullable<KraftVorschlag['progression']>, { label: string; klasse: string }>
> = {
  steigern: { label: '↑ +2,5 kg', klasse: 'border-neon-lime/40 bg-neon-lime/10 text-neon-lime' },
  reduzieren: { label: '↓ −5 %', klasse: 'border-warn/40 bg-warn/10 text-warn' },
}

function KraftZeile({ vorschlag }: { vorschlag: KraftVorschlag }) {
  const prio = PRIO[vorschlag.prioritaet]
  const progression = vorschlag.progression && PROGRESSION_CHIP[vorschlag.progression]
  return (
    <li className="flex items-center gap-3 border-t border-hairline py-2.5 first:border-t-0">
      <ExerciseIllustration
        klein
        illustrationId={KRAFT_ILLU[vorschlag.exerciseId] ?? vorschlag.exerciseId}
        name={KRAFT_NAME[vorschlag.exerciseId] ?? vorschlag.exerciseId}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{KRAFT_NAME[vorschlag.exerciseId] ?? vorschlag.exerciseId}</p>
          {prio && (
            <span className={`rounded-full border px-2 py-0.5 text-[11px] ${prio.klasse}`}>
              {prio.label}
            </span>
          )}
          {progression && (
            <span className={`rounded-full border px-2 py-0.5 text-[11px] ${progression.klasse}`}>
              {progression.label}
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-txt3">
          {vorschlag.saetze} × {vorschlag.wdh[0]}–{vorschlag.wdh[1]} Wdh.
          {vorschlag.gewichtKg !== null ? (
            <span>
              {' · '}
              <span className="font-semibold text-neon-lime">{kg(vorschlag.gewichtKg)} kg</span>
            </span>
          ) : (
            <span className="text-faint"> · Gewicht: 1RM fehlt</span>
          )}
        </p>
        {vorschlag.grund && <p className="mt-0.5 text-xs text-muted">{vorschlag.grund}</p>}
      </div>
    </li>
  )
}

function TagKarte({ tag, onStart }: { tag: TrainingsTag; onStart: (tag: TrainingsTag) => void }) {
  return (
    <div className="rounded-2xl border border-line bg-elev p-4 backdrop-blur-md">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="text-2xl font-bold text-txt">Tag {tag.nr}</span>
          <span className="ml-2 text-sm text-muted">{tag.name}</span>
        </div>
        <button
          onClick={() => onStart(tag)}
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-neon-lime px-4 font-semibold text-onaccent transition-transform active:scale-[0.97]"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
            <path d="M8 5.5v13l11-6.5z" />
          </svg>
          Start
        </button>
      </div>

      <h3 className="mt-3 text-xs font-semibold uppercase tracking-widest text-muted">Kraft</h3>
      <ul className="mt-1">
        {tag.kraft.map((k) => (
          <KraftZeile key={k.exerciseId} vorschlag={k} />
        ))}
      </ul>

      <div className="mt-3 rounded-xl border border-neon-cyan/25 bg-neon-cyan/5 p-3">
        <p className="text-sm font-semibold text-neon-cyan">{tag.cardio.titel}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-txt2">{tag.cardio.beschreibung}</p>
      </div>

      <h3 className="mt-4 text-xs font-semibold uppercase tracking-widest text-muted">
        Dehnen & Rollen
      </h3>
      <ul className="mt-1 space-y-1.5">
        {tag.dehnen.map((d) => {
          const info = DEHN_INFO[d.stretchId]
          return (
            <li key={d.stretchId} className="flex items-baseline justify-between gap-2 text-sm">
              <span className="text-txt2">
                {info?.name ?? d.stretchId}
                {d.grund && <span className="ml-2 text-xs text-muted">({d.grund})</span>}
              </span>
              <span className="shrink-0 text-neon-violet">{info?.halteDauerSek ?? ''} s</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default function PlanTab({
  onStart,
  onFreiesWorkout,
}: {
  onStart: (tag: TrainingsTag) => void
  onFreiesWorkout: () => void
}) {
  const { plan } = useWochenplan()

  return (
    <div className="space-y-4">
      {plan.hinweise.length > 0 && (
        <div className="rounded-2xl border border-warn/30 bg-warn/10 p-4">
          <ul className="space-y-1.5 text-sm leading-relaxed text-warn">
            {plan.hinweise.map((h) => (
              <li key={h} className="flex gap-2">
                <span aria-hidden="true">•</span>
                {h}
              </li>
            ))}
          </ul>
        </div>
      )}

      {plan.tage.map((t) => (
        <TagKarte key={t.nr} tag={t} onStart={onStart} />
      ))}

      <button
        onClick={onFreiesWorkout}
        className="h-14 w-full rounded-2xl border border-dashed border-line-strong text-txt2 active:bg-elev"
      >
        Freies Workout starten
      </button>

      <p className="px-1 pb-2 text-xs leading-relaxed text-faint">
        Der Plan basiert auf deinen Eingaben, deiner Analyse und deinem Trainingsziel – er passt
        sich automatisch an, sobald sich deine Maximalgewichte ändern. Alle Empfehlungen sind
        Schätzwerte und ersetzen keine physiotherapeutische oder ärztliche Beratung.
      </p>
    </div>
  )
}
