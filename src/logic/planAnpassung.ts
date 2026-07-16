// Plananpassung (Feature 7): Übungen im Wochenplan dauerhaft ersetzen oder
// ausblenden. Alternativen werden nach passender Zielmuskulatur/Bewegung
// vorgeschlagen, damit der Ersatz denselben Trainingsreiz setzt.
import type { Exercise } from '../db/types'

// Sinnvolle Alternativen zu einer Übung: gleicher Bewegungstyp und mindestens
// ein gemeinsamer Primärmuskel, nach Namen sortiert, ohne die Übung selbst.
export function alternativeUebungen(exerciseId: string, alle: Exercise[]): Exercise[] {
  const basis = alle.find((u) => u.id === exerciseId)
  if (!basis) return []
  const primaer = new Set(basis.primaerMuskeln)
  return alle
    .filter(
      (u) =>
        u.id !== exerciseId &&
        u.bewegungsTyp === basis.bewegungsTyp &&
        u.primaerMuskeln.some((m) => primaer.has(m)),
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'de'))
}

// Anpassung setzen (immutabel): Ersatz-Id, null zum Ausblenden, undefined
// entfernt die Anpassung (zurück zur Standardübung).
export function setzeAnpassung(
  anpassungen: Record<string, string | null> | undefined,
  exerciseId: string,
  wert: string | null | undefined,
): Record<string, string | null> {
  const naechste = { ...(anpassungen ?? {}) }
  if (wert === undefined) delete naechste[exerciseId]
  else naechste[exerciseId] = wert
  return naechste
}

export function anzahlAnpassungen(anpassungen: Record<string, string | null> | undefined): number {
  return anpassungen ? Object.keys(anpassungen).length : 0
}
