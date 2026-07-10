// 1RM-Schätzung und Arbeitsgewicht nach vorgehensplan-fitness-app.md Abschnitt 5.1
import type { MaxWeight, Trainingsziel } from '../db/types'

export function epley1RM(gewichtKg: number, wiederholungen: number): number {
  if (wiederholungen <= 1) return gewichtKg
  return gewichtKg * (1 + wiederholungen / 30)
}

export function brzycki1RM(gewichtKg: number, wiederholungen: number): number {
  if (wiederholungen <= 1) return gewichtKg
  // Formel wird jenseits von ~30 Wdh. instabil (Division gegen 0) → begrenzen
  return (gewichtKg * 36) / (37 - Math.min(wiederholungen, 30))
}

// Geschätztes 1RM als Mittel aus Epley und Brzycki (Abschnitt 5.1)
export function geschaetztes1RM(gewichtKg: number, wiederholungen: number): number {
  return (epley1RM(gewichtKg, wiederholungen) + brzycki1RM(gewichtKg, wiederholungen)) / 2
}

export function rundeAufStufe(kg: number, stufeKg = 2.5): number {
  return Math.round(kg / stufeKg) * stufeKg
}

export const ZIEL_KONFIG: Record<
  Trainingsziel,
  { label: string; prozent: [number, number]; wdh: [number, number] }
> = {
  kraftausdauer: { label: 'Kraftausdauer', prozent: [0.5, 0.6], wdh: [15, 20] },
  hypertrophie: { label: 'Hypertrophie (Muskelaufbau)', prozent: [0.65, 0.75], wdh: [8, 12] },
  kraft: { label: 'Maximalkraft', prozent: [0.8, 0.9], wdh: [3, 6] },
}

export interface Arbeitsgewicht {
  empfohlenKg: number
  vonKg: number
  bisKg: number
  prozent: [number, number]
  wdh: [number, number]
}

// Arbeitsgewicht als %1RM je Trainingsziel, auf gerätesinnvolle Stufen gerundet
export function arbeitsgewicht(
  einRM: number,
  ziel: Trainingsziel,
  stufeKg = 2.5,
): Arbeitsgewicht {
  const k = ZIEL_KONFIG[ziel]
  const mitte = (k.prozent[0] + k.prozent[1]) / 2
  return {
    empfohlenKg: rundeAufStufe(einRM * mitte, stufeKg),
    vonKg: rundeAufStufe(einRM * k.prozent[0], stufeKg),
    bisKg: rundeAufStufe(einRM * k.prozent[1], stufeKg),
    prozent: k.prozent,
    wdh: k.wdh,
  }
}

// 1RM aus dem jüngsten Eintrag des Verlaufs (nie nur den letzten Wert speichern –
// der Verlauf bleibt erhalten, bewertet wird der aktuellste)
// Aktuellstes 1RM je Übung aus dem gesamten Maximalgewicht-Verlauf
export function einRMProUebung(eintraege: MaxWeight[]): Record<string, number> {
  const proUebung: Record<string, MaxWeight[]> = {}
  for (const e of eintraege) (proUebung[e.exerciseId] ??= []).push(e)
  const ergebnis: Record<string, number> = {}
  for (const [exerciseId, liste] of Object.entries(proUebung)) {
    const einRM = aktuellster1RM(liste)
    if (einRM !== null) ergebnis[exerciseId] = einRM
  }
  return ergebnis
}

export function aktuellster1RM(eintraege: MaxWeight[]): number | null {
  if (eintraege.length === 0) return null
  const neuester = [...eintraege].sort(
    (a, b) => a.datum.localeCompare(b.datum) || a.id - b.id,
  )[eintraege.length - 1]
  return geschaetztes1RM(neuester.gewichtKg, neuester.wiederholungen)
}
