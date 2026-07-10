import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db/db'
import { CARDIO_GERAETE } from './db/seed'
import { filtereCardio, filtereDehnen, filtereKraft } from './logic/katalog'
import TabBar, { type Tab } from './components/TabBar'
import SuchFeld from './components/SuchFeld'
import DetailAnsicht, { type Auswahl } from './components/DetailAnsicht'
import { CardioListe, DehnListe, KraftListe } from './components/KatalogListen'
import ProfilTab from './components/ProfilTab'

const TAB_TITEL: Record<Tab, string> = {
  kraft: 'Kraftübungen',
  cardio: 'Cardio-Geräte',
  dehnen: 'Dehnen & Blackroll',
  profil: 'Profil',
}

function App() {
  const [tab, setTab] = useState<Tab>('kraft')
  const [suche, setSuche] = useState('')
  const [auswahl, setAuswahl] = useState<Auswahl | null>(null)

  const kraft = useLiveQuery(() => db.exercises.orderBy('name').toArray(), []) ?? []
  const dehnen = useLiveQuery(() => db.stretches.orderBy('name').toArray(), []) ?? []

  const wechsleTab = (t: Tab) => {
    setTab(t)
    setSuche('')
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-4 pb-28">
      <header className="sticky top-0 z-30 -mx-4 bg-surface/80 px-4 pb-3 pt-4 backdrop-blur-lg">
        <h1 className="text-2xl font-bold tracking-tight">
          Fit<span className="text-neon-cyan">Track</span>
          <span className="ml-3 text-base font-medium text-gray-400">{TAB_TITEL[tab]}</span>
        </h1>
        {tab !== 'profil' && (
          <div className="mt-3">
            <SuchFeld wert={suche} onChange={setSuche} />
          </div>
        )}
      </header>

      <main className="mt-3">
        {tab === 'kraft' && (
          <KraftListe
            uebungen={filtereKraft(kraft, suche)}
            onAuswahl={(u) => setAuswahl({ typ: 'kraft', uebung: u })}
          />
        )}
        {tab === 'cardio' && (
          <CardioListe
            geraete={filtereCardio(CARDIO_GERAETE, suche)}
            onAuswahl={(g) => setAuswahl({ typ: 'cardio', geraet: g })}
          />
        )}
        {tab === 'dehnen' && (
          <DehnListe
            uebungen={filtereDehnen(dehnen, suche)}
            onAuswahl={(u) => setAuswahl({ typ: 'dehnen', uebung: u })}
          />
        )}
        {tab === 'profil' && <ProfilTab />}
      </main>

      <TabBar tab={tab} onChange={wechsleTab} />

      {auswahl && <DetailAnsicht auswahl={auswahl} onClose={() => setAuswahl(null)} />}
    </div>
  )
}

export default App
