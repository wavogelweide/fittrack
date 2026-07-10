import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { CARDIO_GERAETE, DEHN_UEBUNGEN, KRAFT_UEBUNGEN } from '../db/seed'
import type { CardioTypeId } from '../db/types'
import { arbeitsgewicht, einRMProUebung, ZIEL_KONFIG } from '../logic/einRM'
import { ga1Zone } from '../logic/puls'
import { empfohlenesIntervallTempo, formatiereTempoBereich } from '../logic/tempo'
import {
  entwurfZuLog,
  formatiereSekunden,
  intervallGesamtSek,
  intervallStatus,
  mittlereWdh,
  type CardioMethode,
  type KraftEntwurf,
  type WorkoutEntwurf,
} from '../logic/workout'
import ExerciseIllustration from './ExerciseIllustration'

const KRAFT_INFO = Object.fromEntries(KRAFT_UEBUNGEN.map((u) => [u.id, u]))
const DEHN_INFO = Object.fromEntries(DEHN_UEBUNGEN.map((u) => [u.id, u]))

const heute = () => new Date().toISOString().slice(0, 10)
const kg = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 1 })

// Signalton per WebAudio (kein Asset nötig, bleibt offline-fähig)
let audioCtx: AudioContext | null = null
function signalTon(hoehe = 880, dauerMs = 180) {
  try {
    audioCtx ??= new AudioContext()
    const t = audioCtx.currentTime
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.type = 'sine'
    osc.frequency.value = hoehe
    gain.gain.setValueAtTime(0.25, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + dauerMs / 1000)
    osc.connect(gain).connect(audioCtx.destination)
    osc.start(t)
    osc.stop(t + dauerMs / 1000)
    navigator.vibrate?.(dauerMs)
  } catch {
    // Ton ist optional (z. B. ohne Nutzer-Geste blockiert)
  }
}

function Stepper({
  wert,
  onChange,
  schritt,
  min,
  einheit,
}: {
  wert: number | null
  onChange: (n: number) => void
  schritt: number
  min: number
  einheit: string
}) {
  const setze = (n: number) => onChange(Math.max(min, Math.round(n / schritt) * schritt))
  return (
    <div className="flex items-center gap-0.5">
      <button
        onClick={() => setze((wert ?? min) - schritt)}
        aria-label="verringern"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-elev text-xl text-txt2 active:bg-elev2"
      >
        −
      </button>
      <span className="min-w-12 text-center">
        <span className="text-lg font-semibold">{wert !== null ? kg(wert) : '–'}</span>
        <span className="block text-[10px] leading-none text-muted">{einheit}</span>
      </span>
      <button
        onClick={() => setze((wert ?? 0) + schritt)}
        aria-label="erhöhen"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-elev text-xl text-txt2 active:bg-elev2"
      >
        +
      </button>
    </div>
  )
}

