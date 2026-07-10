// Dysbalance- und Haltungsanalyse nach vorgehensplan-fitness-app.md Abschnitt 5.2/5.2b
import type { SelbstcheckAntworten } from '../db/types'

// --- Ratio-Engine (5.2): konfigurierbare Muskelpaar-Verhältnisse -------------

export interface RatioKonfig {
  id: string
  name: string
  zaehlerExerciseId: string
  nennerExerciseId: string
  richtwert: [number, number]
  deutungZaehlerSchwach: string
  deutungNennerSchwach: string
}

export const RATIO_KONFIGS: RatioKonfig[] = [
  {
    id: 'knie_beuger_strecker',
    name: 'Beinbeuger : Beinstrecker',
    zaehlerExerciseId: 'beinbeuger',
    nennerExerciseId: 'beinstrecker',
    richtwert: [0.6, 0.75],
    deutungZaehlerSchwach: 'Zu schwache Beinrückseite, oft verkürzte Beinbeuger.',
    deutungNennerSchwach: 'Beinstrecker ungewöhnlich schwach im Verhältnis zur Beinrückseite.',
  },
  {
    id: 'zug_druck_horizontal',
    name: 'Zug : Druck horizontal',
    zaehlerExerciseId: 'rudermaschine',
    nennerExerciseId: 'brustpresse',
    richtwert: [0.9, 1.1],
    deutungZaehlerSchwach: 'Schwacher oberer Rücken, verkürzte Brust – Rundrücken-Tendenz.',
    deutungNennerSchwach: 'Druckkraft fällt gegenüber dem Rücken ab.',
  },
  {
    id: 'zug_druck_vertikal',
    name: 'Zug : Druck vertikal',
    zaehlerExerciseId: 'latzug',
    nennerExerciseId: 'schulterpresse',
    richtwert: [1.0, 1.3],
    deutungZaehlerSchwach: 'Schulter-Dysbalance: vertikale Zugkraft (Latzug) zu schwach.',
    deutungNennerSchwach: 'Schulter-Dysbalance: Schulterpresse fällt gegenüber dem Latzug ab.',
  },
  {
    id: 'abduktion_adduktion',
    name: 'Abduktion : Adduktion',
    zaehlerExerciseId: 'abduktoren_maschine',
    nennerExerciseId: 'adduktoren_maschine',
    richtwert: [0.9, 1.1],
    deutungZaehlerSchwach: 'Hüft-Dysbalance: Abduktoren (Außenseite) zu schwach.',
    deutungNennerSchwach: 'Hüft-Dysbalance: Adduktoren (Innenseite) zu schwach.',
  },
  {
    id: 'bauch_ruecken',
    name: 'Bauch : unterer Rücken',
    zaehlerExerciseId: 'crunch_maschine',
    nennerExerciseId: 'rueckenstrecker_maschine',
    richtwert: [0.7, 1.0],
    deutungZaehlerSchwach: 'Rumpf-Dysbalance: Bauch zu schwach – Hohlkreuz-Tendenz.',
    deutungNennerSchwach: 'Rumpf-Dysbalance: Rückenstrecker zu schwach.',
  },
]

export type AmpelStatus = 'ok' | 'leicht' | 'deutlich' | 'fehlend'

export interface RatioErgebnis {
  konfig: RatioKonfig
  status: AmpelStatus
  ratio: number | null
  abweichungProzent: number
  richtung: 'zaehler_schwach' | 'nenner_schwach' | null
  fehlendeExerciseIds: string[]
}

// Schwellen: >15 % Abweichung vom Richtwert-Bereich = leicht, >30 % = deutlich
export const ABWEICHUNGS_SCHWELLEN: [number, number] = [0.15, 0.3]

export function berechneRatios(
  einRMs: Record<string, number>,
  konfigs: RatioKonfig[] = RATIO_KONFIGS,
  schwellen: [number, number] = ABWEICHUNGS_SCHWELLEN,
): RatioErgebnis[] {
  return konfigs.map((konfig) => {
    const zaehler = einRMs[konfig.zaehlerExerciseId]
    const nenner = einRMs[konfig.nennerExerciseId]
    const fehlende = [
      ...(zaehler ? [] : [konfig.zaehlerExerciseId]),
      ...(nenner ? [] : [konfig.nennerExerciseId]),
    ]
    if (fehlende.length > 0) {
      return {
        konfig,
        status: 'fehlend' as const,
        ratio: null,
        abweichungProzent: 0,
        richtung: null,
        fehlendeExerciseIds: fehlende,
      }
    }
    const ratio = zaehler / nenner
    const [min, max] = konfig.richtwert
    let abweichung = 0
    let richtung: RatioErgebnis['richtung'] = null
    if (ratio < min) {
      abweichung = (min - ratio) / min
      richtung = 'zaehler_schwach'
    } else if (ratio > max) {
      abweichung = (ratio - max) / max
      richtung = 'nenner_schwach'
    }
    const status: AmpelStatus =
      abweichung > schwellen[1] ? 'deutlich' : abweichung > schwellen[0] ? 'leicht' : 'ok'
    return {
      konfig,
      status,
      ratio,
      abweichungProzent: Math.round(abweichung * 100),
      richtung: status === 'ok' ? null : richtung,
      fehlendeExerciseIds: [],
    }
  })
}

