import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { ART_LABELS, BEWEGUNGSTYP_LABELS, MUSKEL_LABELS } from '../db/labels'
import type { CardioGeraet, Exercise, StretchExercise } from '../db/types'
import { ga1Zone } from '../logic/puls'
import { formatiereTempoBereich, intervallVorgabe } from '../logic/tempo'
import { useZurueckGeste } from './zurueckGeste'
import Chip from './Chip'
import ExerciseIllustration from './ExerciseIllustration'
import MaxGewicht from './MaxGewicht'

export type Auswahl =
  | { typ: 'kraft'; uebung: Exercise }
  | { typ: 'cardio'; geraet: CardioGeraet }
  | { typ: 'dehnen'; uebung: StretchExercise }

function Abschnitt({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">{titel}</h3>
      {children}
    </section>
  )
}

export default function DetailAnsicht({ auswahl, onClose }: { auswahl: Auswahl; onClose: () => void }) {
  const geste = useZurueckGeste(onClose)
  return (
    <div ref={geste} className="fixed inset-0 z-50 overflow-y-auto bg-surface pt-[env(safe-area-inset-top)]">
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
          {auswahl.typ === 'kraft' && <KraftDetail uebung={auswahl.uebung} />}
          {auswahl.typ === 'cardio' && <CardioDetail geraet={auswahl.geraet} />}
          {auswahl.typ === 'dehnen' && <DehnDetail uebung={auswahl.uebung} />}
        </div>
      </div>
    </div>
  )
}

function KraftDetail({ uebung }: { uebung: Exercise }) {
  return (
    <>
      <div className="mb-1 flex flex-wrap gap-2">
        <Chip text={BEWEGUNGSTYP_LABELS[uebung.bewegungsTyp]} farbe="lime" />
      </div>
      <h2 className="text-3xl font-bold tracking-tight">{uebung.name}</h2>
      <p className="mt-1 text-sm text-txt3">Maschine: {uebung.maschine}</p>

      <Abschnitt titel="Illustration">
        <ExerciseIllustration illustrationId={uebung.illustrationId} name={uebung.name} />
      </Abschnitt>

      <Abschnitt titel="Primäre Muskeln">
        <div className="flex flex-wrap gap-2">
          {uebung.primaerMuskeln.map((m) => (
            <Chip key={m} text={MUSKEL_LABELS[m]} farbe="lime" />
          ))}
        </div>
      </Abschnitt>

      {uebung.sekundaerMuskeln.length > 0 && (
        <Abschnitt titel="Sekundäre Muskeln">
          <div className="flex flex-wrap gap-2">
            {uebung.sekundaerMuskeln.map((m) => (
              <Chip key={m} text={MUSKEL_LABELS[m]} />
            ))}
          </div>
        </Abschnitt>
      )}

      <MaxGewicht uebung={uebung} />
    </>
  )
}

