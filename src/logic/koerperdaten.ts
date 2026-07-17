// Körperdaten-Verlauf: Gewicht (kg) und Körperfettanteil (%) über die Zeit –
// Erfassung im Profil, Anzeige als Verlaufs-Chart.
import type { KoerperMessung } from '../db/types'

// Chronologisch aufsteigend (für Charts), bei gleichem Datum nach Eintragsfolge
export function sortiereMessungen(messungen: KoerperMessung[]): KoerperMessung[] {
  return [...messungen].sort((a, b) => a.datum.localeCompare(b.datum) || a.id - b.id)
}

export function letzteMessung(messungen: KoerperMessung[]): KoerperMessung | null {
  const sortiert = sortiereMessungen(messungen)
  return sortiert[sortiert.length - 1] ?? null
}

export interface KoerperVeraenderung {
  gewichtKg: number | null // Differenz neueste − älteste Messung
  fettProzent: number | null // Differenz über die Einträge mit KFA-Wert
  seit: string // Datum der ältesten herangezogenen Messung
}

// Veränderung von der ersten zur letzten Messung; null, solange < 2 Messungen
export function veraenderung(messungen: KoerperMessung[]): KoerperVeraenderung | null {
  const sortiert = sortiereMessungen(messungen)
  if (sortiert.length < 2) return null
  const erste = sortiert[0]
  const letzte = sortiert[sortiert.length - 1]
  const mitFett = sortiert.filter((m) => m.fettProzent !== undefined)
  const fett =
    mitFett.length >= 2
      ? Math.round((mitFett[mitFett.length - 1].fettProzent! - mitFett[0].fettProzent!) * 10) / 10
      : null
  return {
    gewichtKg: Math.round((letzte.gewichtKg - erste.gewichtKg) * 10) / 10,
    fettProzent: fett,
    seit: erste.datum,
  }
}

// Gültige Eingabe? Gewicht ist Pflicht, KFA optional (0–75 %)
export function pruefeMessung(
  gewichtKg: number | undefined,
  fettProzent: number | undefined,
): string | null {
  if (gewichtKg === undefined || !Number.isFinite(gewichtKg) || gewichtKg <= 0 || gewichtKg > 400) {
    return 'Bitte ein plausibles Gewicht in kg eingeben.'
  }
  if (fettProzent !== undefined && (!Number.isFinite(fettProzent) || fettProzent <= 0 || fettProzent >= 75)) {
    return 'Der Körperfettanteil muss zwischen 0 und 75 % liegen.'
  }
  return null
}
