import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { CARDIO_GERAETE, DEHN_UEBUNGEN, KRAFT_UEBUNGEN } from '../db/seed'
import type { WorkoutEintrag, WorkoutLog } from '../db/types'
import { fasseWorkoutZusammen } from '../logic/workout'

const KRAFT_NAME = Object.fromEntries(KRAFT_UEBUNGEN.map((u) => [u.id, u.name]))
const DEHN_NAME = Object.fromEntries(DEHN_UEBUNGEN.map((u) => [u.id, u.name]))
const CARDIO_NAME = Object.fromEntries(CARDIO_GERAETE.map((g) => [g.id, g.name]))

const kg = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 1 })

const TYP_BADGE: Record<WorkoutLog['typ'], { label: string; klasse: string }> = {
  kraft: { label: 'Kraft', klasse: 'border-neon-lime/40 bg-neon-lime/10 text-neon-lime' },
  cardio: { label: 'Cardio', klasse: 'border-neon-cyan/40 bg-neon-cyan/10 text-neon-cyan' },
  dehnen: { label: 'Dehnen', klasse: 'border-neon-violet/40 bg-neon-violet/10 text-neon-violet' },
}

function formatDatum(iso: string): string {
  const d = new Date(`${iso}T12:00:00`)
  return d.toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function EintragDetail({ eintrag }: { eintrag: WorkoutEintrag }) {
  if (eintrag.art === 'kraft') {
    return (
      <div className="border-t border-hairline py-2.5 first:border-t-0">
        <p className="font-medium">{KRAFT_NAME[eintrag.exerciseId] ?? eintrag.exerciseId}</p>
        <p className="mt-0.5 text-sm text-txt3">
          {eintrag.saetze.map((s, i) => (
            <span key={i}>
              {i > 0 && ' · '}
              {kg(s.gewichtKg)} kg × {s.wdh}
            </span>
          ))}
        </p>
      </div>
    )
  }
  if (eintrag.art === 'cardio') {
    return (
      <div className="border-t border-hairline py-2.5 first:border-t-0">
        <p className="font-medium">{CARDIO_NAME[eintrag.cardioType] ?? eintrag.cardioType}</p>
        <p className="mt-0.5 text-sm text-txt3">
          {eintrag.dauerMin} Min.
          {eintrag.distanzKm ? ` · ${kg(eintrag.distanzKm)} km` : ''}
          {eintrag.widerstand ? ` · Widerstand ${eintrag.widerstand}` : ''}
          {eintrag.pulsAvg ? ` · Ø ${eintrag.pulsAvg} bpm` : ''}
        </p>
      </div>
    )
  }
  return (
    <div className="flex items-baseline justify-between gap-2 border-t border-hairline py-2.5 first:border-t-0">
      <p className="font-medium">{DEHN_NAME[eintrag.stretchId] ?? eintrag.stretchId}</p>
      <p className="shrink-0 text-sm text-neon-violet">{eintrag.dauerSek} s</p>
    </div>
  )
}

function HistorieDetail({ log, onClose }: { log: WorkoutLog; onClose: () => void }) {
  const badge = TYP_BADGE[log.typ]
  const loeschen = () => {
    if (window.confirm('Dieses Workout aus der Historie löschen?')) {
      void db.workoutLogs.delete(log.id).then(onClose)
    }
  }
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-surface pt-[env(safe-area-inset-top)]">
      <div className="mx-auto max-w-lg px-4 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
        <button
          onClick={onClose}
          className="-mx-2 my-3 flex h-12 items-center gap-2 px-2 text-base text-txt2 active:text-txt"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Zurück
        </button>

        <div className="rounded-2xl border border-line bg-elev p-5 backdrop-blur-md">
          <div className="mb-1 flex flex-wrap gap-2">
            <span className={`rounded-full border px-2 py-0.5 text-[11px] ${badge.klasse}`}>
              {badge.label}
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">{formatDatum(log.datum)}</h2>
          <div className="mt-4">
            {log.eintraege.map((e, i) => (
              <EintragDetail key={i} eintrag={e} />
            ))}
          </div>
        </div>

        <button
          onClick={loeschen}
          className="mt-4 h-12 w-full rounded-xl border border-danger/30 bg-danger/10 text-sm text-danger active:bg-danger/15"
        >
          Workout löschen
        </button>
      </div>
    </div>
  )
}

export default function WorkoutTab() {
  const logs =
    useLiveQuery(() => db.workoutLogs.orderBy('datum').reverse().toArray(), []) ?? []
  const [detail, setDetail] = useState<WorkoutLog | null>(null)

  return (
    <div className="space-y-6">
      <section>
        {logs.length === 0 ? (
          <p className="mt-3 px-1 text-sm leading-relaxed text-muted">
            Noch keine Workouts erfasst. Starte deine erste Einheit über den Start-Tab –
            abgeschlossene Trainings erscheinen hier.
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {logs.map((log) => {
              const z = fasseWorkoutZusammen(log)
              const badge = TYP_BADGE[log.typ]
              const teile = [
                z.kraftUebungen > 0 &&
                  `${z.saetze} ${z.saetze === 1 ? 'Satz' : 'Sätze'} · ${kg(z.volumenKg)} kg Volumen`,
                z.cardioMin > 0 && `${z.cardioMin} Min. Cardio`,
                z.dehnUebungen > 0 && `${z.dehnUebungen}× gedehnt`,
              ].filter(Boolean)
              return (
                <li key={log.id}>
                  <button
                    onClick={() => setDetail(log)}
                    className="w-full rounded-2xl border border-line bg-elev p-4 text-left backdrop-blur-md active:bg-elev2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold">{formatDatum(log.datum)}</p>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] ${badge.klasse}`}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-txt3">{teile.join(' · ')}</p>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {detail && <HistorieDetail log={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}
