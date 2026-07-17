import { useState } from 'react'
import { db } from '../db/db'
import type { Trainingsziel } from '../db/types'
import { ZIEL_KONFIG } from '../logic/einRM'
import { standardWochentage, WOCHENTAG_KURZ } from '../logic/trainingstage'

// Geführter Erststart: Trainingsziel → Trainingstage → Körperdaten → los.
// Erscheint nur, solange noch kein Profil existiert; „Überspringen" legt
// ein Profil mit Standardwerten an.
export default function Onboarding() {
  const [schritt, setSchritt] = useState(0)
  const [ziel, setZiel] = useState<Trainingsziel>('hypertrophie')
  const [tage, setTage] = useState(3)
  const [wochentage, setWochentage] = useState<number[]>(standardWochentage(3))
  const [alter, setAlter] = useState('')

  const abschliessen = (mitEingaben: boolean) => {
    const alterZahl = parseInt(alter, 10)
    void db.userProfile.put({
      id: 1,
      trainingsziel: mitEingaben ? ziel : 'hypertrophie',
      trainingstageProWoche: mitEingaben ? tage : 3,
      trainingsWochentage: mitEingaben ? wochentage : standardWochentage(3),
      ...(mitEingaben && Number.isFinite(alterZahl) && alterZahl > 0 ? { alter: alterZahl } : {}),
    })
  }

  const SCHRITTE = 4

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-surface pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex min-h-full max-w-lg flex-col px-5 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {Array.from({ length: SCHRITTE }, (_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === schritt ? 'w-6 bg-neon-lime' : 'w-1.5 bg-line-strong'
               }`}
              />
            ))}
          </div>
          <button onClick={() => abschliessen(false)} className="h-10 px-2 text-sm text-txt3 active:text-txt">
            Überspringen
          </button>
        </div>

        <div className="flex flex-1 flex-col justify-center py-8">
          {schritt === 0 && (
            <>
              <h1 className="text-4xl font-bold tracking-tight">
                Willkommen bei Fit<span className="text-neon-cyan">Track</span>
              </h1>
              <p className="mt-4 text-base leading-relaxed text-txt2">
                Dein Trainingsplan aus Maximalkraft und Haltungsanalyse – mit automatischer
                Progression, Workout-Timer und Statistik.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Alle Daten bleiben lokal auf deinem Gerät. Keine Anmeldung, keine Server.
              </p>
            </>
          )}

          {schritt === 1 && (
            <>
              <h2 className="text-2xl font-bold">Was ist dein Trainingsziel?</h2>
              <p className="mt-1 text-sm text-muted">
                Bestimmt Arbeitsgewichte, Wiederholungen und Satzpausen. Später im Profil änderbar.
              </p>
              <div className="mt-5 space-y-2">
                {(Object.keys(ZIEL_KONFIG) as Trainingsziel[]).map((z) => (
                  <button
                    key={z}
                    onClick={() => setZiel(z)}
                    className={`w-full rounded-xl border px-4 py-3.5 text-left transition-colors ${
                      ziel === z
                        ? 'border-neon-lime/50 bg-neon-lime/10 text-neon-lime'
                        : 'border-line bg-elev text-txt2'
                   }`}
                  >
                    <span className="font-medium">{ZIEL_KONFIG[z].label}</span>
                    <span className="mt-0.5 block text-xs opacity-70">
                      {ZIEL_KONFIG[z].prozent[0] * 100}–{ZIEL_KONFIG[z].prozent[1] * 100} % 1RM ·{' '}
                      {ZIEL_KONFIG[z].wdh[0]}–{ZIEL_KONFIG[z].wdh[1]} Wdh.
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          {schritt === 2 && (
            <>
              <h2 className="text-2xl font-bold">Wie oft trainierst du?</h2>
              <p className="mt-1 text-sm text-muted">
                Der Wochenplan wechselt zwischen zwei Ganzkörper-Einheiten.
              </p>
              <div className="mt-5 flex gap-2">
                {[2, 3, 4, 5].map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setTage(t)
                      setWochentage(standardWochentage(t))
                    }}
                    className={`h-14 flex-1 rounded-xl border text-xl font-bold transition-colors ${
                      tage === t
                        ? 'border-neon-lime/50 bg-neon-lime/10 text-neon-lime'
                        : 'border-line bg-elev text-txt2'
                   }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <h3 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-widest text-muted">
                An diesen Wochentagen
              </h3>
              <div className="flex gap-1.5">
                {WOCHENTAG_KURZ.map((label, i) => {
                  const aktiv = wochentage.includes(i)
                  return (
                    <button
                      key={label}
                      onClick={() =>
                        setWochentage(
                          aktiv
                            ? wochentage.filter((t) => t !== i)
                            : [...wochentage, i].sort((a, b) => a - b),
                        )
                      }
                      className={`h-11 flex-1 rounded-xl border text-sm font-semibold transition-colors ${
                        aktiv
                          ? 'border-neon-lime/50 bg-neon-lime/10 text-neon-lime'
                          : 'border-line bg-elev text-txt3'
                     }`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {schritt === 3 && (
            <>
              <h2 className="text-2xl font-bold">Fast geschafft</h2>
              <label className="mt-5 block">
                <span className="text-sm text-txt3">Alter (optional, für deine Pulszonen)</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={alter}
                  onChange={(e) => setAlter(e.target.value)}
                  placeholder="z. B. 35"
                  className="mt-1 w-full rounded-xl border border-line bg-elev px-4 py-3 text-lg text-txt placeholder-faint outline-none focus:border-line-strong"
                />
              </label>
              <div className="mt-6 space-y-3 rounded-2xl border border-line bg-elev p-4 text-sm leading-relaxed text-txt2">
                <p>
                  <span className="font-semibold text-neon-lime">1.</span> Trage deine
                  Maximalgewichte im <span className="font-semibold">Katalog</span> ein – daraus
                  entstehen Arbeitsgewichte und Analyse.
                </p>
                <p>
                  <span className="font-semibold text-neon-lime">2.</span> Mach den
                  Haltungs-Selbstcheck im <span className="font-semibold">Analyse</span>-Tab.
                </p>
                <p>
                  <span className="font-semibold text-neon-lime">3.</span> Starte dein erstes
                  Workout auf der <span className="font-semibold">Start</span>-Seite.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2">
          {schritt > 0 && (
            <button
              onClick={() => setSchritt(schritt - 1)}
              className="h-13 w-28 rounded-xl border border-line bg-elev text-base text-txt3 active:bg-elev2"
            >
              Zurück
            </button>
          )}
          <button
            onClick={() => (schritt < SCHRITTE - 1 ? setSchritt(schritt + 1) : abschliessen(true))}
            className="h-13 flex-1 rounded-xl bg-neon-lime/90 text-base font-semibold text-onaccent transition-transform active:scale-[0.98]"
          >
            {schritt < SCHRITTE - 1 ? 'Weiter' : 'Los geht’s'}
          </button>
        </div>
      </div>
    </div>
  )
}
