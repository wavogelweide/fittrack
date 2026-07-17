// Tempo-Empfehlungen für 60/120-Intervalle (Abschnitt 5.1b):
// Bevorzugt aus dem Cardio-Leistungsziel abgeleitet – aus Zielgeschwindigkeit
// und Zieldatum wird das Wochenziel interpoliert (lineare Steigerung vom
// aktuellen Niveau zum Ziel), daraus Belastung (115–125 %) und Erholung
// (60–70 %). Ohne Ziel dient das Durchschnittstempo der letzten Einheiten
// als Basis.
import type { CardioTypeId, Goal, WorkoutLog } from '../db/types'
import { geschwindigkeitKmh, tageBisZiel, zielVergleichswert } from './ziele'

export const BELASTUNG_FAKTOR: [number, number] = [1.15, 1.25]
export const ERHOLUNG_FAKTOR: [number, number] = [0.6, 0.7]

const TEMPO_STUFE_KMH = 0.5

function rundeTempo(kmh: number): number {
  return Math.round(kmh / TEMPO_STUFE_KMH) * TEMPO_STUFE_KMH
}

// Durchschnittstempo der letzten Einheiten mit Dauer UND Distanz auf dem Gerät
export function basisTempoKmh(
  logs: WorkoutLog[],
  cardioType: CardioTypeId,
  maxEinheiten = 5,
): number | null {
  const tempi = [...logs]
    .sort((a, b) => b.datum.localeCompare(a.datum) || b.id - a.id)
    .flatMap((log) =>
      log.eintraege.flatMap((e) =>
        e.art === 'cardio' && e.cardioType === cardioType && e.dauerMin > 0 && (e.distanzKm ?? 0) > 0
          ? [geschwindigkeitKmh(e.distanzKm!, e.dauerMin)]
          : [],
      ),
    )
    .slice(0, maxEinheiten)
  if (tempi.length === 0) return null
  return tempi.reduce((summe, t) => summe + t, 0) / tempi.length
}

export interface IntervallTempo {
  basisKmh: number
  belastung: [number, number] // km/h, von–bis
  erholung: [number, number]
}

export function intervallTempo(basisKmh: number): IntervallTempo {
  return {
    basisKmh: Math.round(basisKmh * 10) / 10,
    belastung: [rundeTempo(basisKmh * BELASTUNG_FAKTOR[0]), rundeTempo(basisKmh * BELASTUNG_FAKTOR[1])],
    erholung: [rundeTempo(basisKmh * ERHOLUNG_FAKTOR[0]), rundeTempo(basisKmh * ERHOLUNG_FAKTOR[1])],
  }
}

// Empfehlung aus den protokollierten Einheiten; null, solange Daten fehlen
export function empfohlenesIntervallTempo(
  logs: WorkoutLog[],
  cardioType: CardioTypeId,
): IntervallTempo | null {
  const basis = basisTempoKmh(logs, cardioType)
  return basis === null ? null : intervallTempo(basis)
}

// --- Zielbasierte Vorgabe -----------------------------------------------------

export interface IntervallTempoMitQuelle extends IntervallTempo {
  quelle: 'ziel' | 'durchschnitt'
  // nur bei quelle 'ziel' gesetzt:
  wochenZielKmh?: number
  zielKmh?: number
  zieldatum?: string
}

// Tempo, das diese Woche erreicht sein soll: ein Wochen-Schritt der linearen
// Steigerung vom aktuellen Niveau zum Zieltempo. Da die Basis mit jeder
// Einheit neu gemessen wird, korrigiert sich die Vorgabe von selbst.
export function wochenZielTempo(
  basisKmh: number | null,
  zielKmh: number,
  tageVerbleibend: number,
): number {
  if (basisKmh === null || basisKmh >= zielKmh) return zielKmh
  const wochen = Math.max(1, Math.ceil(tageVerbleibend / 7))
  return Math.round((basisKmh + (zielKmh - basisKmh) / wochen) * 100) / 100
}

// Aktives Leistungsziel für das Gerät (nächstes Zieldatum zuerst)
export function passendesLeistungsziel(
  goals: Goal[],
  cardioType: CardioTypeId,
): Goal | null {
  const passende = goals
    .filter(
      (g) =>
        g.typ === 'cardio_leistung' &&
        g.referenz === cardioType &&
        g.status === 'aktiv' &&
        !!g.zieldatum &&
        !!g.zielDauerMin,
    )
    .sort((a, b) => (a.zieldatum ?? '').localeCompare(b.zieldatum ?? ''))
  return passende[0] ?? null
}

// Intervall-Vorgabe: bevorzugt aus dem Leistungsziel (Zieltempo + Zieldatum),
// sonst aus dem Durchschnitt der letzten Einheiten
export function intervallVorgabe(
  logs: WorkoutLog[],
  goals: Goal[],
  cardioType: CardioTypeId,
  heute: string,
): IntervallTempoMitQuelle | null {
  const ziel = passendesLeistungsziel(goals, cardioType)
  const basis = basisTempoKmh(logs, cardioType)

  if (ziel) {
    const zielKmh = zielVergleichswert(ziel)
    const tage = tageBisZiel(ziel.zieldatum, heute) ?? 0
    const wochenZiel = wochenZielTempo(basis, zielKmh, Math.max(0, tage))
    return {
      ...intervallTempo(wochenZiel),
      quelle: 'ziel',
      wochenZielKmh: wochenZiel,
      zielKmh: Math.round(zielKmh * 100) / 100,
      zieldatum: ziel.zieldatum,
    }
  }

  return basis === null ? null : { ...intervallTempo(basis), quelle: 'durchschnitt' }
}

export function formatiereTempoBereich(bereich: [number, number]): string {
  const f = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 1 })
  return bereich[0] === bereich[1] ? `${f(bereich[0])} km/h` : `${f(bereich[0])}–${f(bereich[1])} km/h`
}
