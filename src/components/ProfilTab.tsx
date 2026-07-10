import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Trainingsziel, UserProfile } from '../db/types'
import { ZIEL_KONFIG } from '../logic/einRM'
import { ga1Zone } from '../logic/puls'
import Datensicherung from './Datensicherung'

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
      <span className="text-sm text-gray-400">{label}</span>
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
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-lg text-gray-100 placeholder-gray-600 outline-none focus:border-white/25"
        />
        <span className="w-12 shrink-0 text-sm text-gray-500">{einheit}</span>
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

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-500">
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

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500">
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
                  : 'border-white/10 bg-white/5 text-gray-300'
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

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-gray-500">
          Trainingstage pro Woche
        </h2>
        <div className="flex gap-2">
          {[2, 3, 4, 5].map((t) => (
            <button
              key={t}
              onClick={() => speichere({ trainingstageProWoche: t })}
              className={`h-14 flex-1 rounded-xl border text-xl font-bold transition-colors ${
                tage === t
                  ? 'border-neon-lime/50 bg-neon-lime/10 text-neon-lime'
                  : 'border-white/10 bg-white/5 text-gray-300'
              }`}
            >
              {t}
            </button>
          ))}
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
            <span className="ml-2 text-gray-400">bpm</span>
          </p>
          <p className="mt-2 text-sm leading-relaxed text-gray-400">
            60–75 % {profil?.ruhePuls ? 'der Herzfrequenzreserve (Karvonen)' : 'der maximalen Herzfrequenz'} bei
            HFmax {zone.hfMax} bpm.
          </p>
        </section>
      ) : (
        <p className="px-1 text-sm text-gray-500">
          Trage dein Alter ein, um deine persönliche GA1-Pulszone zu sehen.
        </p>
      )}

      <Datensicherung />
    </div>
  )
}
