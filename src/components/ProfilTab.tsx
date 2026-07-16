import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Trainingsziel, UserProfile } from '../db/types'
import { ZIEL_KONFIG } from '../logic/einRM'
import { ga1Zone } from '../logic/puls'
import { PAUSEN_SEK } from '../logic/progression'
import { standardWochentage, WOCHENTAG_KURZ } from '../logic/trainingstage'
import { formatiereSekunden } from '../logic/workout'
import Datensicherung from './Datensicherung'
import { gespeicherteWahl, setzeTheme, type ThemeWahl } from './theme'

const THEME_OPTIONEN: { id: ThemeWahl; label: string }[] = [
  { id: 'dunkel', label: 'Dunkel' },
  { id: 'hell', label: 'Hell' },
  { id: 'system', label: 'System' },
]

function ThemeWahlSektion() {
  const [wahl, setWahl] = useState<ThemeWahl>(gespeicherteWahl)
  return (
    <section className="rounded-2xl border border-line bg-elev p-5 backdrop-blur-md">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
        Darstellung
      </h2>
      <div className="flex gap-2">
        {THEME_OPTIONEN.map((o) => (
          <button
            key={o.id}
            onClick={() => {
              setzeTheme(o.id)
              setWahl(o.id)
            }}
            className={`h-12 flex-1 rounded-xl border text-sm font-medium transition-colors ${
              wahl === o.id
                ? 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan'
                : 'border-line bg-elev text-txt3'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </section>
  )
}

const STANDARD: Omit<UserProfile, 'id'> = { trainingsziel: 'hypertrophie', trainingstageProWoche: 3 }

function ZahlenFeld({
  label,
  wert,
  onChange,
  platzhalter,
  einheit,
}: {
  label: string
  wert: number | undefined
  onChange: (n: number | undefined) => void
  platzhalter?: string
  einheit: string
}) {
  return (
    <label className="block">
      <span className="text-sm text-txt3">{label}</span>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={wert ?? ''}
          placeholder={platzhalter}
          onChange={(e) => {
            const n = e.target.valueAsNumber
            onChange(Number.isFinite(n) && n > 0 ? n : undefined)
          }}
          className="w-full rounded-xl border border-line bg-elev px-4 py-3 text-lg text-txt placeholder-faint outline-none focus:border-line-strong"
        />
        <span className="w-12 shrink-0 text-sm text-muted">{einheit}</span>
      </div>
    </label>
  )
}

export default function ProfilTab() {
  const profil = useLiveQuery(() => db.userProfile.get(1), [])
  const speichere = (patch: Partial<UserProfile>) =>
    void db.userProfile.put({ ...STANDARD, ...profil, ...patch, id: 1 })

  const zone = ga1Zone(profil ?? {})
  const ziel = profil?.trainingsziel ?? STANDARD.trainingsziel
  const tage = profil?.trainingstageProWoche ?? STANDARD.trainingstageProWoche
  const wochentage = profil?.trainingsWochentage ?? standardWochentage(tage)
  const standardPause = PAUSEN_SEK[ziel]
  const pause = profil?.pausenSek ?? standardPause

  return (
    <div className="space-y-6">
      <ThemeWahlSektion />

      <section className="space-y-4 rounded-2xl border border-line bg-elev p-5 backdrop-blur-md">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">
          Körperdaten
        </h2>
        <ZahlenFeld
          label="Alter"
          einheit="Jahre"
          wert={profil?.alter}
          onChange={(alter) => speichere({ alter })}
        />
        <ZahlenFeld
          label="Ruhepuls (optional, für genauere Pulszonen)"
          einheit="bpm"
          wert={profil?.ruhePuls}
          onChange={(ruhePuls) => speichere({ ruhePuls })}
        />
        <ZahlenFeld
          label="Maximalpuls (optional)"
          einheit="bpm"
          platzhalter={profil?.alter ? `automatisch: ${220 - profil.alter}` : 'automatisch: 220 − Alter'}
          wert={profil?.maxPuls}
          onChange={(maxPuls) => speichere({ maxPuls })}
        />
      </section>

      <section className="rounded-2xl border border-line bg-elev p-5 backdrop-blur-md">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
          Trainingsziel
        </h2>
        <div className="space-y-2">
          {(Object.keys(ZIEL_KONFIG) as Trainingsziel[]).map((z) => (
            <button
              key={z}
              onClick={() => speichere({ trainingsziel: z })}
              className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
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
      </section>

      <section className="rounded-2xl border border-line bg-elev p-5 backdrop-blur-md">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
          Trainingstage pro Woche
        </h2>
        <div className="flex gap-2">
          {[2, 3, 4, 5].map((t) => (
            <button
              key={t}
              onClick={() =>
                speichere({ trainingstageProWoche: t, trainingsWochentage: standardWochentage(t) })
              }
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

        <h3 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-widest text-muted">
          An diesen Wochentagen
        </h3>
        <div className="flex gap-1.5">
          {WOCHENTAG_KURZ.map((label, i) => {
            const aktiv = wochentage.includes(i)
            return (
              <button
                key={label}
                onClick={() => {
                  const neu = aktiv
                    ? wochentage.filter((t) => t !== i)
                    : [...wochentage, i].sort((a, b) => a - b)
                  speichere({ trainingsWochentage: neu })
                }}
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
        {wochentage.length !== tage && (
          <p className="mt-2 text-xs text-warn">
            {wochentage.length} Wochentag{wochentage.length === 1 ? '' : 'e'} gewählt, aber {tage}{' '}
            Trainingstage pro Woche eingestellt.
          </p>
        )}
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Der Plan hebt den heutigen Trainingstag auf der Startseite hervor.
        </p>
      </section>

      <section className="rounded-2xl border border-line bg-elev p-5 backdrop-blur-md">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted">
          Satzpause & Signale
        </h2>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-txt3">Pause zwischen Sätzen</span>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => speichere({ pausenSek: Math.max(15, pause - 15) })}
              aria-label="Pause verringern"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-elev text-xl text-txt2 active:bg-elev2"
            >
              −
            </button>
            <span className="min-w-16 text-center">
              <span className="text-lg font-semibold tabular-nums">{formatiereSekunden(pause)}</span>
              <span className="block text-[10px] leading-none text-muted">Min.</span>
            </span>
            <button
              onClick={() => speichere({ pausenSek: Math.min(600, pause + 15) })}
              aria-label="Pause erhöhen"
              className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-elev text-xl text-txt2 active:bg-elev2"
            >
              +
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Standard für {ZIEL_KONFIG[ziel].label}: {formatiereSekunden(standardPause)} Min.
          {profil?.pausenSek !== undefined && profil.pausenSek !== standardPause && (
            <>
              {' '}
              <button
                onClick={() => speichere({ pausenSek: undefined })}
                className="text-neon-cyan underline underline-offset-2"
              >
                Zurücksetzen
              </button>
            </>
          )}
        </p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-sm text-txt3">Signaltöne (Vibration bleibt an)</span>
          <div className="flex gap-2">
            {(
              [
                [false, 'An'],
                [true, 'Aus'],
              ] as const
            ).map(([aus, label]) => (
              <button
                key={label}
                onClick={() => speichere({ tonAus: aus })}
                className={`h-11 w-16 rounded-xl border text-sm font-medium transition-colors ${
                  (profil?.tonAus ?? false) === aus
                    ? 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan'
                    : 'border-line bg-elev text-txt3'
               }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {zone ? (
        <section className="rounded-2xl border border-neon-cyan/25 bg-neon-cyan/5 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-neon-cyan">
            Deine GA1-Pulszone
          </h2>
          <p className="mt-2">
            <span className="text-5xl font-bold text-neon-cyan">
              {zone.von}–{zone.bis}
            </span>
            <span className="ml-2 text-txt3">bpm</span>
          </p>
          <p className="mt-2 text-sm leading-relaxed text-txt3">
            60–75 % {profil?.ruhePuls ? 'der Herzfrequenzreserve (Karvonen)' : 'der maximalen Herzfrequenz'} bei
            HFmax {zone.hfMax} bpm.
          </p>
        </section>
      ) : (
        <p className="px-1 text-sm text-muted">
          Trage dein Alter ein, um deine persönliche GA1-Pulszone zu sehen.
        </p>
      )}

      <Datensicherung />
    </div>
  )
}
