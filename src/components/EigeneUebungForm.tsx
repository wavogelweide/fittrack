import { useState } from 'react'
import { db } from '../db/db'
import { BEWEGUNGSTYP_LABELS, MUSKEL_LABELS } from '../db/labels'
import type { BewegungsTyp, Muskel } from '../db/types'
import { erstelleEigeneUebung } from '../logic/eigeneUebungen'
import { useZurueckGeste } from './zurueckGeste'

const BEWEGUNGS_TYPEN = Object.keys(BEWEGUNGSTYP_LABELS) as BewegungsTyp[]
const MUSKELN = Object.keys(MUSKEL_LABELS) as Muskel[]

// Formular zum Anlegen einer eigenen Übung (erweitert den Kraft-Katalog)
export default function EigeneUebungForm({ onClose }: { onClose: () => void }) {
  const geste = useZurueckGeste(onClose)
  const [name, setName] = useState('')
  const [maschine, setMaschine] = useState('')
  const [bewegungsTyp, setBewegungsTyp] = useState<BewegungsTyp>('push')
  const [primaer, setPrimaer] = useState<Muskel[]>([])
  const [fehler, setFehler] = useState<string | null>(null)

  const togglePrimaer = (m: Muskel) =>
    setPrimaer((liste) => (liste.includes(m) ? liste.filter((x) => x !== m) : [...liste, m]))

  const speichern = () => {
    const ergebnis = erstelleEigeneUebung(
      { name, maschine: maschine || undefined, bewegungsTyp, primaerMuskeln: primaer },
      Date.now(),
    )
    if (!ergebnis.ok) {
      setFehler(ergebnis.fehler)
      return
    }
    void db.exercises.add(ergebnis.uebung).then(onClose)
  }

  const feldKlasse =
    'mt-1 w-full rounded-xl border border-line bg-elev px-3 py-3 text-base text-txt placeholder-faint outline-none focus:border-line-strong'

  return (
    <div ref={geste} className="fixed inset-0 z-[60] overflow-y-auto bg-surface pt-[env(safe-area-inset-top)]">
      <div className="mx-auto max-w-lg px-4 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
        <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between bg-surface/90 px-4 py-3 backdrop-blur-lg">
          <h2 className="text-lg font-bold">Eigene Übung anlegen</h2>
          <button onClick={onClose} className="h-10 px-2 text-txt3 active:text-txt">
            Abbrechen
          </button>
        </div>

        <label className="mt-2 block">
          <span className="text-xs text-muted">Name der Übung</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z. B. Hip Thrust Maschine"
            className={feldKlasse}
          />
        </label>

        <label className="mt-3 block">
          <span className="text-xs text-muted">Maschine/Gerät (optional)</span>
          <input
            type="text"
            value={maschine}
            onChange={(e) => setMaschine(e.target.value)}
            placeholder="z. B. Hip Thrust Machine"
            className={feldKlasse}
          />
        </label>

        <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-widest text-muted">
          Bewegungstyp
        </h3>
        <div className="flex flex-wrap gap-2">
          {BEWEGUNGS_TYPEN.map((t) => (
            <button
              key={t}
              onClick={() => setBewegungsTyp(t)}
              className={`h-11 rounded-full border px-4 text-sm transition-colors ${
                bewegungsTyp === t
                  ? 'border-neon-lime/50 bg-neon-lime/10 text-neon-lime'
                  : 'border-line bg-elev text-txt3'
             }`}
            >
              {BEWEGUNGSTYP_LABELS[t]}
            </button>
          ))}
        </div>

        <h3 className="mb-2 mt-5 text-xs font-semibold uppercase tracking-widest text-muted">
          Primäre Muskeln (mindestens einer)
        </h3>
        <div className="flex flex-wrap gap-2">
          {MUSKELN.map((m) => (
            <button
              key={m}
              onClick={() => togglePrimaer(m)}
              className={`h-10 rounded-full border px-3 text-sm transition-colors ${
                primaer.includes(m)
                  ? 'border-neon-lime/50 bg-neon-lime/10 text-neon-lime'
                  : 'border-line bg-elev text-txt3'
             }`}
            >
              {MUSKEL_LABELS[m]}
            </button>
          ))}
        </div>

        {fehler && (
          <p className="mt-4 rounded-xl border border-warn/30 bg-warn/10 p-3 text-sm text-warn">
            {fehler}
          </p>
        )}

        <button
          onClick={speichern}
          className="mt-5 h-13 w-full rounded-xl bg-neon-lime/90 py-3.5 text-base font-semibold text-onaccent transition-transform active:scale-[0.98]"
        >
          Übung anlegen
        </button>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Eigene Übungen erscheinen im Katalog und in der Übungsauswahl, können Maximalgewichte
          und Notizen tragen und stehen als Plan-Alternativen zur Verfügung.
        </p>
      </div>
    </div>
  )
}
