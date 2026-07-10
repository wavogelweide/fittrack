import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db/db'
import { CARDIO_GERAETE, DEHN_UEBUNGEN } from './db/seed'
import { filtereCardio, filtereDehnen, filtereKraft } from './logic/katalog'
import type { TrainingsTag } from './logic/vorschlag'
import { entwurfAusTag, leererEntwurf, type WorkoutEntwurf } from './logic/workout'
import TabBar, { type Tab } from './components/TabBar'
import SuchFeld from './components/SuchFeld'
import DetailAnsicht, { type Auswahl } from './components/DetailAnsicht'
import { CardioListe, DehnListe, KraftListe } from './components/KatalogListen'
import ProfilTab from './components/ProfilTab'
import AnalyseTab from './components/AnalyseTab'
import PlanTab from './components/PlanTab'
import WorkoutTab from './components/WorkoutTab'
import ZieleTab from './components/ZieleTab'
import WorkoutModus from './components/WorkoutModus'

const TAB_TITEL: Record<Tab, string> = {
  plan: 'Trainingsplan',
  katalog: 'Katalog',
  workout: 'Historie',
  ziele: 'Ziele',
  analyse: 'Analyse',
  profil: 'Profil',
}

type KatalogArt = 'kraft' | 'cardio' | 'dehnen'

const KATALOG_ARTEN: { id: KatalogArt; label: string; aktivKlasse: string }[] = [
  { id: 'kraft', label: 'Kraft', aktivKlasse: 'border-neon-lime/50 bg-neon-lime/10 text-neon-lime' },
  { id: 'cardio', label: 'Cardio', aktivKlasse: 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan' },
  { id: 'dehnen', label: 'Dehnen', aktivKlasse: 'border-neon-violet/50 bg-neon-violet/10 text-neon-violet' },
]

const HALTE_DAUER = Object.fromEntries(DEHN_UEBUNGEN.map((u) => [u.id, u.halteDauerSek]))

function App() {
  const [tab, setTab] = useState<Tab>('plan')
  const [katalogArt, setKatalogArt] = useState<KatalogArt>('kraft')
  const [suche, setSuche] = useState('')
  const [auswahl, setAuswahl] = useState<Auswahl | null>(null)
  const [workout, setWorkout] = useState<{ titel: string; entwurf: WorkoutEntwurf } | null>(null)

  const kraft = useLiveQuery(() => db.exercises.orderBy('name').toArray(), []) ?? []
  const dehnen = useLiveQuery(() => db.stretches.orderBy('name').toArray(), []) ?? []

  const wechsleTab = (t: Tab) => {
    setTab(t)
    setSuche('')
  }

  const starteTag = (tag: TrainingsTag) =>
    setWorkout({ titel: `Tag ${tag.nr} · ${tag.name}`, entwurf: entwurfAusTag(tag, HALTE_DAUER) })

  const starteFreiesWorkout = () =>
    setWorkout({ titel: 'Freies Workout', entwurf: leererEntwurf() })

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 pb-28">
      <header className="sticky top-0 z-30 -mx-4 bg-surface/80 px-4 pb-3 pt-4 backdrop-blur-lg">
        <h1 className="text-2xl font-bold tracking-tight">
          Fit<span className="text-neon-cyan">Track</span>
          <span className="ml-3 text-base font-medium text-txt3">{TAB_TITEL[tab]}</span>
        </h1>
        {tab === 'katalog' && (
          <>
            <div className="mt-3 flex gap-2">
              {KATALOG_ARTEN.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    setKatalogArt(a.id)
                    setSuche('')
                  }}
                  className={`h-10 flex-1 rounded-xl border text-sm font-medium transition-colors ${
                    katalogArt === a.id ? a.aktivKlasse : 'border-line bg-elev text-txt3'
                 }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
            <div className="mt-3">
              <SuchFeld wert={suche} onChange={setSuche} />
            </div>
          </>
        )}
      </header>

      <main className="mt-3">
        {tab === 'katalog' && katalogArt === 'kraft' && (
          <KraftListe
            uebungen={filtereKraft(kraft, suche)}
            onAuswahl={(u) => setAuswahl({ typ: 'kraft', uebung: u })}
          />
        )}
        {tab === 'katalog' && katalogArt === 'cardio' && (
          <CardioListe
            geraete={filtereCardio(CARDIO_GERAETE, suche)}
            onAuswahl={(g) => setAuswahl({ typ: 'cardio', geraet: g })}
          />
        )}
        {tab === 'katalog' && katalogArt === 'dehnen' && (
          <DehnListe
            uebungen={filtereDehnen(dehnen, suche)}
            onAuswahl={(u) => setAuswahl({ typ: 'dehnen', uebung: u })}
          />
        )}
        {tab === 'plan' && <PlanTab onStart={starteTag} onFreiesWorkout={starteFreiesWorkout} />}
        {tab === 'workout' && <WorkoutTab />}
        {tab === 'ziele' && <ZieleTab />}
        {tab === 'analyse' && <AnalyseTab />}
        {tab === 'profil' && <ProfilTab />}
      </main>

      <TabBar tab={tab} onChange={wechsleTab} />

      {auswahl && <DetailAnsicht auswahl={auswahl} onClose={() => setAuswahl(null)} />}
      {workout && (
        <WorkoutModus
          titel={workout.titel}
          start={workout.entwurf}
          onClose={() => setWorkout(null)}
        />
      )}
    </div>
  )
}

export default App