// --- Haltungsmuster (5.2b): Ratio-Signale + Selbstcheck → Muster-Score -------

export type HaltungsMuster = 'rundruecken' | 'hohlkreuz'
export type MusterStufe = 'unauffaellig' | 'moeglich' | 'wahrscheinlich'

export interface MusterErgebnis {
  muster: HaltungsMuster
  score: number // 0–100
  stufe: MusterStufe
  signale: string[]
  datenlage: 'keine' | 'nur_selbstcheck' | 'nur_ratios' | 'beides'
}

const MUSTER_SCHWELLEN: [number, number] = [30, 55] // moeglich / wahrscheinlich

function ratioPunkte(
  ratios: RatioErgebnis[],
  ratioId: string,
  punkte: { leicht: number; deutlich: number },
  signalText: string,
  signale: string[],
): number {
  const r = ratios.find((x) => x.konfig.id === ratioId)
  if (!r || r.richtung !== 'zaehler_schwach') return 0
  if (r.status === 'deutlich') {
    signale.push(`${signalText} (deutlich, ${r.abweichungProzent} % unter Richtwert)`)
    return punkte.deutlich
  }
  if (r.status === 'leicht') {
    signale.push(`${signalText} (leicht, ${r.abweichungProzent} % unter Richtwert)`)
    return punkte.leicht
  }
  return 0
}

function sitzPunkte(check: SelbstcheckAntworten | undefined, signale: string[]): number {
  const h = check?.sitzStundenProTag
  if (h === undefined) return 0
  if (h >= 9) {
    signale.push(`Sehr viel Sitzen (${h} Std./Tag)`)
    return 20
  }
  if (h >= 6) {
    signale.push(`Viel Sitzen (${h} Std./Tag)`)
    return 10
  }
  return 0
}

function jaPunkte(
  antwort: 'ja' | 'nein' | undefined,
  erwartet: 'ja' | 'nein',
  punkte: number,
  signalText: string,
  signale: string[],
): number {
  if (antwort !== erwartet) return 0
  signale.push(signalText)
  return punkte
}

export function bewerteHaltung(
  ratios: RatioErgebnis[],
  check: SelbstcheckAntworten | undefined,
): MusterErgebnis[] {
  const checkVorhanden =
    !!check && Object.values(check).some((v) => v !== undefined && v !== null)

  const bewerte = (
    muster: HaltungsMuster,
    ratioIds: string[],
    punkteFn: (signale: string[]) => number,
  ): MusterErgebnis => {
    const signale: string[] = []
    const score = Math.min(100, punkteFn(signale))
    const ratiosVerfuegbar = ratioIds.some(
      (id) => ratios.find((r) => r.konfig.id === id)?.status !== 'fehlend',
    )
    const datenlage = ratiosVerfuegbar
      ? checkVorhanden
        ? ('beides' as const)
        : ('nur_ratios' as const)
      : checkVorhanden
        ? ('nur_selbstcheck' as const)
        : ('keine' as const)
    const stufe: MusterStufe =
      score >= MUSTER_SCHWELLEN[1]
        ? 'wahrscheinlich'
        : score >= MUSTER_SCHWELLEN[0]
          ? 'moeglich'
          : 'unauffaellig'
    return { muster, score, stufe, signale, datenlage }
  }

  return [
    bewerte('rundruecken', ['zug_druck_horizontal'], (signale) => {
      let s = 0
      s += ratioPunkte(
        ratios,
        'zug_druck_horizontal',
        { leicht: 20, deutlich: 35 },
        'Horizontale Zugkraft unter der Druckkraft (Rudern vs. Brustpresse)',
        signale,
      )
      s += sitzPunkte(check, signale)
      s += jaPunkte(
        check?.wandtestKopfErreichtWand,
        'nein',
        25,
        'Wandtest: Hinterkopf erreicht die Wand nicht entspannt',
        signale,
      )
      s += jaPunkte(
        check?.schulternFallenVorn,
        'ja',
        20,
        'Schultern fallen im Stand nach vorn',
        signale,
      )
      s += jaPunkte(
        check?.nackenVerspannungen,
        'ja',
        10,
        'Häufige Verspannungen in Nacken/Schultern',
        signale,
      )
      return s
    }),
    bewerte('hohlkreuz', ['bauch_ruecken', 'knie_beuger_strecker'], (signale) => {
      let s = 0
      s += ratioPunkte(
        ratios,
        'bauch_ruecken',
        { leicht: 20, deutlich: 35 },
        'Bauchkraft unter der Kraft des Rückenstreckers',
        signale,
      )
      s += ratioPunkte(
        ratios,
        'knie_beuger_strecker',
        { leicht: 10, deutlich: 20 },
        'Beinrückseite schwach gegenüber dem Beinstrecker',
        signale,
      )
      s += sitzPunkte(check, signale)
      s += jaPunkte(
        check?.beckenKipptVorn,
        'ja',
        25,
        'Becken kippt nach vorn (verstärktes Hohlkreuz)',
        signale,
      )
      s += jaPunkte(
        check?.lwsBeschwerden,
        'ja',
        10,
        'Häufige Beschwerden im unteren Rücken',
        signale,
      )
      return s
    }),
  ]
}
