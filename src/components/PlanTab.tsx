import { DEHN_UEBUNGEN, KRAFT_UEBUNGEN } from '../db/seed'
import type { KraftVorschlag, TrainingsTag } from '../logic/vorschlag'
import ExerciseIllustration from './ExerciseIllustration'
import { useWochenplan } from './useWochenplan'

const KRAFT_NAME = Object.fromEntries(KRAFT_UEBUNGEN.map((u) => [u.id, u.name]))
const DEHN_INFO = Object.fromEntries(DEHN_UEBUNGEN.map((u) => [u.id, u]))
const KRAFT_ILLU = Object.fromEntries(KRAFT_UEBUNGEN.map((u) => [u.id, u.illustrationId]))

const PRIO: Record<KraftVorschlag['prioritaet'], { label: string; klasse: string } | null> = {
  hoch: { label: 'Priorität', klasse: 'border-neon-lime/40 bg-neon-lime/10 text-neon-lime' },
  erhaltung: { label: 'Erhaltung', klasse: 'border-white/15 bg-white/5 text-gray-400' },
  normal: null,
}

const kg = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 1 })

function KraftZeile({ vorschlag }: { vorschlag: KraftVorschlag }) {
  const prio = PRIO[vorschlag.prioritaet]
  return (
    <li className="flex items-center gap-3 border-t border-white/5 py-2.5 first:border-t-0">
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
        </div>
        <p className="mt-0.5 text-sm text-gray-400">
          {vorschlag.saetze} × {vorschlag.wdh[0]}–{vorschlag.wdh[1]} Wdh.
          {vorschlag.gewichtKg !== null ? (
            <span>
              {' · '}
              <span className="font-semibold text-neon-lime">{kg(vorschlag.gewichtKg)} kg</span>
            </span>
          ) : (
            <span className="text-gray-600"> · Gewicht: 1RM fehlt</span>
          )}
        </p>
        {vorschlag.grund && <p className="mt-0.5 text-xs text-gray-500">{vorschlag.grund}</p>}
      </div>
    </li>
  )
}

function TagKarte({ tag, onStart }: { tag: TrainingsTag; onStart: (tag: TrainingsTag) => void }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-bold text-gray-200">Tag {tag.nr}</span>
        <span className="text-sm text-gray-500">{tag.name}</span>
      </div>

      <h3 className="mt-3 text-xs font-semibold uppercase tracking-widest text-gray-500">Kraft</h3>
      <ul className="mt-1">
        {tag.kraft.map((k) => (
          <KraftZeile key={k.exerciseId} vorschlag={k} />
        ))}
      </ul>

      <div className="mt-3 rounded-xl border border-neon-cyan/25 bg-neon-cyan/5 p-3">
        <p className="text-sm font-semibold text-neon-cyan">{tag.cardio.titel}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-gray-300">{tag.cardio.beschreibung}</p>
      </div>

      <h3 className="mt-4 text-xs font-semibold uppercase tracking-widest text-gray-500">
        Dehnen & Rollen
      </h3>
      <ul className="mt-1 space-y-1.5">
        {tag.dehnen.map((d) => {
          const info = DEHN_INFO[d.stretchId]
          return (
            <li key={d.stretchId} className="flex items-baseline justify-between gap-2 text-sm">
              <span className="text-gray-300">
                {info?.name ?? d.stretchId}
                {d.grund && <span className="ml-2 text-xs text-gray-500">({d.grund})</span>}
              </span>
              <span className="shrink-0 text-neon-violet">{info?.halteDauerSek ?? ''} s</span>
            </li>
          )
        })}
      </ul>

      <button
        onClick={() => onStart(tag)}
        className="mt-4 h-12 w-full rounded-xl border border-neon-cyan/40 bg-neon-cyan/10 font-semibold text-neon-cyan active:bg-neon-cyan/20"
      >
        Training starten
      </button>
    </div>
  )
}

export default function PlanTab({ onStart }: { onStart: (tag: TrainingsTag) => void }) {
  const { plan } = useWochenplan()

  return (
    <div className="space-y-4">
      {plan.hinweise.length > 0 && (
        <div className="rounded-2xl border border-amber-400/25 bg-amber-400/5 p-4">
          <ul className="space-y-1.5 text-sm leading-relaxed text-amber-200/90">
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

      <p className="px-1 pb-2 text-xs leading-relaxed text-gray-600">
        Der Plan basiert auf deinen Eingaben, deiner Analyse und deinem Trainingsziel – er passt
        sich automatisch an, sobald sich deine Maximalgewichte ändern. Alle Empfehlungen sind
        Schätzwerte und ersetzen keine physiotherapeutische oder ärztliche Beratung.
      </p>
    </div>
  )
}
