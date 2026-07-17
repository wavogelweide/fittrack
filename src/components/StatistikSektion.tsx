import { useLiveQuery } from 'dexie-react-hooks'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { db } from '../db/db'
import { BEWEGUNGSTYP_LABELS } from '../db/labels'
import type { BewegungsTyp } from '../db/types'
import {
  aktuelleSerie,
  saetzeNachBewegungsTyp,
  vorWochen,
  wochenStatistik,
} from '../logic/statistik'
import { useKraftUebungen } from './useKraftUebungen'

const TYP_REIHENFOLGE: BewegungsTyp[] = ['push', 'pull', 'legs_front', 'legs_back', 'core']

const heute = () => new Date().toISOString().slice(0, 10)
const zahl = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 0 })

// Achsen-Ticks ohne Tausenderpunkt, damit vierstellige kg-Werte hineinpassen
const tickKompakt = (n: number) => String(n)

function Kachel({ wert, einheit, label }: { wert: string; einheit?: string; label: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-elev p-3">
      <p className="truncate text-2xl font-bold text-txt">
        {wert}
        {einheit && <span className="ml-1 text-sm font-medium text-muted">{einheit}</span>}
      </p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </div>
  )
}

export default function StatistikSektion() {
  const logs = useLiveQuery(() => db.workoutLogs.toArray(), []) ?? []
  const profil = useLiveQuery(() => db.userProfile.get(1), [])
  const bewegungstypVon = Object.fromEntries(useKraftUebungen().map((u) => [u.id, u.bewegungsTyp]))

  if (logs.length === 0) {
    return (
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">
          Statistik
        </h2>
        <p className="rounded-2xl border border-line bg-elev p-4 text-sm leading-relaxed text-muted backdrop-blur-md">
          Noch keine Workouts protokolliert – sobald du trainierst, siehst du hier deine
          Trainingsserie, das Wochenvolumen und die Verteilung auf Muskelgruppen.
        </p>
      </section>
    )
  }

  const stichtag = heute()
  const wochen = wochenStatistik(logs, stichtag, 8)
  const dieseWoche = wochen[wochen.length - 1]
  const serie = aktuelleSerie(logs, stichtag)
  const zielTage = profil?.trainingstageProWoche ?? 3

  const saetzeProTyp = saetzeNachBewegungsTyp(logs, bewegungstypVon, vorWochen(stichtag, 4))
  const maxSaetze = Math.max(1, ...Object.values(saetzeProTyp))
  const hatKraftSaetze = Object.values(saetzeProTyp).some((n) => n > 0)

  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">Statistik</h2>

      <div className="grid grid-cols-3 gap-2">
        <Kachel
          wert={String(serie)}
          einheit={serie === 1 ? 'Woche' : 'Wochen'}
          label="Serie in Folge"
        />
        <Kachel wert={`${dieseWoche.einheiten}/${zielTage}`} label="Einheiten diese Woche" />
        <Kachel wert={zahl(dieseWoche.volumenKg)} label="kg Volumen diese Woche" />
      </div>

      <div className="mt-3 rounded-2xl border border-line bg-elev p-4 backdrop-blur-md">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">
          Volumen der letzten 8 Wochen
        </h3>
        <div className="mt-2 h-36">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={wochen} margin={{ top: 4, right: 0, bottom: 0, left: -2 }}>
              <XAxis
                dataKey="label"
                tick={{ fill: 'var(--chart-axis)', fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: 'var(--chart-grid)' }}
              />
              <YAxis
                tick={{ fill: 'var(--chart-axis)', fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: 'var(--chart-grid)' }}
                width={44}
                tickFormatter={tickKompakt}
              />
              <Tooltip
                cursor={{ fill: 'var(--elev2)' }}
                contentStyle={{
                  background: 'var(--elev-solid)',
                  border: '1px solid var(--line)',
                  borderRadius: 12,
                  color: 'var(--txt)',
                }}
                formatter={(w) => [`${zahl(Number(w))} kg`, 'Volumen']}
                labelFormatter={(l) => `Woche ab ${l}`}
              />
              <Bar dataKey="volumenKg" fill="var(--neon-lime)" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {hatKraftSaetze && (
        <div className="mt-3 rounded-2xl border border-line bg-elev p-4 backdrop-blur-md">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">
            Sätze je Muskelgruppe (letzte 4 Wochen)
          </h3>
          <ul className="mt-3 space-y-2">
            {TYP_REIHENFOLGE.map((typ) => (
              <li key={typ} className="flex items-center gap-3 text-sm">
                <span className="w-28 shrink-0 text-txt3">{BEWEGUNGSTYP_LABELS[typ]}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-elev2">
                  <div
                    className="h-full rounded-full bg-neon-cyan"
                    style={{ width: `${(saetzeProTyp[typ] / maxSaetze) * 100}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right font-semibold text-txt">
                  {saetzeProTyp[typ]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
