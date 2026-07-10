import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { KRAFT_UEBUNGEN } from '../db/seed'
import type { SelbstcheckAntworten, UserProfile } from '../db/types'
import { einRMProUebung } from '../logic/einRM'
import {
  berechneRatios,
  bewerteHaltung,
  type AmpelStatus,
  type MusterErgebnis,
  type RatioErgebnis,
} from '../logic/analyse'

const UEBUNGS_NAME = Object.fromEntries(KRAFT_UEBUNGEN.map((u) => [u.id, u.name]))

const AMPEL: Record<AmpelStatus, { punkt: string; label: string; text: string }> = {
  ok: { punkt: 'bg-emerald-400', label: 'ok', text: 'text-emerald-400' },
  leicht: { punkt: 'bg-amber-400', label: 'leicht', text: 'text-amber-400' },
  deutlich: { punkt: 'bg-red-400', label: 'deutlich', text: 'text-red-400' },
  fehlend: { punkt: 'bg-gray-600', label: 'Daten fehlen', text: 'text-gray-500' },
}

const zahl = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 2 })

function RatioKarte({ ergebnis }: { ergebnis: RatioErgebnis }) {
  const a = AMPEL[ergebnis.status]
  const k = ergebnis.konfig
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold">{k.name}</p>
        <span className={`flex shrink-0 items-center gap-2 text-sm font-medium ${a.text}`}>
          <span className={`h-2.5 w-2.5 rounded-full ${a.punkt}`} />
          {a.label}
        </span>
      </div>
      {ergebnis.status === 'fehlend' ? (
        <p className="mt-2 text-sm text-gray-400">
          Für diese Analyse fehlt dein Maximalgewicht:{' '}
          <span className="text-gray-200">
            {ergebnis.fehlendeExerciseIds.map((id) => UEBUNGS_NAME[id] ?? id).join(', ')}
          </span>
          . Erfasse es im Kraft-Katalog.
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-gray-500">
            Ratio {zahl(ergebnis.ratio!)} · Richtwert {zahl(k.richtwert[0])}–{zahl(k.richtwert[1])}
            {ergebnis.status !== 'ok' && ` · ${ergebnis.abweichungProzent} % daneben`}
          </p>
          {ergebnis.richtung && (
            <p className="mt-2 text-sm leading-relaxed text-gray-300">
              {ergebnis.richtung === 'zaehler_schwach'
                ? k.deutungZaehlerSchwach
                : k.deutungNennerSchwach}
            </p>
          )}
        </>
      )}
    </div>
  )
}

const MUSTER_INFO: Record<
  MusterErgebnis['muster'],
  { titel: string; untertitel: string; erklaerung: string }
> = {
  rundruecken: {
    titel: 'Rundrücken',
    untertitel: 'oberes gekreuztes Syndrom',
    erklaerung:
      'Typisch bei viel PC-Arbeit: verkürzte Brust und Nacken, schwacher oberer Rücken. Hilfreich: Zugübungen (Rudern, Reverse Fly, Latzug) stärken, Brust dehnen, Brustwirbelsäule mobilisieren.',
  },
  hohlkreuz: {
    titel: 'Hohlkreuz',
    untertitel: 'unteres gekreuztes Syndrom',
    erklaerung:
      'Typisch bei langem Sitzen: verkürzte Hüftbeuger, schwacher Bauch und Gesäß. Hilfreich: Bauch- und Gesäßübungen stärken, Hüftbeuger und vordere Oberschenkel dehnen.',
  },
}

const STUFEN: Record<
  MusterErgebnis['stufe'],
  { label: string; klasse: string; balken: string }
> = {
  unauffaellig: { label: 'unauffällig', klasse: 'text-emerald-400', balken: 'bg-emerald-400' },
  moeglich: { label: 'möglich', klasse: 'text-amber-400', balken: 'bg-amber-400' },
  wahrscheinlich: { label: 'wahrscheinlich', klasse: 'text-red-400', balken: 'bg-red-400' },
}

function MusterKarte({ ergebnis }: { ergebnis: MusterErgebnis }) {
  const info = MUSTER_INFO[ergebnis.muster]
  const stufe = STUFEN[ergebnis.stufe]
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{info.titel}</p>
          <p className="text-xs text-gray-500">{info.untertitel}</p>
        </div>
        <span className={`shrink-0 text-sm font-semibold ${stufe.klasse}`}>{stufe.label}</span>
      </div>

      {ergebnis.datenlage === 'keine' ? (
        <p className="mt-3 text-sm text-gray-400">
          Noch keine Datenbasis: Fülle den Selbstcheck unten aus oder erfasse Maximalgewichte im
          Kraft-Katalog.
        </p>
      ) : (
        <>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full transition-all ${stufe.balken}`}
              style={{ width: `${ergebnis.score}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500">Muster-Score: {ergebnis.score} / 100</p>
          {ergebnis.signale.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-gray-300">
              {ergebnis.signale.map((s) => (
                <li key={s} className="flex gap-2">
                  <span className="text-gray-600">•</span>
                  {s}
                </li>
              ))}
            </ul>
          )}
          {ergebnis.stufe !== 'unauffaellig' && (
            <p className="mt-3 text-sm leading-relaxed text-gray-400">{info.erklaerung}</p>
          )}
          {ergebnis.datenlage === 'nur_selbstcheck' && (
            <p className="mt-2 text-xs text-gray-500">
              Basis: nur Selbstcheck – erfasse Maximalgewichte für eine genauere Einschätzung.
            </p>
          )}
        </>
      )}
    </div>
  )
}

