// Zuordnung der Plan-Tage zu festen Wochentagen (z. B. Mo/Mi/Fr) und
// Erkennung des heutigen Trainingstags für die „Heute“-Hervorhebung.
export const WOCHENTAG_KURZ = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const
export const WOCHENTAG_LANG = [
  'Montag',
  'Dienstag',
  'Mittwoch',
  'Donnerstag',
  'Freitag',
  'Samstag',
  'Sonntag',
] as const

// 0 = Montag … 6 = Sonntag
export function wochentagIndex(isoDatum: string): number {
  return (new Date(`${isoDatum}T12:00:00`).getDay() + 6) % 7
}

// Gleichmäßig verteilte Standard-Wochentage je Anzahl Trainingstage
const STANDARD: Record<number, number[]> = {
  2: [0, 3], // Mo, Do
  3: [0, 2, 4], // Mo, Mi, Fr
  4: [0, 1, 3, 4], // Mo, Di, Do, Fr
  5: [0, 1, 2, 3, 4], // Mo–Fr
}

export function standardWochentage(anzahl: number): number[] {
  return STANDARD[Math.min(5, Math.max(2, Math.round(anzahl)))] ?? STANDARD[3]
}

function sortiert(wochentage: number[]): number[] {
  return [...new Set(wochentage)].sort((a, b) => a - b)
}

// Plan-Tag (1-basiert), der heute dran ist – null an trainingsfreien Tagen.
// Sind mehr Wochentage gewählt als der Plan Tage hat, wiederholt sich der Plan.
export function heutigerPlanTag(
  wochentage: number[],
  heuteIso: string,
  tageAnzahl: number,
): number | null {
  if (tageAnzahl <= 0) return null
  const idx = sortiert(wochentage).indexOf(wochentagIndex(heuteIso))
  if (idx === -1) return null
  return (idx % tageAnzahl) + 1
}

// Wochentag-Kürzel eines Plan-Tags (1-basiert) – null, wenn keinem Tag zugeordnet
export function wochentagFuerPlanTag(wochentage: number[], tagNr: number): string | null {
  const w = sortiert(wochentage)[tagNr - 1]
  return w === undefined ? null : WOCHENTAG_KURZ[w]
}