function CardioDetail({ geraet }: { geraet: CardioGeraet }) {
  const profil = useLiveQuery(() => db.userProfile.get(1), [])
  const logs = useLiveQuery(() => db.workoutLogs.toArray(), []) ?? []
  const goals = useLiveQuery(() => db.goals.toArray(), []) ?? []
  const zone = ga1Zone(profil ?? {})
  const tempo = intervallVorgabe(logs, goals, geraet.id, new Date().toISOString().slice(0, 10))
  return (
    <>
      <h2 className="text-3xl font-bold tracking-tight">{geraet.name}</h2>

      <Abschnitt titel="Illustration">
        <ExerciseIllustration illustrationId={geraet.illustrationId} name={geraet.name} />
      </Abschnitt>

      <Abschnitt titel="Beschreibung">
        <p className="leading-relaxed text-txt2">{geraet.beschreibung}</p>
      </Abschnitt>

      <Abschnitt titel="Trainingsmethoden">
        <div className="space-y-3">
          <div className="rounded-xl border border-neon-cyan/25 bg-neon-cyan/5 p-4">
            <p className="font-semibold text-neon-cyan">GA1 – Grundlagenausdauer</p>
            <p className="mt-1 text-sm leading-relaxed text-txt2">
              Lockeres Tempo in der Pulszone von 60–75 % der maximalen Herzfrequenz, empfohlene
              Dauer 30–60 Minuten.
            </p>
            {zone ? (
              <p className="mt-2 text-sm text-txt2">
                Deine Zone:{' '}
                <span className="text-2xl font-bold text-neon-cyan">
                  {zone.von}–{zone.bis}
                </span>{' '}
                bpm
              </p>
            ) : (
              <p className="mt-2 text-xs text-muted">
                Trage dein Alter im Profil-Tab ein, um deine persönliche Zone zu sehen.
              </p>
            )}
          </div>
          <div className="rounded-xl border border-neon-cyan/25 bg-neon-cyan/5 p-4">
            <p className="font-semibold text-neon-cyan">60/120-Intervalle</p>
            <p className="mt-1 text-sm leading-relaxed text-txt2">
              Nach dem Aufwärmen 6–10 Runden: 60 Sekunden hohe Belastung, 120 Sekunden lockere
              Erholung. Der Intervall-Timer läuft im Workout-Modus.
            </p>
            {tempo ? (
              <p className="mt-2 text-sm leading-relaxed text-txt2">
                Dein Tempo: Belastung{' '}
                <span className="font-bold text-warn">{formatiereTempoBereich(tempo.belastung)}</span>
                {' · '}Erholung{' '}
                <span className="font-bold text-neon-cyan">{formatiereTempoBereich(tempo.erholung)}</span>
                <span className="block text-xs text-muted">
                  {tempo.quelle === 'ziel'
                    ? `aus deinem Ziel ${tempo.zielKmh!.toLocaleString('de-DE', { maximumFractionDigits: 1 })} km/h bis ${tempo.zieldatum!.slice(8, 10)}.${tempo.zieldatum!.slice(5, 7)}. – Wochenziel ${tempo.wochenZielKmh!.toLocaleString('de-DE', { maximumFractionDigits: 1 })} km/h`
                    : `aus deinem Durchschnittstempo der letzten Einheiten (${tempo.basisKmh.toLocaleString('de-DE', { maximumFractionDigits: 1 })} km/h)`}
                </span>
              </p>
            ) : (
              <p className="mt-2 text-xs text-muted">
                Protokolliere Einheiten mit Dauer und Distanz, um deine berechneten Intervall-Tempi
                zu sehen.
              </p>
            )}
          </div>
        </div>
      </Abschnitt>
    </>
  )
}

function DehnDetail({ uebung }: { uebung: StretchExercise }) {
  return (
    <>
      <div className="mb-1 flex flex-wrap gap-2">
        <Chip text={ART_LABELS[uebung.art]} farbe="violet" />
      </div>
      <h2 className="text-3xl font-bold tracking-tight">{uebung.name}</h2>

      <Abschnitt titel="Illustration">
        <ExerciseIllustration illustrationId={uebung.illustrationId} name={uebung.name} />
      </Abschnitt>

      <Abschnitt titel="Haltedauer">
        <p>
          <span className="text-5xl font-bold text-neon-violet">{uebung.halteDauerSek}</span>
          <span className="ml-2 text-txt3">Sekunden pro Seite/Durchgang</span>
        </p>
      </Abschnitt>

      <Abschnitt titel="Zielmuskeln">
        <div className="flex flex-wrap gap-2">
          {uebung.zielMuskeln.map((m) => (
            <Chip key={m} text={MUSKEL_LABELS[m]} farbe="violet" />
          ))}
        </div>
      </Abschnitt>

      <Abschnitt titel="Anleitung">
        <p className="leading-relaxed text-txt2">{uebung.anleitung}</p>
      </Abschnitt>
    </>
  )
}