const SITZ_OPTIONEN = [
  { label: 'unter 4 Std.', wert: 3 },
  { label: '4–6 Std.', wert: 5 },
  { label: '6–9 Std.', wert: 7 },
  { label: 'über 9 Std.', wert: 10 },
]

const JA_NEIN_FRAGEN: { feld: keyof SelbstcheckAntworten; frage: string }[] = [
  {
    feld: 'wandtestKopfErreichtWand',
    frage:
      'Wandtest: Mit dem Rücken zur Wand (Fersen ca. 5 cm davor) – berührt dein Hinterkopf die Wand, ohne den Kopf in den Nacken zu legen?',
  },
  { feld: 'schulternFallenVorn', frage: 'Fallen deine Schultern im entspannten Stand sichtbar nach vorn?' },
  { feld: 'beckenKipptVorn', frage: 'Kippt dein Becken nach vorn (verstärktes Hohlkreuz, Bauch schiebt raus)?' },
  { feld: 'nackenVerspannungen', frage: 'Hast du häufiger Verspannungen in Nacken oder Schultern?' },
  { feld: 'lwsBeschwerden', frage: 'Hast du häufiger Beschwerden im unteren Rücken?' },
]

function Selbstcheck({ profil }: { profil: UserProfile | undefined }) {
  const check = profil?.selbstcheck
  const speichere = (patch: Partial<SelbstcheckAntworten>) =>
    void db.userProfile.put({
      trainingsziel: 'hypertrophie',
      trainingstageProWoche: 3,
      ...profil,
      id: 1,
      selbstcheck: { ...check, ...patch, datum: new Date().toISOString().slice(0, 10) },
    })

  const knopf = (aktiv: boolean) =>
    `rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
      aktiv
        ? 'border-neon-cyan/50 bg-neon-cyan/10 text-neon-cyan'
        : 'border-white/10 bg-white/5 text-gray-400'
    }`

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
      <p className="text-sm text-gray-300">Wie viele Stunden sitzt du an einem typischen Tag?</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {SITZ_OPTIONEN.map((o) => (
          <button
            key={o.wert}
            onClick={() => speichere({ sitzStundenProTag: o.wert })}
            className={knopf(check?.sitzStundenProTag === o.wert)}
          >
            {o.label}
          </button>
        ))}
      </div>

      {JA_NEIN_FRAGEN.map((f) => (
        <div key={f.feld} className="mt-4 border-t border-white/5 pt-4">
          <p className="text-sm leading-relaxed text-gray-300">{f.frage}</p>
          <div className="mt-2 flex gap-2">
            {(['ja', 'nein'] as const).map((antwort) => (
              <button
                key={antwort}
                onClick={() => speichere({ [f.feld]: antwort })}
                className={knopf(check?.[f.feld] === antwort)}
              >
                {antwort === 'ja' ? 'Ja' : 'Nein'}
              </button>
            ))}
          </div>
        </div>
      ))}

      {check?.datum && (
        <p className="mt-4 text-xs text-gray-500">
          Zuletzt aktualisiert: {check.datum.slice(8, 10)}.{check.datum.slice(5, 7)}.
          {check.datum.slice(0, 4)}
        </p>
      )}
    </div>
  )
}

export default function AnalyseTab() {
  const maxWeights = useLiveQuery(() => db.maxWeights.toArray(), []) ?? []
  const profil = useLiveQuery(() => db.userProfile.get(1), [])

  const ratios = berechneRatios(einRMProUebung(maxWeights))
  const muster = bewerteHaltung(ratios, profil?.selbstcheck)

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
          Haltungsmuster
        </h2>
        <div className="space-y-3">
          {muster.map((m) => (
            <MusterKarte key={m.muster} ergebnis={m} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
          Kraftverhältnisse (aus deinen 1RM-Werten)
        </h2>
        <div className="space-y-3">
          {ratios.map((r) => (
            <RatioKarte key={r.konfig.id} ergebnis={r} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">
          Haltungs-Selbstcheck
        </h2>
        <Selbstcheck profil={profil} />
      </section>

      <p className="px-1 pb-2 text-xs leading-relaxed text-gray-600">
        Hinweis: Alle Auswertungen sind Schätzwerte auf Basis deiner Eingaben und ersetzen keine
        physiotherapeutische oder ärztliche Diagnose.
      </p>
    </div>
  )
}
