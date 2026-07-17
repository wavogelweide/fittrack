// Eigene Übungen: Nutzer erweitern den Kraft-Katalog um eigene Maschinen.
// Eigene Übungen tragen das Flag `eigene`, leben in der exercises-Tabelle
// und fließen in Auswahl, Plan-Alternativen, Progression und Backup ein.
import type { BewegungsTyp, Exercise, Muskel } from '../db/types'

export const EIGENE_PREFIX = 'eigene_'

export function istEigeneUebung(id: string): boolean {
  return id.startsWith(EIGENE_PREFIX)
}

export interface EigeneUebungEntwurf {
  name: string
  maschine?: string
  bewegungsTyp: BewegungsTyp
  primaerMuskeln: Muskel[]
  sekundaerMuskeln?: Muskel[]
}

export type EigeneUebungErgebnis =
  | { ok: true; uebung: Exercise }
  | { ok: false; fehler: string }

export function erstelleEigeneUebung(
  entwurf: EigeneUebungEntwurf,
  jetztMs: number,
): EigeneUebungErgebnis {
  const name = entwurf.name.trim()
  if (name.length === 0) return { ok: false, fehler: 'Bitte einen Namen eingeben.' }
  if (entwurf.primaerMuskeln.length === 0) {
    return { ok: false, fehler: 'Bitte mindestens einen primären Muskel wählen.' }
  }
  const primaer = [...new Set(entwurf.primaerMuskeln)]
  const sekundaer = [...new Set(entwurf.sekundaerMuskeln ?? [])].filter(
    (m) => !primaer.includes(m),
  )
  return {
    ok: true,
    uebung: {
      id: `${EIGENE_PREFIX}${jetztMs}`,
      name,
      maschine: entwurf.maschine?.trim() || name,
      primaerMuskeln: primaer,
      sekundaerMuskeln: sekundaer,
      bewegungsTyp: entwurf.bewegungsTyp,
      illustrationId: 'eigene',
      eigene: true,
    },
  }
}

// Seed-Übungen mit dem DB-Stand vereinen: DB-Einträge (inkl. eigener Übungen)
// ergänzen und überschreiben die Seeds – so fehlen auch auf älteren
// Installationen keine später ergänzten Katalog-Übungen.
export function vereinigeUebungen(seed: Exercise[], ausDb: Exercise[]): Exercise[] {
  const proId = new Map(seed.map((u) => [u.id, u]))
  for (const u of ausDb) proId.set(u.id, u)
  return [...proId.values()]
}
