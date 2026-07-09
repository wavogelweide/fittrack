import { ART_LABELS, MUSKEL_LABELS } from '../db/labels'
import type { CardioGeraet, Exercise, StretchExercise } from '../db/types'

export function passtZurSuche(suchtext: string, texte: string[]): boolean {
  const s = suchtext.toLowerCase().trim()
  if (!s) return true
  return texte.some((t) => t.toLowerCase().includes(s))
}

export function filtereKraft(uebungen: Exercise[], suchtext: string): Exercise[] {
  return uebungen.filter((u) =>
    passtZurSuche(suchtext, [
      u.name,
      u.maschine,
      ...u.primaerMuskeln.map((m) => MUSKEL_LABELS[m]),
      ...u.sekundaerMuskeln.map((m) => MUSKEL_LABELS[m]),
    ]),
  )
}

export function filtereDehnen(uebungen: StretchExercise[], suchtext: string): StretchExercise[] {
  return uebungen.filter((u) =>
    passtZurSuche(suchtext, [
      u.name,
      ART_LABELS[u.art],
      ...u.zielMuskeln.map((m) => MUSKEL_LABELS[m]),
    ]),
  )
}

export function filtereCardio(geraete: CardioGeraet[], suchtext: string): CardioGeraet[] {
  return geraete.filter((g) => passtZurSuche(suchtext, [g.name, g.beschreibung]))
}
