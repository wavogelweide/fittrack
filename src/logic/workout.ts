// Workout-Modus-Logik nach vorgehensplan-fitness-app.md Phase 5:
// Entwürfe aus dem Wochenplan vorbefüllen, Intervall-Phasen berechnen,
// erledigte Einträge in ein WorkoutLog überführen.
import type { CardioTypeId, WorkoutEintrag, WorkoutLog } from '../db/types'
import type { TrainingsTag } from './vorschlag'

export interface SatzEntwurf {
  gewichtKg: number | null // null = noch kein Arbeitsgewicht bekannt
  wdh: number
  erledigt: boolean
}

export interface KraftEntwurf {
  exerciseId: string
  saetze: SatzEntwurf[]
}

export type CardioMethode = 'ga1' | 'intervall'

export interface CardioEntwurf {
  cardioType: CardioTypeId
  methode: CardioMethode
  dauerMin?: number
  distanzKm?: number
  widerstand?: number
  pulsAvg?: number
}

export interface DehnEntwurf {
  stretchId: string
  zielSek: number
  erledigt: boolean
}

export interface WorkoutEntwurf {
  kraft: KraftEntwurf[]
  cardio: CardioEntwurf | null
  dehnen: DehnEntwurf[]
}

export function mittlereWdh(wdh: [number, number]): number {
  return Math.round((wdh[0] + wdh[1]) / 2)
}

// Entwurf aus einem Wochenplan-Tag: Sätze mit Arbeitsgewicht und mittlerer
// Wiederholungszahl vorbefüllen, Dehnübungen mit ihrer Haltedauer
export function entwurfAusTag(
  tag: TrainingsTag,
  halteDauerSek: Record<string, number>,
): WorkoutEntwurf {
  return {
    kraft: tag.kraft.map((k) => ({
      exerciseId: k.exerciseId,
      saetze: Array.from({ length: k.saetze }, () => ({
        gewichtKg: k.gewichtKg,
        wdh: mittlereWdh(k.wdh),
        erledigt: false,
      })),
    })),
    cardio: { cardioType: 'laufband', methode: tag.cardio.methode },
    dehnen: tag.dehnen.map((d) => ({
      stretchId: d.stretchId,
      zielSek: halteDauerSek[d.stretchId] ?? 30,
      erledigt: false,
    })),
  }
}

export function leererEntwurf(): WorkoutEntwurf {
  return { kraft: [], cardio: null, dehnen: [] }
}

// Nur tatsächlich Erledigtes landet im Protokoll; typ = dominanter Inhalt
export function entwurfZuLog(
  entwurf: WorkoutEntwurf,
  datum: string,
): Omit<WorkoutLog, 'id'> | null {
  const eintraege: WorkoutEintrag[] = []
  for (const k of entwurf.kraft) {
    const saetze = k.saetze
      .filter((s) => s.erledigt && s.gewichtKg !== null && s.gewichtKg > 0 && s.wdh > 0)
      .map((s) => ({ gewichtKg: s.gewichtKg!, wdh: s.wdh }))
    if (saetze.length > 0) eintraege.push({ art: 'kraft', exerciseId: k.exerciseId, saetze })
  }
  const c = entwurf.cardio
  if (c && c.dauerMin && c.dauerMin > 0) {
    eintraege.push({
      art: 'cardio',
      cardioType: c.cardioType,
      dauerMin: c.dauerMin,
      distanzKm: c.distanzKm,
      widerstand: c.widerstand,
      pulsAvg: c.pulsAvg,
    })
  }
  for (const d of entwurf.dehnen) {
    if (d.erledigt) eintraege.push({ art: 'dehnen', stretchId: d.stretchId, dauerSek: d.zielSek })
  }
  if (eintraege.length === 0) return null
  const typ = eintraege.some((e) => e.art === 'kraft')
    ? 'kraft'
    : eintraege.some((e) => e.art === 'cardio')
      ? 'cardio'
      : 'dehnen'
  return { datum, typ, eintraege }
}

// --- 60/120-Intervalle (Abschnitt 5.1b): 60 s Belastung / 120 s Erholung ----

export const INTERVALL_BELASTUNG_SEK = 60
export const INTERVALL_ERHOLUNG_SEK = 120
const RUNDE_SEK = INTERVALL_BELASTUNG_SEK + INTERVALL_ERHOLUNG_SEK

export interface IntervallStatus {
  phase: 'belastung' | 'erholung' | 'fertig'
  runde: number // 1-basiert
  verbleibendSek: number // in der aktuellen Phase
  gesamtVerbleibendSek: number
}

export function intervallGesamtSek(runden: number): number {
  return runden * RUNDE_SEK
}

export function intervallStatus(vergangenSek: number, runden: number): IntervallStatus {
  const gesamt = intervallGesamtSek(runden)
  const vergangen = Math.max(0, Math.floor(vergangenSek))
  if (vergangen >= gesamt) {
    return { phase: 'fertig', runde: runden, verbleibendSek: 0, gesamtVerbleibendSek: 0 }
  }
  const rundeIndex = Math.floor(vergangen / RUNDE_SEK)
  const inRunde = vergangen - rundeIndex * RUNDE_SEK
  const belastung = inRunde < INTERVALL_BELASTUNG_SEK
  return {
    phase: belastung ? 'belastung' : 'erholung',
    runde: rundeIndex + 1,
    verbleibendSek: belastung ? INTERVALL_BELASTUNG_SEK - inRunde : RUNDE_SEK - inRunde,
    gesamtVerbleibendSek: gesamt - vergangen,
  }
}

export function formatiereSekunden(sek: number): string {
  const s = Math.max(0, Math.floor(sek))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// --- Zusammenfassung für die Historie ---------------------------------------

export interface WorkoutZusammenfassung {
  kraftUebungen: number
  saetze: number
  volumenKg: number // Summe Gewicht × Wdh.
  cardioMin: number
  dehnUebungen: number
}

export function fasseWorkoutZusammen(log: Pick<WorkoutLog, 'eintraege'>): WorkoutZusammenfassung {
  const z: WorkoutZusammenfassung = {
    kraftUebungen: 0,
    saetze: 0,
    volumenKg: 0,
    cardioMin: 0,
    dehnUebungen: 0,
  }
  for (const e of log.eintraege) {
    if (e.art === 'kraft') {
      z.kraftUebungen += 1
      z.saetze += e.saetze.length
      for (const s of e.saetze) z.volumenKg += s.gewichtKg * s.wdh
    } else if (e.art === 'cardio') {
      z.cardioMin += e.dauerMin
    } else {
      z.dehnUebungen += 1
    }
  }
  return z
}
