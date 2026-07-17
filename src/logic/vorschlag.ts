// Vorschlags-Engine nach vorgehensplan-fitness-app.md Abschnitt 5.3:
// Aus Dysbalance-Flags, Haltungsmustern und 1RM-Werten wird ein Wochenplan generiert.
import type { Trainingsziel, WorkoutLog } from '../db/types'
import type { MusterErgebnis, RatioErgebnis } from './analyse'
import { deloadGewicht, deloadSaetze } from './deload'
import { ZIEL_KONFIG } from './einRM'
import { progressionsVorschlag, type ProgressionsVorschlag } from './progression'

export interface KraftVorschlag {
  exerciseId: string
  // Basis-Übung des Plans (falls über Anpassung ersetzt ≠ exerciseId);
  // nur gesetzt für Übungen aus dem Basisplan, die angepasst werden dürfen
  basisId?: string
  saetze: number
  wdh: [number, number]
  gewichtKg: number | null // null = noch kein Maximalgewicht erfasst
  prioritaet: 'hoch' | 'normal' | 'erhaltung'
  progression?: ProgressionsVorschlag['aktion']
  deload?: boolean
  grund?: string
}

export interface CardioVorschlag {
  methode: 'ga1' | 'intervall'
  titel: string
  beschreibung: string
}

export interface DehnVorschlag {
  stretchId: string
  grund?: string
}

export interface TrainingsTag {
  nr: number
  name: string
  kraft: KraftVorschlag[]
  cardio: CardioVorschlag
  dehnen: DehnVorschlag[]
}

export interface Wochenplan {
  tage: TrainingsTag[]
  hinweise: string[]
}

export interface WochenplanInput {
  einRMs: Record<string, number>
  ratios: RatioErgebnis[]
  muster: MusterErgebnis[]
  trainingsziel: Trainingsziel
  trainingstageProWoche: number
  ga1Zone?: { von: number; bis: number } | null
  logs?: WorkoutLog[] // Protokoll für die automatische Progression
  deload?: boolean // Entlastungswoche: reduziertes Volumen und Gewicht
  // Plananpassungen: Basis-exerciseId → Ersatz-exerciseId oder null (ausgeblendet)
  planAnpassungen?: Record<string, string | null>
}

// Zwei alternierende Ganzkörper-Einheiten als Basis
const TAG_A = ['brustpresse', 'rudermaschine', 'beinpresse', 'beinbeuger', 'crunch_maschine']
const TAG_B = [
  'schulterpresse',
  'latzug',
  'beinstrecker',
  'glute_kickback',
  'rueckenstrecker_maschine',
]
const PUSH_UEBUNGEN = new Set(['brustpresse', 'butterfly', 'schulterpresse', 'dip_maschine'])

// Dehnvorschläge je Dysbalance: die typischerweise verkürzten Gegenspieler (5.3)
const DEHNEN_BEI_DYSBALANCE: Record<string, Record<'zaehler_schwach' | 'nenner_schwach', string[]>> = {
  knie_beuger_strecker: {
    zaehler_schwach: ['beinbeuger_stehend', 'br_beinbeuger'],
    nenner_schwach: ['quadrizeps_stehend', 'br_quadrizeps'],
  },
  zug_druck_horizontal: {
    zaehler_schwach: ['brust_tuerrahmen', 'br_bws'],
    nenner_schwach: ['schulter_ueberkreuz'],
  },
  zug_druck_vertikal: {
    zaehler_schwach: ['nacken_seitlich'],
    nenner_schwach: ['lat_kniestand', 'br_lat'],
  },
  abduktion_adduktion: {
    zaehler_schwach: ['adduktoren_schmetterling'],
    nenner_schwach: ['br_it_band', 'gesaess_liegend'],
  },
  bauch_ruecken: {
    zaehler_schwach: ['hueftbeuger_ausfallschritt', 'knie_zur_brust'],
    nenner_schwach: ['katze_kuh'],
  },
}

