// Tempo-Empfehlungen für 60/120-Intervalle (Abschnitt 5.1b):
// Basis ist das Durchschnittstempo der letzten Einheiten auf dem Gerät,
// Belastung deutlich darüber (~85–90 % HFmax entspricht grob 115–125 %
// des Ausdauertempos), Erholung locker darunter (zurück in die GA1-Zone).
import type { CardioTypeId, WorkoutLog } from '../db/types'
import { geschwindigkeitKmh } from './ziele'

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

export function formatiereTempoBereich(bereich: [number, number]): string {
  const f = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 1 })
  return bereich[0] === bereich[1] ? `${f(bereich[0])} km/h` : `${f(bereich[0])}–${f(bereich[1])} km/h`
}
