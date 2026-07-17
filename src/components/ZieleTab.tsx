import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { db } from '../db/db'
import { CARDIO_GERAETE } from '../db/seed'
import type { Goal } from '../db/types'
import { useKraftUebungen } from './useKraftUebungen'
import {
  berechneZielFortschritt,
  bewerteAmbition,
  tageBisZiel,
  ZIEL_TYP_LABELS,
  type AmbitionsBewertung,
} from '../logic/ziele'

const CARDIO_NAME = Object.fromEntries(CARDIO_GERAETE.map((g) => [g.id, g.name]))

const heute = () => new Date().toISOString().slice(0, 10)
const einheitFormat = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 1 })

function referenzName(
  ziel: Pick<Goal, 'typ' | 'referenz'>,
  kraftName: Record<string, string>,
): string {
  return ziel.typ === 'kraft_gewicht'
    ? (kraftName[ziel.referenz] ?? ziel.referenz)
    : (CARDIO_NAME[ziel.referenz] ?? ziel.referenz)
}

const TYP_FARBE: Record<Goal['typ'], { balken: string; text: string; chart: string }> = {
  kraft_gewicht: { balken: 'bg-neon-lime', text: 'text-neon-lime', chart: 'var(--neon-lime)' },
  cardio_leistung: { balken: 'bg-neon-cyan', text: 'text-neon-cyan', chart: 'var(--neon-cyan)' },
  cardio_zeit: { balken: 'bg-neon-cyan', text: 'text-neon-cyan', chart: 'var(--neon-cyan)' },
  cardio_distanz: { balken: 'bg-neon-cyan', text: 'text-neon-cyan', chart: 'var(--neon-cyan)' },
}

// Formulierung des Ziels in einem Satz, z. B. „5 km in 30 Min."
function zielFormulierung(ziel: Goal): string | null {
  if (ziel.typ === 'cardio_leistung' && ziel.zielDauerMin) {
    return `${einheitFormat(ziel.zielwert)} km in ${ziel.zielDauerMin} Min.`
  }
  return null
}

const AMBITION_STIL: Record<AmbitionsBewertung['stufe'], { label: string; klasse: string }> = {
  realistisch: { label: 'realistisch', klasse: 'border-ok/40 bg-ok/10 text-ok' },
  ambitioniert: { label: 'ambitioniert', klasse: 'border-warn/40 bg-warn/10 text-warn' },
  sehr_ambitioniert: {
    label: 'sehr ambitioniert',
    klasse: 'border-danger/40 bg-danger/15 text-danger',
  },
}

function AmbitionsHinweis({ bewertung }: { bewertung: AmbitionsBewertung }) {
  const stil = AMBITION_STIL[bewertung.stufe]
  return (
    <p className="mt-3 flex flex-wrap items-center gap-2 text-xs leading-relaxed text-muted">
      <span className={`rounded-full border px-2 py-0.5 font-medium ${stil.klasse}`}>
        {stil.label}
      </span>
      <span>
        +{bewertung.steigerungProzent.toLocaleString('de-DE')} % nötig, ≈
        {bewertung.proWocheProzent.toLocaleString('de-DE')} % pro Woche über {bewertung.wochen}{' '}
        Wochen.
        {bewertung.stufe === 'sehr_ambitioniert' &&
          ' Tipp: Zieldatum nach hinten schieben oder ein Zwischenziel setzen.'}
      </span>
    </p>
  )
}

// Nur diese Typen sind neu anlegbar – Langzeitziele mit Zieldatum
const NEUE_ZIEL_TYPEN: Goal['typ'][] = ['kraft_gewicht', 'cardio_leistung']

