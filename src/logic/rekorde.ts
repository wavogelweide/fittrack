// Persönliche Rekorde (PRs) aus Trainingsprotokoll und Maximalgewicht-Verlauf:
// schwerster Satz und bestes geschätztes 1RM je Kraftübung, längste Dauer /
// weiteste Distanz / bestes Tempo je Cardio-Gerät. Ein neuer Rekord zählt nur,
// wenn ein bisheriger Bestwert tatsächlich übertroffen wurde.
import type { CardioTypeId, MaxWeight, WorkoutLog } from '../db/types'
import { geschaetztes1RM } from './einRM'
import { geschwindigkeitKmh } from './ziele'

export interface KraftBestwerte {
  schwersterSatzKg: number
  bestes1RM: number
}

export interface CardioBestwerte {
  laengsteMin: number
  weitesteKm: number
  bestesTempoKmh: number
}

const zahl = (n: number, stellen = 1) =>
  n.toLocaleString('de-DE', { maximumFractionDigits: stellen })

// Bestwerte je Kraftübung aus Protokoll + Maximalgewicht-Verlauf
export function kraftBestwerte(
  logs: WorkoutLog[],
  maxWeights: MaxWeight[],
): Record<string, KraftBestwerte> {
  const best: Record<string, KraftBestwerte> = {}
  const melde = (exerciseId: string, gewichtKg: number, wdh: number) => {
    const b = (best[exerciseId] ??= { schwersterSatzKg: 0, bestes1RM: 0 })
    b.schwersterSatzKg = Math.max(b.schwersterSatzKg, gewichtKg)
    b.bestes1RM = Math.max(b.bestes1RM, geschaetztes1RM(gewichtKg, wdh))
  }
  for (const log of logs) {
    for (const e of log.eintraege) {
      if (e.art === 'kraft') for (const s of e.saetze) melde(e.exerciseId, s.gewichtKg, s.wdh)
    }
  }
  for (const m of maxWeights) melde(m.exerciseId, m.gewichtKg, m.wiederholungen)
  return best
}

// Bestwerte je Cardio-Gerät aus dem Protokoll
export function cardioBestwerte(logs: WorkoutLog[]): Partial<Record<CardioTypeId, CardioBestwerte>> {
  const best: Partial<Record<CardioTypeId, CardioBestwerte>> = {}
  for (const log of logs) {
    for (const e of log.eintraege) {
      if (e.art !== 'cardio') continue
      const b = (best[e.cardioType] ??= { laengsteMin: 0, weitesteKm: 0, bestesTempoKmh: 0 })
      b.laengsteMin = Math.max(b.laengsteMin, e.dauerMin)
      if (e.distanzKm && e.distanzKm > 0) {
        b.weitesteKm = Math.max(b.weitesteKm, e.distanzKm)
        if (e.dauerMin > 0) {
          b.bestesTempoKmh = Math.max(b.bestesTempoKmh, geschwindigkeitKmh(e.distanzKm, e.dauerMin))
        }
      }
    }
  }
  return best
}

// Welche Rekorde bricht das neue Workout gegenüber der bisherigen Historie?
// namen: Anzeigenamen für exerciseIds und CardioTypeIds
export function neueRekorde(
  neuesLog: Pick<WorkoutLog, 'eintraege'>,
  bisherLogs: WorkoutLog[],
  maxWeights: MaxWeight[],
  namen: Record<string, string>,
): string[] {
  const kraftBisher = kraftBestwerte(bisherLogs, maxWeights)
  const cardioBisher = cardioBestwerte(bisherLogs)
  const name = (id: string) => namen[id] ?? id
  const rekorde: string[] = []

  // je Übung/Gerät nur den besten neuen Wert melden, nicht jeden Satz einzeln
  const kraftNeu = kraftBestwerte([{ id: 0, datum: '', typ: 'kraft', ...neuesLog }], [])
  for (const [exerciseId, neu] of Object.entries(kraftNeu)) {
    const bisher = kraftBisher[exerciseId]
    if (!bisher) continue // erste Leistung überhaupt = Basis, kein Rekord
    if (neu.schwersterSatzKg > bisher.schwersterSatzKg) {
      rekorde.push(`${name(exerciseId)}: schwerster Satz ${zahl(neu.schwersterSatzKg)} kg`)
    }
    if (neu.bestes1RM > bisher.bestes1RM) {
      rekorde.push(`${name(exerciseId)}: bestes 1RM ${zahl(neu.bestes1RM)} kg (geschätzt)`)
    }
  }

  const cardioNeu = cardioBestwerte([{ id: 0, datum: '', typ: 'cardio', ...neuesLog }])
  for (const [cardioType, neu] of Object.entries(cardioNeu) as [CardioTypeId, CardioBestwerte][]) {
    const bisher = cardioBisher[cardioType]
    if (!bisher) continue
    if (neu.laengsteMin > bisher.laengsteMin) {
      rekorde.push(`${name(cardioType)}: längste Einheit ${zahl(neu.laengsteMin, 0)} Min.`)
    }
    if (neu.weitesteKm > bisher.weitesteKm) {
      rekorde.push(`${name(cardioType)}: weiteste Distanz ${zahl(neu.weitesteKm)} km`)
    }
    if (bisher.bestesTempoKmh > 0 && neu.bestesTempoKmh > bisher.bestesTempoKmh) {
      rekorde.push(`${name(cardioType)}: bestes Tempo ${zahl(neu.bestesTempoKmh)} km/h`)
    }
  }

  return rekorde
}
