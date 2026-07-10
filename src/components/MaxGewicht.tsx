import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { db } from '../db/db'
import type { Exercise } from '../db/types'
import { aktuellster1RM, arbeitsgewicht, geschaetztes1RM, ZIEL_KONFIG } from '../logic/einRM'

const heute = () => new Date().toISOString().slice(0, 10)

const kg = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 1 })

export default function MaxGewicht({ uebung }: { uebung: Exercise }) {
  const eintraege =
    useLiveQuery(
      () => db.maxWeights.where('exerciseId').equals(uebung.id).sortBy('datum'),
      [uebung.id],
    ) ?? []
  const profil = useLiveQuery(() => db.userProfile.get(1), [])

  const [gewicht, setGewicht] = useState('')
  const [wdh, setWdh] = useState('')
  const [datum, setDatum] = useState(heute())

  const einRM = aktuellster1RM(eintraege)
  const ziel = profil?.trainingsziel ?? 'hypertrophie'
  const arbeit = einRM !== null ? arbeitsgewicht(einRM, ziel) : null

  const speichern = () => {
    const g = parseFloat(gewicht.replace(',', '.'))
    const w = parseInt(wdh, 10)
    if (!Number.isFinite(g) || g <= 0 || !Number.isFinite(w) || w <= 0 || !datum) return
    void db.maxWeights.add({ exerciseId: uebung.id, gewichtKg: g, wiederholungen: w, datum })
    setGewicht('')
    setWdh('')
  }

  const chartDaten = eintraege.map((e) => ({
    datum: e.datum.slice(8, 10) + '.' + e.datum.slice(5, 7) + '.',
    einRM: Math.round(geschaetztes1RM(e.gewichtKg, e.wiederholungen) * 10) / 10,
  }))

  const feldKlasse =
    'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-base text-gray-100 placeholder-gray-600 outline-none focus:border-white/25'

  return (
    <>
      {einRM !== null && (
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-widest text-gray-500">1RM geschätzt</p>
            <p className="mt-1 text-4xl font-bold">{kg(Math.round(einRM * 2) / 2)}</p>
            <p className="text-sm text-gray-500">kg</p>
          </div>
          <div className="rounded-xl border border-neon-lime/30 bg-neon-lime/5 p-4">
            <p className="text-xs uppercase tracking-widest text-neon-lime/80">Arbeitsgewicht</p>
            <p className="mt-1 text-4xl font-bold text-neon-lime">{kg(arbeit!.empfohlenKg)}</p>
            <p className="text-sm text-gray-400">
              kg · {arbeit!.prozent[0] * 100}–{arbeit!.prozent[1] * 100} % 1RM ·{' '}
              {arbeit!.wdh[0]}–{arbeit!.wdh[1]} Wdh.
            </p>
          </div>
        </div>
      )}
      {einRM !== null && !profil && (
        <p className="mt-2 text-xs text-gray-500">
          Standardziel Hypertrophie – stelle dein Trainingsziel im Profil-Tab ein.
        </p>
      )}
      {einRM !== null && profil && (
        <p className="mt-2 text-xs text-gray-500">Trainingsziel: {ZIEL_KONFIG[ziel].label}</p>
      )}

      {chartDaten.length >= 2 && (
        <section className="mt-6">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
            1RM-Verlauf
          </h3>
          <div className="rounded-xl border border-white/10 bg-white/5 p-2 pt-4">
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartDaten} margin={{ top: 4, right: 12, left: -18, bottom: 0 }}>
                <XAxis dataKey="datum" stroke="#6b7280" fontSize={11} tickLine={false} />
                <YAxis stroke="#6b7280" fontSize={11} tickLine={false} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{
                    background: '#121826',
                    border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 12,
                    color: '#e5e7eb',
                  }}
                  formatter={(wert) => [`${kg(Number(wert))} kg`, '1RM']}
                />
                <Line
                  type="monotone"
                  dataKey="einRM"
                  stroke="#a3e635"
                  strokeWidth={2.5}
                  dot={{ fill: '#a3e635', r: 3.5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section className="mt-6">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
          Maximalgewicht erfassen
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-xs text-gray-500">Gewicht (kg)</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.5"
              placeholder="z. B. 60"
              value={gewicht}
              onChange={(e) => setGewicht(e.target.value)}
              className={feldKlasse}
            />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">Wiederholungen</span>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              placeholder="z. B. 8"
              value={wdh}
              onChange={(e) => setWdh(e.target.value)}
              className={feldKlasse}
            />
          </label>
        </div>
        <label className="mt-2 block">
          <span className="text-xs text-gray-500">Datum</span>
          <input
            type="date"
            value={datum}
            onChange={(e) => setDatum(e.target.value)}
            className={`${feldKlasse} [color-scheme:dark]`}
          />
        </label>
        <button
          onClick={speichern}
          className="mt-3 h-13 w-full rounded-xl bg-neon-lime/90 py-3.5 text-base font-semibold text-gray-950 transition-transform active:scale-[0.98]"
        >
          Speichern
        </button>
      </section>

      {eintraege.length > 0 && (
        <section className="mt-6">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
            Letzte Einträge
          </h3>
          <ul className="space-y-2">
            {[...eintraege]
              .reverse()
              .slice(0, 5)
              .map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm"
                >
                  <span>
                    <span className="font-semibold">{kg(e.gewichtKg)} kg</span>
                    <span className="text-gray-400"> × {e.wiederholungen}</span>
                  </span>
                  <span className="text-gray-500">
                    {e.datum.slice(8, 10)}.{e.datum.slice(5, 7)}.{e.datum.slice(0, 4)}
                  </span>
                  <button
                    onClick={() => void db.maxWeights.delete(e.id)}
                    aria-label="Eintrag löschen"
                    className="-mr-1 flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 active:text-red-400"
                  >
                    <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </li>
              ))}
          </ul>
        </section>
      )}
    </>
  )
}
