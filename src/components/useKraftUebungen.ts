import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { KRAFT_UEBUNGEN } from '../db/seed'
import type { Exercise } from '../db/types'
import { vereinigeUebungen } from '../logic/eigeneUebungen'

// Alle Kraftübungen: Seed-Katalog vereint mit dem DB-Stand (inkl. eigener
// Übungen) – bis die DB geladen ist, dient der Seed als Anzeige-Basis.
export function useKraftUebungen(): Exercise[] {
  const ausDb = useLiveQuery(() => db.exercises.toArray(), [])
  return vereinigeUebungen(KRAFT_UEBUNGEN, ausDb ?? [])
}