function CheckKreis({ aktiv, onToggle }: { aktiv: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      aria-label={aktiv ? 'erledigt' : 'offen'}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
        aktiv ? 'border-neon-lime bg-neon-lime/15 text-neon-lime' : 'border-line-strong text-transparent'
     }`}
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 13l4 4 10-10" />
      </svg>
    </button>
  )
}

function KraftKarte({
  eintrag,
  onUpdate,
  onRemove,
}: {
  eintrag: KraftEntwurf
  onUpdate: (k: KraftEntwurf) => void
  onRemove: () => void
}) {
  const info = KRAFT_INFO[eintrag.exerciseId]
  const setzeSatz = (i: number, patch: Partial<KraftEntwurf['saetze'][number]>) =>
    onUpdate({
      ...eintrag,
      saetze: eintrag.saetze.map((s, j) => (j === i ? { ...s, ...patch } : s)),
    })
  const fertig = eintrag.saetze.length > 0 && eintrag.saetze.every((s) => s.erledigt)

  return (
    <div
      className={`rounded-2xl border p-4 backdrop-blur-md transition-colors ${
        fertig ? 'border-neon-lime/40 bg-neon-lime/5' : 'border-line bg-elev'
     }`}
    >
      <div className="flex items-center gap-3">
        <ExerciseIllustration
          klein
          illustrationId={info?.illustrationId ?? eintrag.exerciseId}
          name={info?.name ?? eintrag.exerciseId}
        />
        <p className="min-w-0 flex-1 font-medium">{info?.name ?? eintrag.exerciseId}</p>
        <button
          onClick={onRemove}
          aria-label="Übung entfernen"
          className="flex h-9 w-9 items-center justify-center rounded-full text-faint active:text-txt2"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      <ul className="mt-3 space-y-2">
        {eintrag.saetze.map((s, i) => (
          <li key={i} className="flex items-center justify-between gap-2">
            <CheckKreis aktiv={s.erledigt} onToggle={() => setzeSatz(i, { erledigt: !s.erledigt })} />
            <Stepper
              wert={s.gewichtKg}
              schritt={2.5}
              min={0}
              einheit="kg"
              onChange={(gewichtKg) => setzeSatz(i, { gewichtKg })}
            />
            <Stepper
              wert={s.wdh}
              schritt={1}
              min={1}
              einheit="Wdh."
              onChange={(wdh) => setzeSatz(i, { wdh })}
            />
          </li>
        ))}
      </ul>

      <button
        onClick={() =>
          onUpdate({
            ...eintrag,
            saetze: [
              ...eintrag.saetze,
              { ...(eintrag.saetze.at(-1) ?? { gewichtKg: null, wdh: 10 }), erledigt: false },
            ],
          })
        }
        className="mt-3 h-10 w-full rounded-xl border border-dashed border-line-strong text-sm text-txt3 active:bg-elev"
      >
        + Satz
      </button>
    </div>
  )
}

// Gemeinsamer Sekunden-Timer auf Zeitstempel-Basis (driftet nicht)
function useSekundenTimer() {
  const [laeuft, setLaeuft] = useState(false)
  const [vergangenSek, setVergangenSek] = useState(0)
  const startTs = useRef(0)

  useEffect(() => {
    if (!laeuft) return
    const id = setInterval(
      () => setVergangenSek(Math.floor((Date.now() - startTs.current) / 1000)),
      250,
    )
    return () => clearInterval(id)
  }, [laeuft])

  return {
    laeuft,
    vergangenSek,
    start: () => {
      startTs.current = Date.now() - vergangenSek * 1000
      setLaeuft(true)
    },
    pause: () => setLaeuft(false),
    reset: () => {
      setLaeuft(false)
      setVergangenSek(0)
    },
  }
}

function CardioKarte({
  cardio,
  onUpdate,
}: {
  cardio: NonNullable<WorkoutEntwurf['cardio']>
  onUpdate: (c: WorkoutEntwurf['cardio']) => void
}) {
  const profil = useLiveQuery(() => db.userProfile.get(1), [])
  const logs = useLiveQuery(() => db.workoutLogs.toArray(), []) ?? []
  const zone = ga1Zone(profil ?? {})
  const [runden, setRunden] = useState(8)
  const timer = useSekundenTimer()
  const vorherigePhase = useRef<string>('belastung')

  const status = intervallStatus(timer.vergangenSek, runden)
  const tempo = empfohlenesIntervallTempo(logs, cardio.cardioType)

  // Signal beim Phasenwechsel (60/120-Intervalle)
  useEffect(() => {
    if (cardio.methode !== 'intervall' || !timer.laeuft) return
    if (status.phase !== vorherigePhase.current) {
      vorherigePhase.current = status.phase
      if (status.phase === 'belastung') {
        signalTon(988)
        setTimeout(() => signalTon(988), 250)
      } else if (status.phase === 'erholung') {
        signalTon(587)
      } else {
        signalTon(784)
        setTimeout(() => signalTon(784), 250)
        setTimeout(() => signalTon(1047, 400), 500)
        timer.pause()
        onUpdate({ ...cardio, dauerMin: Math.round(intervallGesamtSek(runden) / 60) })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.phase, timer.laeuft, cardio.methode])

  const feld = (
    label: string,
    wert: number | undefined,
    setze: (n: number | undefined) => void,
    schrittAttr = '1',
  ) => (
    <label className="block">
      <span className="text-xs text-muted">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step={schrittAttr}
        value={wert ?? ''}
        onChange={(e) => {
          const n = e.target.valueAsNumber
          setze(Number.isFinite(n) && n > 0 ? n : undefined)
        }}
        className="mt-1 w-full rounded-xl border border-line bg-elev px-3 py-2.5 text-lg text-txt outline-none focus:border-line-strong"
      />
    </label>
  )

  const wechsleMethode = (methode: CardioMethode) => {
    timer.reset()
    vorherigePhase.current = 'belastung'
    onUpdate({ ...cardio, methode })
  }

  return (
    <div className="rounded-2xl border border-neon-cyan/25 bg-neon-cyan/5 p-4">
      <div className="flex flex-wrap gap-2">
        {CARDIO_GERAETE.map((g) => (
          <button
            key={g.id}
            onClick={() => onUpdate({ ...cardio, cardioType: g.id as CardioTypeId })}
            className={`h-10 rounded-full border px-4 text-sm transition-colors ${
              cardio.cardioType === g.id
                ? 'border-neon-cyan/60 bg-neon-cyan/15 text-neon-cyan'
                : 'border-line bg-elev text-txt3'
           }`}
          >
            {g.name}
          </button>
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {(
          [
            ['ga1', 'GA1'],
            ['intervall', '60/120-Intervalle'],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            onClick={() => wechsleMethode(m)}
            className={`h-11 rounded-xl border text-sm font-medium transition-colors ${
              cardio.methode === m
                ? 'border-neon-cyan/60 bg-neon-cyan/15 text-neon-cyan'
                : 'border-line bg-elev text-txt3'
           }`}
          >
            {label}
          </button>
        ))}
      </div>

      {cardio.methode === 'ga1' ? (
        <div className="mt-4 text-center">
          {zone ? (
            <p className="text-sm text-txt2">
              <span className="mr-1.5 inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-neon-cyan align-middle" />
              Zielzone{' '}
              <span className="text-3xl font-bold text-neon-cyan">
                {zone.von}–{zone.bis}
              </span>{' '}
              bpm
            </p>
          ) : (
            <p className="text-xs text-muted">
              Trage dein Alter im Profil ein, um deine GA1-Pulszone zu sehen.
            </p>
          )}
          <p className="mt-3 text-5xl font-bold tabular-nums text-txt">
            {formatiereSekunden(timer.vergangenSek)}
          </p>
          <p className="mt-1 text-xs text-muted">Empfohlen: 30–60 Minuten lockeres Tempo</p>
        </div>
      ) : (
        <div className="mt-4 text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-txt3">
            Runden:
            {[6, 8, 10].map((r) => (
              <button
                key={r}
                onClick={() => {
                  setRunden(r)
                  timer.reset()
                  vorherigePhase.current = 'belastung'
                }}
                className={`h-9 w-9 rounded-full border font-semibold transition-colors ${
                  runden === r
                    ? 'border-neon-cyan/60 bg-neon-cyan/15 text-neon-cyan'
                    : 'border-line bg-elev text-txt3'
               }`}
              >
                {r}
              </button>
            ))}
          </div>
          <p
            className={`mt-3 text-sm font-semibold uppercase tracking-widest ${
              status.phase === 'belastung'
                ? 'text-warn'
                : status.phase === 'erholung'
                  ? 'text-neon-cyan'
                  : 'text-neon-lime'
           }`}
          >
            {status.phase === 'belastung'
              ? `Belastung · Runde ${status.runde}/${runden}`
              : status.phase === 'erholung'
                ? `Erholung · Runde ${status.runde}/${runden}`
                : 'Geschafft!'}
          </p>
          <p className="text-6xl font-bold tabular-nums text-txt">
            {formatiereSekunden(status.verbleibendSek)}
          </p>
          {tempo && status.phase !== 'fertig' && (
            <p className="mt-1 text-lg font-semibold">
              <span className={status.phase === 'belastung' ? 'text-warn' : 'text-neon-cyan'}>
                Ziel{' '}
                {formatiereTempoBereich(
                  status.phase === 'belastung' ? tempo.belastung : tempo.erholung,
                )}
              </span>
            </p>
          )}
          <p className="mt-1 text-xs text-muted">
            Gesamt verbleibend {formatiereSekunden(status.gesamtVerbleibendSek)} · Signal beim
            Wechsel
          </p>
          {tempo ? (
            <p className="mt-3 rounded-xl border border-line bg-elev p-2.5 text-xs leading-relaxed text-txt3">
              Dein Tempo: Belastung{' '}
              <span className="font-semibold text-warn">{formatiereTempoBereich(tempo.belastung)}</span>
              {' · '}Erholung{' '}
              <span className="font-semibold text-neon-cyan">{formatiereTempoBereich(tempo.erholung)}</span>
              <span className="block text-muted">
                berechnet aus deinem Durchschnitt der letzten Einheiten ({kg(tempo.basisKmh)} km/h)
              </span>
            </p>
          ) : (
            <p className="mt-3 text-xs leading-relaxed text-muted">
              Protokolliere Einheiten mit Dauer und Distanz auf diesem Gerät, um berechnete
              Belastungs- und Erholungstempi zu sehen.
            </p>
          )}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => {
            signalTon(660, 80) // entsperrt Audio auf iOS per Nutzer-Geste
            if (timer.laeuft) {
              timer.pause()
              if (timer.vergangenSek >= 60 && !cardio.dauerMin) {
                onUpdate({ ...cardio, dauerMin: Math.round(timer.vergangenSek / 60) })
              }
            } else {
              timer.start()
            }
          }}
          className={`h-14 flex-1 rounded-xl border text-lg font-semibold transition-colors ${
            timer.laeuft
              ? 'border-warn/50 bg-warn/10 text-warn'
              : 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan'
         }`}
        >
          {timer.laeuft ? 'Pause' : timer.vergangenSek > 0 ? 'Weiter' : 'Start'}
        </button>
        <button
          onClick={() => {
            timer.reset()
            vorherigePhase.current = 'belastung'
          }}
          className="h-14 w-24 rounded-xl border border-line bg-elev text-sm text-txt3 active:bg-elev2"
        >
          Zurücksetzen
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {feld('Dauer (Min.)', cardio.dauerMin, (dauerMin) => onUpdate({ ...cardio, dauerMin }))}
        {feld('Distanz (km)', cardio.distanzKm, (distanzKm) => onUpdate({ ...cardio, distanzKm }), '0.1')}
        {feld('Widerstand/Steigung', cardio.widerstand, (widerstand) => onUpdate({ ...cardio, widerstand }))}
        {feld('Ø Puls (bpm)', cardio.pulsAvg, (pulsAvg) => onUpdate({ ...cardio, pulsAvg }))}
      </div>
    </div>
  )
}

function DehnZeile({
  eintrag,
  laufendSek,
  onToggle,
  onTimer,
}: {
  eintrag: WorkoutEntwurf['dehnen'][number]
  laufendSek: number | null
  onToggle: () => void
  onTimer: () => void
}) {
  const info = DEHN_INFO[eintrag.stretchId]
  return (
    <li className="flex items-center gap-3 border-t border-hairline py-2.5 first:border-t-0">
      <CheckKreis aktiv={eintrag.erledigt} onToggle={onToggle} />
      <div className="min-w-0 flex-1">
        <p className={`font-medium ${eintrag.erledigt ? 'text-muted line-through' : ''}`}>
          {info?.name ?? eintrag.stretchId}
        </p>
        <p className="text-xs text-muted">{eintrag.zielSek} s halten</p>
      </div>
      <button
        onClick={onTimer}
        className={`h-11 min-w-20 rounded-xl border px-3 text-lg font-semibold tabular-nums transition-colors ${
          laufendSek !== null
            ? 'border-neon-violet/60 bg-neon-violet/15 text-neon-violet'
            : 'border-line bg-elev text-txt2 active:bg-elev2'
       }`}
      >
        {laufendSek !== null ? formatiereSekunden(laufendSek) : '▶ Timer'}
      </button>
    </li>
  )
}

function UebungsWahl({
  titel,
  eintraege,
  onSelect,
  onClose,
}: {
  titel: string
  eintraege: { id: string; name: string; illustrationId: string; untertitel?: string }[]
  onSelect: (id: string) => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-surface pt-[env(safe-area-inset-top)]">
      <div className="mx-auto max-w-lg px-4 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
        <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between bg-surface/90 px-4 py-3 backdrop-blur-lg">
          <h2 className="text-lg font-bold">{titel}</h2>
          <button onClick={onClose} className="h-10 px-2 text-txt3 active:text-txt">
            Schließen
          </button>
        </div>
        <ul className="mt-1">
          {eintraege.map((e) => (
            <li key={e.id}>
              <button
                onClick={() => onSelect(e.id)}
                className="flex w-full items-center gap-3 border-t border-hairline py-2.5 text-left first:border-t-0 active:bg-elev"
              >
                <ExerciseIllustration klein illustrationId={e.illustrationId} name={e.name} />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{e.name}</span>
                  {e.untertitel && <span className="block text-xs text-muted">{e.untertitel}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default function WorkoutModus({
  titel,
  start,
  onClose,
}: {
  titel: string
  start: WorkoutEntwurf
  onClose: () => void
}) {
  const [entwurf, setEntwurf] = useState(start)
  const [wahl, setWahl] = useState<'kraft' | 'dehnen' | null>(null)
  const [meldung, setMeldung] = useState<string | null>(null)
  const maxWeights = useLiveQuery(() => db.maxWeights.toArray(), []) ?? []
  const profil = useLiveQuery(() => db.userProfile.get(1), [])

  // Dehn-Countdown: nur einer gleichzeitig, auf Zeitstempel-Basis
  const [dehnTimer, setDehnTimer] = useState<{ index: number; endeTs: number } | null>(null)
  const [, erzwingeTick] = useState(0)
  useEffect(() => {
    if (!dehnTimer) return
    const id = setInterval(() => {
      if (Date.now() >= dehnTimer.endeTs) {
        signalTon(784)
        setTimeout(() => signalTon(1047, 350), 250)
        setEntwurf((e) => ({
          ...e,
          dehnen: e.dehnen.map((d, i) => (i === dehnTimer.index ? { ...d, erledigt: true } : d)),
        }))
        setDehnTimer(null)
      } else {
        erzwingeTick((n) => n + 1)
      }
    }, 250)
    return () => clearInterval(id)
  }, [dehnTimer])

  const ziel = profil?.trainingsziel ?? 'hypertrophie'
  const einRMs = einRMProUebung(maxWeights)

  const fuegeKraftHinzu = (exerciseId: string) => {
    const einRM = einRMs[exerciseId]
    setEntwurf((e) => ({
      ...e,
      kraft: [
        ...e.kraft,
        {
          exerciseId,
          saetze: Array.from({ length: 3 }, () => ({
            gewichtKg: einRM ? arbeitsgewicht(einRM, ziel).empfohlenKg : null,
            wdh: mittlereWdh(ZIEL_KONFIG[ziel].wdh),
            erledigt: false,
          })),
        },
      ],
    }))
    setWahl(null)
  }

  const fuegeDehnenHinzu = (stretchId: string) => {
    setEntwurf((e) => ({
      ...e,
      dehnen: [
        ...e.dehnen,
        { stretchId, zielSek: DEHN_INFO[stretchId]?.halteDauerSek ?? 30, erledigt: false },
      ],
    }))
    setWahl(null)
  }

  const hatFortschritt =
    entwurf.kraft.some((k) => k.saetze.some((s) => s.erledigt)) ||
    entwurf.dehnen.some((d) => d.erledigt) ||
    Boolean(entwurf.cardio?.dauerMin)

  const abschliessen = () => {
    const log = entwurfZuLog(entwurf, heute())
    if (!log) {
      setMeldung('Noch nichts erfasst – hake mindestens einen Satz, Cardio oder eine Dehnübung ab.')
      return
    }
    void db.workoutLogs.add(log).then(onClose)
  }

  const abbrechen = () => {
    if (!hatFortschritt || window.confirm('Workout verwerfen? Erfasste Werte gehen verloren.')) {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-surface pt-[env(safe-area-inset-top)]">
      <div className="mx-auto max-w-lg px-4 pb-[calc(env(safe-area-inset-bottom)+7rem)]">
        <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between bg-surface/90 px-4 py-3 backdrop-blur-lg">
          <button onClick={abbrechen} className="-ml-2 h-11 px-2 text-txt3 active:text-txt">
            Abbrechen
          </button>
          <h2 className="min-w-0 truncate text-lg font-bold">{titel}</h2>
          <button
            onClick={abschliessen}
            className="h-11 rounded-xl border border-neon-lime/50 bg-neon-lime/10 px-4 font-semibold text-neon-lime active:bg-neon-lime/20"
          >
            Fertig
          </button>
        </div>

        {meldung && (
          <p className="mt-2 rounded-xl border border-warn/30 bg-warn/10 p-3 text-sm text-warn">
            {meldung}
          </p>
        )}

        <h3 className="mt-4 text-xs font-semibold uppercase tracking-widest text-muted">Kraft</h3>
        <div className="mt-2 space-y-3">
          {entwurf.kraft.map((k, i) => (
            <KraftKarte
              key={`${k.exerciseId}-${i}`}
              eintrag={k}
              onUpdate={(neu) =>
                setEntwurf((e) => ({ ...e, kraft: e.kraft.map((x, j) => (j === i ? neu : x)) }))
              }
              onRemove={() =>
                setEntwurf((e) => ({ ...e, kraft: e.kraft.filter((_, j) => j !== i) }))
              }
            />
          ))}
          <button
            onClick={() => setWahl('kraft')}
            className="h-12 w-full rounded-xl border border-dashed border-line-strong text-sm text-txt3 active:bg-elev"
          >
            + Kraftübung hinzufügen
          </button>
        </div>

        <h3 className="mt-6 text-xs font-semibold uppercase tracking-widest text-muted">Cardio</h3>
        <div className="mt-2">
          {entwurf.cardio ? (
            <CardioKarte
              cardio={entwurf.cardio}
              onUpdate={(cardio) => setEntwurf((e) => ({ ...e, cardio }))}
            />
          ) : (
            <button
              onClick={() =>
                setEntwurf((e) => ({ ...e, cardio: { cardioType: 'laufband', methode: 'ga1' } }))
              }
              className="h-12 w-full rounded-xl border border-dashed border-line-strong text-sm text-txt3 active:bg-elev"
            >
              + Cardio hinzufügen
            </button>
          )}
        </div>

        <h3 className="mt-6 text-xs font-semibold uppercase tracking-widest text-muted">
          Dehnen & Rollen
        </h3>
        <div className="mt-2 rounded-2xl border border-line bg-elev p-4 backdrop-blur-md">
          {entwurf.dehnen.length > 0 && (
            <ul>
              {entwurf.dehnen.map((d, i) => (
                <DehnZeile
                  key={`${d.stretchId}-${i}`}
                  eintrag={d}
                  laufendSek={
                    dehnTimer?.index === i
                      ? Math.max(0, Math.ceil((dehnTimer.endeTs - Date.now()) / 1000))
                      : null
                  }
                  onToggle={() =>
                    setEntwurf((e) => ({
                      ...e,
                      dehnen: e.dehnen.map((x, j) =>
                        j === i ? { ...x, erledigt: !x.erledigt } : x,
                      ),
                    }))
                  }
                  onTimer={() => {
                    if (dehnTimer?.index === i) {
                      setDehnTimer(null)
                    } else {
                      signalTon(660, 80)
                      setDehnTimer({ index: i, endeTs: Date.now() + d.zielSek * 1000 })
                    }
                  }}
                />
              ))}
            </ul>
          )}
          <button
            onClick={() => setWahl('dehnen')}
            className={`h-12 w-full rounded-xl border border-dashed border-line-strong text-sm text-txt3 active:bg-elev ${
              entwurf.dehnen.length > 0 ? 'mt-3' : ''
           }`}
          >
            + Dehnübung hinzufügen
          </button>
        </div>
      </div>

      {wahl === 'kraft' && (
        <UebungsWahl
          titel="Kraftübung wählen"
          eintraege={[...KRAFT_UEBUNGEN]
            .sort((a, b) => a.name.localeCompare(b.name, 'de'))
            .map((u) => ({
              id: u.id,
              name: u.name,
              illustrationId: u.illustrationId,
              untertitel: einRMs[u.id]
                ? `Arbeitsgewicht ${kg(arbeitsgewicht(einRMs[u.id], ziel).empfohlenKg)} kg`
                : undefined,
            }))}
          onSelect={fuegeKraftHinzu}
          onClose={() => setWahl(null)}
        />
      )}
      {wahl === 'dehnen' && (
        <UebungsWahl
          titel="Dehnübung wählen"
          eintraege={[...DEHN_UEBUNGEN]
            .sort((a, b) => a.name.localeCompare(b.name, 'de'))
            .map((u) => ({
              id: u.id,
              name: u.name,
              illustrationId: u.illustrationId,
              untertitel: `${u.halteDauerSek} s · ${u.art === 'blackroll' ? 'Blackroll' : 'Dehnen'}`,
            }))}
          onSelect={fuegeDehnenHinzu}
          onClose={() => setWahl(null)}
        />
      )}
    </div>
  )
}
