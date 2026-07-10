// Ziele & Fortschritt nach vorgehensplan-fitness-app.md Phase 6:
// Der Fortschritt wird automatisch aus MaxWeight und WorkoutLog abgeleitet.
import type { Goal, MaxWeight, WorkoutLog } from '../db/types'
import { geschaetztes1RM } from './einRM'

export interface ZielFortschritt {
  aktuell: number | null // Bestwert bisher (kg 1RM, Min. oder km)
  prozent: number // 0–100, gerundet und gedeckelt
  erreicht: boolean
  einheit: string
  verlauf: { datum: string; wert: number }[] // Bestwert je Datum, aufsteigend
}

export const ZIEL_TYP_LABELS: Record<Goal['typ'], string> = {
  kraft_gewicht: 'Kraft-Zielgewicht (1RM)',
  cardio_zeit: 'Cardio-Zeit (eine Einheit)',
  cardio_distanz: 'Cardio-Distanz (eine Einheit)',
}

export const ZIEL_EINHEIT: Record<Goal['typ'], string> = {
  kraft_gewicht: 'kg',
  cardio_zeit: 'Min.',
  cardio_distanz: 'km',
}

// Bestwert je Datum: mehrere Werte am selben Tag werden aufs Maximum verdichtet
function verdichteProDatum(punkte: { datum: string; wert: number }[]) {
  const proDatum = new Map<string, number>()
  for (const p of punkte) {
    proDatum.set(p.datum, Math.max(proDatum.get(p.datum) ?? 0, p.wert))
  }
  return [...proDatum.entries()]
    .map(([datum, wert]) => ({ datum, wert }))
    .sort((a, b) => a.datum.localeCompare(b.datum))
}

// Rohwerte für ein Ziel sammeln: Kraft aus MaxWeight-Verlauf UND Trainingssätzen
// (jeder Satz liefert ein geschätztes 1RM), Cardio aus den Workout-Einträgen
function sammlePunkte(
  ziel: Pick<Goal, 'typ' | 'referenz'>,
  maxWeights: MaxWeight[],
  logs: WorkoutLog[],
): { datum: string; wert: number }[] {
  const punkte: { datum: string; wert: number }[] = []
  if (ziel.typ === 'kraft_gewicht') {
    for (const m of maxWeights) {
      if (m.exerciseId === ziel.referenz) {
        punkte.push({ datum: m.datum, wert: geschaetztes1RM(m.gewichtKg, m.wiederholungen) })
      }
    }
    for (const log of logs) {
      for (const e of log.eintraege) {
        if (e.art !== 'kraft' || e.exerciseId !== ziel.referenz) continue
        for (const s of e.saetze) {
          punkte.push({ datum: log.datum, wert: geschaetztes1RM(s.gewichtKg, s.wdh) })
        }
      }
    }
  } else {
    for (const log of logs) {
      for (const e of log.eintraege) {
        if (e.art !== 'cardio' || e.cardioType !== ziel.referenz) continue
        const wert = ziel.typ === 'cardio_zeit' ? e.dauerMin : e.distanzKm
        if (wert && wert > 0) punkte.push({ datum: log.datum, wert })
      }
    }
  }
  return punkte
}

export function berechneZielFortschritt(
  ziel: Pick<Goal, 'typ' | 'referenz' | 'zielwert'>,
  maxWeights: MaxWeight[],
  logs: WorkoutLog[],
): ZielFortschritt {
  const verlauf = verdichteProDatum(sammlePunkte(ziel, maxWeights, logs))
  const aktuell = verlauf.length > 0 ? Math.max(...verlauf.map((p) => p.wert)) : null
  const prozent =
    aktuell !== null && ziel.zielwert > 0
      ? Math.min(100, Math.round((aktuell / ziel.zielwert) * 100))
      : 0
  return {
    aktuell,
    prozent,
    erreicht: aktuell !== null && aktuell >= ziel.zielwert,
    einheit: ZIEL_EINHEIT[ziel.typ],
    verlauf,
  }
}

// Verbleibende Tage bis zum Zieldatum (negativ = überfällig), null ohne Datum
export function tageBisZiel(zieldatum: string | undefined, heute: string): number | null {
  if (!zieldatum) return null
  const MS_PRO_TAG = 24 * 60 * 60 * 1000
  return Math.round(
    (new Date(`${zieldatum}T12:00:00`).getTime() - new Date(`${heute}T12:00:00`).getTime()) /
      MS_PRO_TAG,
  )
}