function NeuesZiel({ onFertig }: { onFertig: () => void }) {
  const [typ, setTyp] = useState<Goal['typ']>('kraft_gewicht')
  const [referenz, setReferenz] = useState('')
  const [zielwert, setZielwert] = useState('')
  const [zielDauer, setZielDauer] = useState('')
  const [zieldatum, setZieldatum] = useState('')
  const maxWeights = useLiveQuery(() => db.maxWeights.toArray(), []) ?? []
  const logs = useLiveQuery(() => db.workoutLogs.toArray(), []) ?? []
  const kraftUebungen = useKraftUebungen()

  const referenzen =
    typ === 'kraft_gewicht'
      ? [...kraftUebungen].sort((a, b) => a.name.localeCompare(b.name, 'de'))
      : CARDIO_GERAETE

  const wert = parseFloat(zielwert.replace(',', '.'))
  const dauer = parseFloat(zielDauer.replace(',', '.'))
  const brauchtDauer = typ === 'cardio_leistung'
  const gueltig =
    referenz !== '' &&
    Number.isFinite(wert) &&
    wert > 0 &&
    zieldatum !== '' &&
    (!brauchtDauer || (Number.isFinite(dauer) && dauer > 0))

  // Live-Einschätzung, wie realistisch das Ziel ist (sobald Eingaben vollständig)
  const entwurf = gueltig
    ? {
        typ,
        referenz,
        zielwert: wert,
        zielDauerMin: brauchtDauer ? dauer : undefined,
        zieldatum,
      }
    : null
  const bewertung = entwurf
    ? bewerteAmbition(
        entwurf,
        berechneZielFortschritt(entwurf, maxWeights, logs).aktuell,
        heute(),
      )
    : null

  const speichern = () => {
    if (!gueltig) return
    void db.goals
      .add({
        typ,
        referenz,
        zielwert: wert,
        zielDauerMin: brauchtDauer ? dauer : undefined,
        zieldatum,
        status: 'aktiv',
      })
      .then(onFertig)
  }

  const feldKlasse =
    'mt-1 w-full rounded-xl border border-line bg-elev px-3 py-3 text-base text-txt placeholder-faint outline-none focus:border-line-strong'

  return (
    <div className="rounded-2xl border border-line bg-elev p-4 backdrop-blur-md">
      <div className="space-y-2">
        {NEUE_ZIEL_TYPEN.map((t) => (
          <button
            key={t}
            onClick={() => {
              setTyp(t)
              setReferenz('')
            }}
            className={`w-full rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors ${
              typ === t
                ? 'border-neon-lime/50 bg-neon-lime/10 text-neon-lime'
                : 'border-line bg-elev text-txt2'
           }`}
          >
            {ZIEL_TYP_LABELS[t]}
          </button>
        ))}
      </div>

      <label className="mt-4 block">
        <span className="text-sm text-txt3">
          {typ === 'kraft_gewicht' ? 'Übung' : 'Cardio-Gerät'}
        </span>
        <select value={referenz} onChange={(e) => setReferenz(e.target.value)} className={feldKlasse}>
          <option value="" disabled>
            Bitte wählen …
          </option>
          {referenzen.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm text-txt3">
            {typ === 'kraft_gewicht' ? 'Zielgewicht (kg, 1RM)' : 'Distanz (km)'}
          </span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={zielwert}
            onChange={(e) => setZielwert(e.target.value)}
            className={feldKlasse}
          />
        </label>
        {brauchtDauer && (
          <label className="block">
            <span className="text-sm text-txt3">in Zeit (Min.)</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              value={zielDauer}
              onChange={(e) => setZielDauer(e.target.value)}
              className={feldKlasse}
            />
          </label>
        )}
        <label className="block">
          <span className="text-sm text-txt3">bis zum Datum</span>
          <input
            type="date"
            min={heute()}
            value={zieldatum}
            onChange={(e) => setZieldatum(e.target.value)}
            className={feldKlasse}
          />
        </label>
      </div>

      {entwurf && typ === 'cardio_leistung' && (
        <p className="mt-3 text-xs text-muted">
          Zieltempo: {einheitFormat((wert / dauer) * 60)} km/h – gemessen an der
          Durchschnittsgeschwindigkeit deiner Einheiten.
        </p>
      )}
      {bewertung && <AmbitionsHinweis bewertung={bewertung} />}

      <button
        onClick={speichern}
        disabled={!gueltig}
        className="mt-4 h-12 w-full rounded-xl border border-neon-lime/50 bg-neon-lime/10 font-semibold text-neon-lime disabled:border-line disabled:bg-elev disabled:text-faint"
      >
        Ziel anlegen
      </button>
    </div>
  )
}

function ZielKarte({ ziel }: { ziel: Goal }) {
  const maxWeights = useLiveQuery(() => db.maxWeights.toArray(), []) ?? []
  const logs = useLiveQuery(() => db.workoutLogs.toArray(), []) ?? []
  const kraftName = Object.fromEntries(useKraftUebungen().map((u) => [u.id, u.name]))
  const f = berechneZielFortschritt(ziel, maxWeights, logs)
  const farbe = TYP_FARBE[ziel.typ]
  const tage = tageBisZiel(ziel.zieldatum, heute())
  const erreicht = ziel.status === 'erreicht' || f.erreicht
  const bewertung = erreicht ? null : bewerteAmbition(ziel, f.aktuell, heute())

  // Erreichte Ziele automatisch markieren (Abschluss-Status)
  useEffect(() => {
    if (f.erreicht && ziel.status === 'aktiv') {
      void db.goals.update(ziel.id, { status: 'erreicht' })
    }
  }, [f.erreicht, ziel.status, ziel.id])

  const chartDaten = f.verlauf.map((p) => ({
    datum: p.datum.slice(8, 10) + '.' + p.datum.slice(5, 7) + '.',
    wert: Math.round(p.wert * 10) / 10,
  }))

  const loeschen = () => {
    if (window.confirm(`Ziel „${referenzName(ziel, kraftName)}" löschen?`)) void db.goals.delete(ziel.id)
  }

  return (
    <div
      className={`rounded-2xl border p-4 backdrop-blur-md ${
        erreicht ? 'border-neon-lime/40 bg-neon-lime/5' : 'border-line bg-elev'
     }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold">
            {referenzName(ziel, kraftName)}
            {zielFormulierung(ziel) && (
              <span className="ml-2 font-normal text-txt3">{zielFormulierung(ziel)}</span>
            )}
          </p>
          <p className="text-xs text-muted">
            {ZIEL_TYP_LABELS[ziel.typ]}
            {ziel.zieldatum &&
              ` · bis ${ziel.zieldatum.slice(8, 10)}.${ziel.zieldatum.slice(5, 7)}.${ziel.zieldatum.slice(0, 4)}`}
          </p>
        </div>
        {erreicht ? (
          <span className="shrink-0 rounded-full border border-neon-lime/40 bg-neon-lime/10 px-2 py-0.5 text-[11px] text-neon-lime">
            ✓ Erreicht
          </span>
        ) : tage !== null ? (
          <span
            className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] ${
              tage < 0
                ? 'border-danger/40 bg-danger/15 text-danger'
                : 'border-line-strong bg-elev text-txt3'
           }`}
          >
            {tage < 0 ? `${-tage} Tage überfällig` : tage === 0 ? 'Heute fällig' : `noch ${tage} Tage`}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className={`text-4xl font-bold ${erreicht ? 'text-neon-lime' : farbe.text}`}>
          {f.aktuell !== null ? einheitFormat(f.aktuell) : '–'}
        </span>
        <span className="text-muted">
          / {einheitFormat(f.zielVergleichswert)} {f.einheit}
        </span>
        <span className="ml-auto text-sm font-semibold text-txt3">{f.prozent} %</span>
      </div>

      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-elev2">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${erreicht ? 'bg-neon-lime' : farbe.balken}`}
          style={{ width: `${f.prozent}%` }}
        />
      </div>

      {chartDaten.length >= 2 ? (
        <div className="mt-3 h-28">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartDaten} margin={{ top: 6, right: 6, bottom: 0, left: -18 }}>
              <XAxis dataKey="datum" tick={{ fill: 'var(--chart-axis)', fontSize: 11 }} tickLine={false} axisLine={{ stroke: 'var(--chart-grid)' }} />
              <YAxis tick={{ fill: 'var(--chart-axis)', fontSize: 11 }} tickLine={false} axisLine={{ stroke: 'var(--chart-grid)' }} width={44} domain={['auto', 'auto']} />
              <Tooltip
                contentStyle={{ background: 'var(--elev-solid)', border: '1px solid var(--line)', borderRadius: 12, color: 'var(--txt)' }}
                formatter={(w) => [`${einheitFormat(Number(w))} ${f.einheit}`, 'Bestwert']}
              />
              <ReferenceLine y={f.zielVergleichswert} stroke={farbe.chart} strokeDasharray="4 4" strokeOpacity={0.6} />
              <Line type="monotone" dataKey="wert" stroke={farbe.chart} strokeWidth={2} dot={{ r: 3, fill: farbe.chart }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        f.aktuell === null && (
          <p className="mt-3 text-xs leading-relaxed text-muted">
            {ziel.typ === 'kraft_gewicht'
              ? 'Noch keine Daten – trage ein Maximalgewicht ein oder protokolliere ein Workout mit dieser Übung.'
              : ziel.typ === 'cardio_leistung'
                ? 'Noch keine Daten – protokolliere eine Cardio-Einheit mit Dauer und Distanz auf diesem Gerät.'
                : 'Noch keine Daten – protokolliere eine Cardio-Einheit auf diesem Gerät.'}
          </p>
        )
      )}

      {!erreicht && bewertung && <AmbitionsHinweis bewertung={bewertung} />}

      <button onClick={loeschen} className="mt-3 text-xs text-faint underline-offset-2 active:underline">
        Ziel löschen
      </button>
    </div>
  )
}

export default function ZieleTab() {
  const ziele = useLiveQuery(() => db.goals.toArray(), []) ?? []
  const [formOffen, setFormOffen] = useState(false)

  const aktive = ziele.filter((z) => z.status !== 'erreicht')
  const erreichte = ziele.filter((z) => z.status === 'erreicht')

  return (
    <div className="space-y-4">
      {formOffen ? (
        <NeuesZiel onFertig={() => setFormOffen(false)} />
      ) : (
        <button
          onClick={() => setFormOffen(true)}
          className="h-14 w-full rounded-2xl border border-dashed border-line-strong text-txt2 active:bg-elev"
        >
          + Neues Ziel
        </button>
      )}

      {ziele.length === 0 && !formOffen && (
        <p className="px-1 text-sm leading-relaxed text-muted">
          Setze dir ein Kraft- oder Cardio-Ziel – der Fortschritt wird automatisch aus deinen
          Maximalgewichten und Workouts berechnet.
        </p>
      )}

      {aktive.map((z) => (
        <ZielKarte key={z.id} ziel={z} />
      ))}

      {erreichte.length > 0 && (
        <>
          <h2 className="px-1 pt-2 text-xs font-semibold uppercase tracking-widest text-muted">
            Erreicht
          </h2>
          {erreichte.map((z) => (
            <ZielKarte key={z.id} ziel={z} />
          ))}
        </>
      )}
    </div>
  )
}
