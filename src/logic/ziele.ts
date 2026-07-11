// Ziele & Fortschritt nach vorgehensplan-fitness-app.md Phase 6:
// Der Fortschritt wird automatisch aus MaxWeight und WorkoutLog abgeleitet.
// Ziele sind realistische Langzeitziele mit Zieldatum – z. B. eine bestimmte
// Distanz in einer bestimmten Zeit (cardio_leistung) oder ein 1RM-Zielgewicht.
import type { Goal, MaxWeight, WorkoutLog } from '../db/types'
import { geschaetztes1RM } from './einRM'

type ZielDaten = Pick<Goal, 'typ' | 'referenz' | 'zielwert' | 'zielDauerMin'>

export interface ZielFortschritt {
  aktuell: number | null // Bestwert bisher (kg 1RM, km/h, Min. oder km)
  zielVergleichswert: number // womit aktuell/Verlauf verglichen werden (kg, km/h, …)
  prozent: number // 0–100, gerundet; 100 nur bei tatsächlich erreichtem Ziel
  erreicht: boolean
  einheit: string
  verlauf: { datum: string; wert: number }[] // Bestwert je Datum, aufsteigend
}

export const ZIEL_TYP_LABELS: Record<Goal['typ'], string> = {
  kraft_gewicht: 'Kraft-Zielgewicht (1RM)',
  cardio_leistung: 'Cardio-Leistung (Distanz in Zeit)',
  // Alt-Typen aus früheren Versionen – nur noch für bestehende Ziele
  cardio_zeit: 'Cardio-Zeit (eine Einheit)',
  cardio_distanz: 'Cardio-Distanz (eine Einheit)',
}

export const ZIEL_EINHEIT: Record<Goal['typ'], string> = {
  kraft_gewicht: 'kg',
  cardio_leistung: 'km/h',
  cardio_zeit: 'Min.',
  cardio_distanz: 'km',
}

export function geschwindigkeitKmh(distanzKm: number, dauerMin: number): number {
  return distanzKm / (dauerMin / 60)
}

// Vergleichswert des Ziels: bei Leistungszielen die Zielgeschwindigkeit,
// sonst der Zielwert selbst
export function zielVergleichswert(ziel: Omit<ZielDaten, 'referenz'>): number {
  if (ziel.typ === 'cardio_leistung') {
    return ziel.zielDauerMin && ziel.zielDauerMin > 0
      ? geschwindigkeitKmh(ziel.zielwert, ziel.zielDauerMin)
      : 0
  }
  return ziel.zielwert
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
  ziel: ZielDaten,
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
        let wert: number | undefined
        if (ziel.typ === 'cardio_leistung') {
          // Durchschnittsgeschwindigkeit der Einheit
          wert =
            e.distanzKm && e.distanzKm > 0 && e.dauerMin > 0
              ? geschwindigkeitKmh(e.distanzKm, e.dauerMin)
              : undefined
        } else {
          wert = ziel.typ === 'cardio_zeit' ? e.dauerMin : e.distanzKm
        }
        if (wert && wert > 0) punkte.push({ datum: log.datum, wert })
      }
    }
  }
  return punkte
}

// Ist das Leistungsziel in einer einzelnen Einheit tatsächlich geschafft worden?
// (Volle Distanz innerhalb der Zeitvorgabe – Tempo allein reicht nicht.)
function leistungGeschafft(ziel: ZielDaten, logs: WorkoutLog[]): boolean {
  if (!ziel.zielDauerMin || ziel.zielDauerMin <= 0) return false
  return logs.some((log) =>
    log.eintraege.some(
      (e) =>
        e.art === 'cardio' &&
        e.cardioType === ziel.referenz &&
        (e.distanzKm ?? 0) >= ziel.zielwert &&
        e.dauerMin <= ziel.zielDauerMin!,
    ),
  )
}

export function berechneZielFortschritt(
  ziel: ZielDaten,
  maxWeights: MaxWeight[],
  logs: WorkoutLog[],
): ZielFortschritt {
  const verlauf = verdichteProDatum(sammlePunkte(ziel, maxWeights, logs))
  const aktuell = verlauf.length > 0 ? Math.max(...verlauf.map((p) => p.wert)) : null
  const vergleich = zielVergleichswert(ziel)

  const erreicht =
    ziel.typ === 'cardio_leistung'
      ? leistungGeschafft(ziel, logs)
      : aktuell !== null && vergleich > 0 && aktuell >= vergleich

  // Bei Leistungszielen zählt fürs "Geschafft" die volle Distanz in der Zeit –
  // ein hohes Tempo über eine kürzere Strecke zeigt deshalb höchstens 99 %
  const deckel = ziel.typ === 'cardio_leistung' && !erreicht ? 99 : 100
  const prozent =
    aktuell !== null && vergleich > 0
      ? Math.min(erreicht ? 100 : deckel, Math.round((aktuell / vergleich) * 100))
      : 0

  return {
    aktuell,
    zielVergleichswert: vergleich,
    prozent,
    erreicht,
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

// --- Realismus-Einschätzung ---------------------------------------------------
// Faustregel: bis ~0,75 % Steigerung pro Woche ist ein Ziel gut erreichbar,
// bis ~1,5 % ambitioniert, darüber sehr ambitioniert.

export interface AmbitionsBewertung {
  stufe: 'realistisch' | 'ambitioniert' | 'sehr_ambitioniert'
  steigerungProzent: number // insgesamt nötige Steigerung
  proWocheProzent: number
  wochen: number
}

export function bewerteAmbition(
  ziel: Pick<Goal, 'typ' | 'zielwert' | 'zieldatum' | 'zielDauerMin'>,
  aktuell: number | null,
  heute: string,
): AmbitionsBewertung | null {
  const tage = tageBisZiel(ziel.zieldatum, heute)
  const vergleich = zielVergleichswert(ziel)
  if (aktuell === null || aktuell <= 0 || vergleich <= 0 || tage === null || tage < 0) return null
  if (aktuell >= vergleich) return null // schon geschafft – keine Einschätzung nötig

  const wochen = Math.max(1, tage / 7)
  const steigerungProzent = (vergleich / aktuell - 1) * 100
  const proWocheProzent = steigerungProzent / wochen
  const stufe =
    proWocheProzent <= 0.75
      ? 'realistisch'
      : proWocheProzent <= 1.5
        ? 'ambitioniert'
        : 'sehr_ambitioniert'
  return {
    stufe,
    steigerungProzent: Math.round(steigerungProzent * 10) / 10,
    proWocheProzent: Math.round(proWocheProzent * 100) / 100,
    wochen: Math.round(wochen * 10) / 10,
  }
}