export function erstelleWochenplan(input: WochenplanInput): Wochenplan {
  const { einRMs, ratios, muster, trainingsziel, ga1Zone, logs = [], deload = false } = input
  const anpassungen = input.planAnpassungen ?? {}
  const tageAnzahl = Math.min(5, Math.max(2, input.trainingstageProWoche))
  const zielKonfig = ZIEL_KONFIG[trainingsziel]
  const hinweise: string[] = []

  // Plananpassung (5.3/Feature): Basis-Übungen ersetzen oder ausblenden.
  // Rückgabe je Basis-Übung: die anzuzeigende Id plus die Basis-Id (für die UI).
  const wendeAnpassung = (ids: string[]): { basisId: string; id: string }[] =>
    ids.flatMap((basisId) => {
      if (!(basisId in anpassungen)) return [{ basisId, id: basisId }]
      const ersatz = anpassungen[basisId]
      return ersatz === null ? [] : [{ basisId, id: ersatz }]
    })

  // Dysbalance-Flags auswerten: schwache Seite priorisieren, starke auf Erhaltung
  const schwach = new Map<string, string>() // exerciseId → Grund
  const erhaltung = new Map<string, string>()
  const dehnenWegenDysbalance: DehnVorschlag[] = []
  for (const r of ratios) {
    if (!r.richtung || r.status === 'ok' || r.status === 'fehlend') continue
    const schwachId =
      r.richtung === 'zaehler_schwach' ? r.konfig.zaehlerExerciseId : r.konfig.nennerExerciseId
    const starkId =
      r.richtung === 'zaehler_schwach' ? r.konfig.nennerExerciseId : r.konfig.zaehlerExerciseId
    const grund = `${r.konfig.name}: ${r.abweichungProzent} % unter Richtwert (${r.status})`
    schwach.set(schwachId, grund)
    erhaltung.set(starkId, `${r.konfig.name}: stärkere Seite auf Erhaltung`)
    for (const stretchId of DEHNEN_BEI_DYSBALANCE[r.konfig.id]?.[r.richtung] ?? []) {
      dehnenWegenDysbalance.push({ stretchId, grund: r.konfig.name })
    }
  }

  const rundruecken = muster.find((m) => m.muster === 'rundruecken' && m.stufe !== 'unauffaellig')
  const hohlkreuz = muster.find((m) => m.muster === 'hohlkreuz' && m.stufe !== 'unauffaellig')

  const baueKraft = (exerciseId: string, extraGrund?: string): KraftVorschlag => {
    // Automatische Progression: doppelte Progression auf 1RM-Basis
    const prog = progressionsVorschlag(exerciseId, trainingsziel, einRMs[exerciseId] ?? null, logs)
    const vorschlag: KraftVorschlag = {
      exerciseId,
      saetze: 3,
      wdh: zielKonfig.wdh,
      gewichtKg: prog.gewichtKg,
      prioritaet: 'normal',
      progression: prog.aktion,
      grund:
        extraGrund ??
        (prog.aktion === 'steigern' || prog.aktion === 'reduzieren'
          ? (prog.grund ?? undefined)
          : undefined),
    }
    if (schwach.has(exerciseId)) {
      vorschlag.saetze += 1
      vorschlag.prioritaet = 'hoch'
      vorschlag.grund = schwach.get(exerciseId)
    } else if (erhaltung.has(exerciseId)) {
      vorschlag.saetze = 2
      vorschlag.prioritaet = 'erhaltung'
      vorschlag.grund = erhaltung.get(exerciseId)
    }
    // Rundrücken: Drückübungen zurücknehmen (Ziel: 2:1 Zug- zu Drückvolumen)
    if (rundruecken && PUSH_UEBUNGEN.has(exerciseId) && vorschlag.prioritaet !== 'hoch') {
      vorschlag.saetze = Math.min(vorschlag.saetze, 2)
      vorschlag.prioritaet = 'erhaltung'
      vorschlag.grund = 'Rundrücken: Drückvolumen reduziert (2:1 Zug zu Druck)'
    }
    // Deload-Woche: Volumen und Gewicht senken, Progression aussetzen
    if (deload) {
      vorschlag.saetze = deloadSaetze(vorschlag.saetze)
      vorschlag.gewichtKg = deloadGewicht(vorschlag.gewichtKg)
      vorschlag.progression = undefined
      vorschlag.deload = true
      vorschlag.grund = 'Deload: reduziertes Volumen und Gewicht zur Regeneration'
    }
    return vorschlag
  }

  const fuegeHinzuOderVerstaerke = (
    liste: KraftVorschlag[],
    exerciseId: string,
    grund: string,
  ) => {
    const vorhanden = liste.find((k) => k.exerciseId === exerciseId)
    if (vorhanden) {
      if (vorhanden.prioritaet !== 'hoch') {
        vorhanden.saetze += 1
        vorhanden.prioritaet = 'hoch'
        vorhanden.grund = grund
      }
    } else {
      liste.push({ ...baueKraft(exerciseId), prioritaet: 'hoch', grund })
    }
  }

  const tage: TrainingsTag[] = []
  for (let i = 0; i < tageAnzahl; i++) {
    const istTagA = i % 2 === 0
    const kraft = wendeAnpassung(istTagA ? TAG_A : TAG_B).map(({ basisId, id }) => {
      const v = baueKraft(id)
      v.basisId = basisId
      return v
    })

    // Schwache Übungen, die nicht im Basisplan stehen (z. B. Abduktoren), an A-Tagen ergänzen
    // (in der Deload-Woche kein Zusatzvolumen)
    if (istTagA && !deload) {
      for (const [id, grund] of schwach) {
        if (!TAG_A.includes(id) && !TAG_B.includes(id)) fuegeHinzuOderVerstaerke(kraft, id, grund)
      }
    }

    // Haltungsblöcke (5.3) – in der Deload-Woche ausgesetzt
    if (rundruecken && !deload) {
      fuegeHinzuOderVerstaerke(
        kraft,
        'reverse_fly',
        `Rundrücken (${rundruecken.stufe}): zusätzliches Zugvolumen`,
      )
    }
    if (hohlkreuz && !deload) {
      fuegeHinzuOderVerstaerke(
        kraft,
        'crunch_maschine',
        `Hohlkreuz (${hohlkreuz.stufe}): Bauch in jeder Einheit`,
      )
      fuegeHinzuOderVerstaerke(
        kraft,
        'glute_kickback',
        `Hohlkreuz (${hohlkreuz.stufe}): Gesäß in jeder Einheit`,
      )
    }

    // Dehnen: Basis-Mobilität + verkürzte Gegenspieler + Haltungsblöcke
    const dehnen: DehnVorschlag[] = [{ stretchId: 'kindhaltung' }]
    dehnen.push(...dehnenWegenDysbalance)
    if (rundruecken) {
      dehnen.push(
        { stretchId: 'brust_tuerrahmen', grund: 'Rundrücken: Brust dehnen' },
        { stretchId: 'br_bws', grund: 'Rundrücken: BWS mobilisieren' },
      )
    }
    if (hohlkreuz) {
      dehnen.push({ stretchId: 'hueftbeuger_ausfallschritt', grund: 'Hohlkreuz: Hüftbeuger dehnen' })
    }
    const gesehen = new Set<string>()
    const dehnenDedupe = dehnen.filter((d) =>
      gesehen.has(d.stretchId) ? false : (gesehen.add(d.stretchId), true),
    )

    // Cardio: GA1 und 60/120-Intervalle im Wechsel (5.1b)
    const cardio: CardioVorschlag =
      i % 2 === 0
        ? {
            methode: 'ga1',
            titel: 'GA1 – Grundlagenausdauer',
            beschreibung: `30–45 Min lockeres Tempo (Laufband, Ergometer oder Crosstrainer)${
              ga1Zone ? `, Pulszone ${ga1Zone.von}–${ga1Zone.bis} bpm` : ''
            }`,
          }
        : {
            methode: 'intervall',
            titel: '60/120-Intervalle',
            beschreibung:
              '10 Min aufwärmen, dann 6–10 Runden: 60 s hohe Belastung / 120 s lockere Erholung',
          }

    tage.push({
      nr: i + 1,
      name: `Ganzkörper ${istTagA ? 'A' : 'B'}`,
      kraft,
      cardio,
      dehnen: dehnenDedupe.slice(0, 6),
    })
  }

  if (deload) {
    hinweise.push(
      'Deload-Woche aktiv: reduziertes Volumen und Gewicht. Nutze die Woche zur Erholung – nächste Woche geht die Progression normal weiter.',
    )
  }
  if (hohlkreuz && !deload) {
    hinweise.push(
      'Hohlkreuz-Muster: Dehne die Hüftbeuger täglich – auch an trainingsfreien Tagen (Ausfallschritt, 40 s je Seite).',
    )
  }
  if (rundruecken) {
    hinweise.push(
      'Rundrücken-Muster: Achte im Alltag auf Bildschirmhöhe und mache stündlich eine kurze Aufsteh-Pause.',
    )
  }
  if (Object.keys(einRMs).length === 0) {
    hinweise.push(
      'Noch keine Maximalgewichte erfasst – der Plan zeigt Gewichte, sobald du sie im Kraft-Katalog einträgst.',
    )
  }
  if (!ga1Zone) {
    hinweise.push('Trage dein Alter im Profil ein, um deine persönliche GA1-Pulszone im Plan zu sehen.')
  }

  return { tage, hinweise }
}
