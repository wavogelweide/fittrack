import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { ART_LABELS, BEWEGUNGSTYP_LABELS, MUSKEL_LABELS } from '../db/labels'
import type { CardioGeraet, Exercise, StretchExercise } from '../db/types'
import { ga1Zone } from '../logic/puls'
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
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">{titel}</h3>
      {children}
    </section>
  )
}

export default function DetailAnsicht({ auswahl, onClose }: { auswahl: Auswahl; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-surface pt-[env(safe-area-inset-top)]">
      <div className="mx-auto max-w-lg px-4 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
        <button
          onClick={onClose}
          className="-mx-2 my-3 flex h-12 items-center gap-2 px-2 text-base text-gray-300 active:text-white"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Zurück
        </button>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
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
      <p className="mt-1 text-sm text-gray-400">Maschine: {uebung.maschine}</p>

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
  const zone = ga1Zone(profil ?? {})
  return (
    <>
      <h2 className="text-3xl font-bold tracking-tight">{geraet.name}</h2>

      <Abschnitt titel="Illustration">
        <ExerciseIllustration illustrationId={geraet.illustrationId} name={geraet.name} />
      </Abschnitt>

      <Abschnitt titel="Beschreibung">
        <p className="leading-relaxed text-gray-300">{geraet.beschreibung}</p>
      </Abschnitt>

      <Abschnitt titel="Trainingsmethoden">
        <div className="space-y-3">
          <div className="rounded-xl border border-neon-cyan/25 bg-neon-cyan/5 p-4">
            <p className="font-semibold text-neon-cyan">GA1 – Grundlagenausdauer</p>
            <p className="mt-1 text-sm leading-relaxed text-gray-300">
              Lockeres Tempo in der Pulszone von 60–75 % der maximalen Herzfrequenz, empfohlene
              Dauer 30–60 Minuten.
            </p>
            {zone ? (
              <p className="mt-2 text-sm text-gray-300">
                Deine Zone:{' '}
                <span className="text-2xl font-bold text-neon-cyan">
                  {zone.von}–{zone.bis}
                </span>{' '}
                bpm
              </p>
            ) : (
              <p className="mt-2 text-xs text-gray-500">
                Trage dein Alter im Profil-Tab ein, um deine persönliche Zone zu sehen.
              </p>
            )}
          </div>
          <div className="rounded-xl border border-neon-cyan/25 bg-neon-cyan/5 p-4">
            <p className="font-semibold text-neon-cyan">60/120-Intervalle</p>
            <p className="mt-1 text-sm leading-relaxed text-gray-300">
              Nach dem Aufwärmen 6–10 Runden: 60 Sekunden hohe Belastung, 120 Sekunden lockere
              Erholung. Intervall-Timer folgt im Workout-Modus.
            </p>
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
          <span className="ml-2 text-gray-400">Sekunden pro Seite/Durchgang</span>
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
        <p className="leading-relaxed text-gray-300">{uebung.anleitung}</p>
      </Abschnitt>
    </>
  )
}
