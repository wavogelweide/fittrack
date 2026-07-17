import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { db } from '../db/db'
import { letzteMessung, pruefeMessung, sortiereMessungen, veraenderung } from '../logic/koerperdaten'

const heute = () => new Date().toISOString().slice(0, 10)
const zahl = (n: number, stellen = 1) =>
  n.toLocaleString('de-DE', { maximumFractionDigits: stellen })
const vorzeichen = (n: number, stellen = 1) => `${n > 0 ? '+' : ''}${zahl(n, stellen)}`

function kurzDatum(iso: string): string {
  return `${iso.slice(8, 10)}.${iso.slice(5, 7)}.`
}

// Körpergewicht (kg) und Körperfettanteil (%) erfassen und als Verlauf zeigen
export default function KoerperdatenVerlauf() {
  const messungen = useLiveQuery(() => db.koerperdaten.toArray(), []) ?? []
  const [gewicht, setGewicht] = useState('')
  const [fett, setFett] = useState('')
  const [fehler, setFehler] = useState<string | null>(null)

  const sortiert = sortiereMessungen(messungen)
  const aktuell = letzteMessung(messungen)
  const delta = veraenderung(messungen)
  const chartDaten = sortiert.map((m) => ({
    datum: kurzDatum(m.datum),
    gewicht: m.gewichtKg,
    fett: m.fettProzent ?? null,
  }))
  const hatFettDaten = sortiert.some((m) => m.fettProzent !== undefined)

  const speichern = () => {
    const g = gewicht ? parseFloat(gewicht.replace(',', '.')) : undefined
    const f = fett ? parseFloat(fett.replace(',', '.')) : undefined
    const problem = pruefeMessung(g, f)
    if (problem) {
      setFehler(problem)
      return
    }
    setFehler(null)
    void db.koerperdaten.add({
      datum: heute(),
      gewichtKg: g!,
      ...(f !== undefined ? { fettProzent: f } : {}),
    })
    setGewicht('')
    setFett('')
  }

  const feldKlasse =
    'w-full rounded-xl border border-line bg-elev px-3 py-3 text-base text-txt placeholder-faint outline-none focus:border-line-strong'

  return (
    <section className="rounded-2xl border border-line bg-elev p-5 backdrop-blur-md">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">
        Körperdaten-Verlauf
      </h2>

      {aktuell && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-line bg-elev p-3">
            <p className="text-xs uppercase tracking-widest text-muted">Gewicht</p>
            <p className="mt-1 text-3xl font-bold">{zahl(aktuell.gewichtKg)}</p>
            <p className="text-xs text-muted">
              kg
              {delta?.gewichtKg !== null && delta !== null && (
                <span className={delta.gewichtKg < 0 ? 'text-neon-cyan' : 'text-txt3'}>
                  {' '}
                  · {vorzeichen(delta.gewichtKg)} kg seit {kurzDatum(delta.seit)}
                </span>
              )}
            </p>
          </div>
          <div className="rounded-xl border border-line bg-elev p-3">
            <p className="text-xs uppercase tracking-widest text-muted">Körperfett</p>
            <p className="mt-1 text-3xl font-bold">
              {aktuell.fettProzent !== undefined ? zahl(aktuell.fettProzent) : '–'}
            </p>
            <p className="text-xs text-muted">
              %
              {delta?.fettProzent != null && (
                <span className={delta.fettProzent < 0 ? 'text-neon-cyan' : 'text-txt3'}>
                  {' '}
                  · {vorzeichen(delta.fettProzent)} %
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {chartDaten.length >= 2 && (
        <div className="mt-4 rounded-xl border border-line bg-elev p-2 pt-4">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartDaten} margin={{ top: 4, right: hatFettDaten ? 0 : 12, left: -14, bottom: 0 }}>
              <XAxis dataKey="datum" stroke="var(--chart-axis)" fontSize={11} tickLine={false} />
              <YAxis
                yAxisId="gewicht"
                stroke="var(--chart-axis)"
                fontSize={11}
                tickLine={false}
                domain={['auto', 'auto']}
                width={40}
              />
              {hatFettDaten && (
                <YAxis
                  yAxisId="fett"
                  orientation="right"
                  stroke="var(--chart-axis)"
                  fontSize={11}
                  tickLine={false}
                  domain={['auto', 'auto']}
                  width={34}
                />
              )}
              <Tooltip
                contentStyle={{
                  background: 'var(--elev-solid)',
                  border: '1px solid var(--line)',
                  borderRadius: 12,
                  color: 'var(--txt)',
                }}
                formatter={(wert, name) => [
                  `${zahl(Number(wert))} ${name === 'gewicht' ? 'kg' : '%'}`,
                  name === 'gewicht' ? 'Gewicht' : 'Körperfett',
                ]}
              />
              <Line
                yAxisId="gewicht"
                type="monotone"
                dataKey="gewicht"
                stroke="var(--neon-lime)"
                strokeWidth={2.5}
                dot={{ fill: 'var(--neon-lime)', r: 3 }}
              />
              {hatFettDaten && (
                <Line
                  yAxisId="fett"
                  type="monotone"
                  dataKey="fett"
                  stroke="var(--neon-cyan)"
                  strokeWidth={2}
                  dot={{ fill: 'var(--neon-cyan)', r: 3 }}
                  connectNulls
                />
              )}
            </LineChart>
          </ResponsiveContainer>
          {hatFettDaten && (
            <p className="px-2 pb-1 text-[11px] text-muted">
              <span className="text-neon-lime">●</span> Gewicht (kg, links) ·{' '}
              <span className="text-neon-cyan">●</span> Körperfett (%, rechts)
            </p>
          )}
        </div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-xs text-muted">Gewicht (kg)</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.1"
            placeholder="z. B. 82,5"
            value={gewicht}
            onChange={(e) => setGewicht(e.target.value)}
            className={feldKlasse}
          />
        </label>
        <label className="block">
          <span className="text-xs text-muted">Körperfett (%, optional)</span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.1"
            placeholder="z. B. 22"
            value={fett}
            onChange={(e) => setFett(e.target.value)}
            className={feldKlasse}
          />
        </label>
      </div>
      {fehler && <p className="mt-2 text-sm text-warn">{fehler}</p>}
      <button
        onClick={speichern}
        className="mt-3 h-12 w-full rounded-xl border border-neon-lime/40 bg-neon-lime/10 font-semibold text-neon-lime active:bg-neon-lime/20"
      >
        Messung speichern
      </button>

      {sortiert.length > 0 && (
        <ul className="mt-4 space-y-2">
          {[...sortiert]
            .reverse()
            .slice(0, 5)
            .map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between rounded-xl border border-line bg-elev px-4 py-2.5 text-sm"
              >
                <span>
                  <span className="font-semibold">{zahl(m.gewichtKg)} kg</span>
                  {m.fettProzent !== undefined && (
                    <span className="text-txt3"> · {zahl(m.fettProzent)} % KFA</span>
                  )}
                </span>
                <span className="text-muted">{kurzDatum(m.datum)}{m.datum.slice(0, 4)}</span>
                <button
                  onClick={() => void db.koerperdaten.delete(m.id)}
                  aria-label="Messung löschen"
                  className="-mr-1 flex h-9 w-9 items-center justify-center rounded-lg text-muted active:text-danger"
                >
                  <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </li>
            ))}
        </ul>
      )}
    </section>
  )
}
