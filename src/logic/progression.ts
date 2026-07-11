// Automatische Progression nach dem Prinzip der doppelten Progression,
// verankert an der Maximalkraft (1RM) – die übliche Steuerung in
// Online-Trainingsplänen für Maschinentraining:
// - Basis-Arbeitsgewicht = %1RM je Trainingsziel (Abschnitt 5.1)
// - alle Sätze am oberen Ende des Wdh-Bereichs → Gewicht +2,5 kg,
//   wieder ab dem unteren Ende des Bereichs arbeiten
// - unteres Ende in zwei Einheiten in Folge verfehlt → Gewicht −5 %
//   zum Neuaufbau (leichter Deload)
// - sonst: Gewicht halten und Wiederholungen steigern
import type { Trainingsziel, WorkoutLog } from '../db/types'
import { arbeitsgewicht, geschaetztes1RM, rundeAufStufe, ZIEL_KONFIG } from './einRM'

export const GEWICHTS_STUFE_KG = 2.5
export const REDUKTION_FAKTOR = 0.95

// Satzpausen nach gängigen Trainingsplan-Empfehlungen je Trainingsziel
export const PAUSEN_SEK: Record<Trainingsziel, number> = {
  kraftausdauer: 60,
  hypertrophie: 90,
  kraft: 180,
}

export interface ProgressionsVorschlag {
  gewichtKg: number | null // null = weder 1RM noch Historie vorhanden
  aktion: 'basis' | 'steigern' | 'halten' | 'reduzieren'
  grund: string | null
}

interface KraftEinheit {
  datum: string
  saetze: { gewichtKg: number; wdh: number }[]
}

const kg = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 1 })

// Kraft-Einheiten einer Übung aus dem Protokoll, neueste zuerst
function einheitenFuer(exerciseId: string, logs: WorkoutLog[]): KraftEinheit[] {
  return [...logs]
    .sort((a, b) => b.datum.localeCompare(a.datum) || b.id - a.id)
    .flatMap((log) =>
      log.eintraege.flatMap((e) =>
        e.art === 'kraft' && e.exerciseId === exerciseId && e.saetze.length > 0
          ? [{ datum: log.datum, saetze: e.saetze }]
          : [],
      ),
    )
}

// Effektive Maximalkraft: erfasstes 1RM UND die aus allen Trainingssätzen
// geschätzten 1RMs – steigt automatisch mit der Trainingsleistung
export function effektives1RM(
  einRM: number | null,
  exerciseId: string,
  logs: WorkoutLog[],
): number | null {
  let max = einRM ?? 0
  for (const e of einheitenFuer(exerciseId, logs)) {
    for (const s of e.saetze) max = Math.max(max, geschaetztes1RM(s.gewichtKg, s.wdh))
  }
  return max > 0 ? max : null
}

// Arbeitsgewicht einer Einheit = schwerstes verwendetes Gewicht;
// bewertet werden nur die Sätze mit diesem Gewicht (Aufwärmsätze zählen nicht)
function arbeitsSaetze(einheit: KraftEinheit) {
  const gewicht = Math.max(...einheit.saetze.map((s) => s.gewichtKg))
  return { gewicht, saetze: einheit.saetze.filter((s) => s.gewichtKg === gewicht) }
}

export function progressionsVorschlag(
  exerciseId: string,
  ziel: Trainingsziel,
  einRM: number | null,
  logs: WorkoutLog[],
): ProgressionsVorschlag {
  const [unten, oben] = ZIEL_KONFIG[ziel].wdh
  const einheiten = einheitenFuer(exerciseId, logs)

  if (einheiten.length === 0) {
    // keine Historie → Basis-Arbeitsgewicht aus dem 1RM (wie bisher)
    const eff = effektives1RM(einRM, exerciseId, logs)
    return {
      gewichtKg: eff !== null ? arbeitsgewicht(eff, ziel).empfohlenKg : null,
      aktion: 'basis',
      grund: null,
    }
  }

  const letzte = arbeitsSaetze(einheiten[0])

  if (letzte.saetze.every((s) => s.wdh >= oben)) {
    return {
      gewichtKg: letzte.gewicht + GEWICHTS_STUFE_KG,
      aktion: 'steigern',
      grund: `Zuletzt alle Sätze mit ${oben}+ Wdh. bei ${kg(letzte.gewicht)} kg – Steigerung um ${kg(GEWICHTS_STUFE_KG)} kg, wieder ab ${unten} Wdh.`,
    }
  }

  if (letzte.saetze.some((s) => s.wdh < unten)) {
    const vorherige = einheiten[1] ? arbeitsSaetze(einheiten[1]) : null
    const zweimalVerfehlt =
      vorherige !== null &&
      vorherige.gewicht >= letzte.gewicht &&
      vorherige.saetze.some((s) => s.wdh < unten)
    if (zweimalVerfehlt) {
      const reduziert = Math.max(
        GEWICHTS_STUFE_KG,
        rundeAufStufe(letzte.gewicht * REDUKTION_FAKTOR),
      )
      return {
        gewichtKg: reduziert,
        aktion: 'reduzieren',
        grund: `Zweimal in Folge unter ${unten} Wdh. bei ${kg(letzte.gewicht)} kg – 5 % zurück zum Neuaufbau.`,
      }
    }
    return {
      gewichtKg: letzte.gewicht,
      aktion: 'halten',
      grund: `Zuletzt unter ${unten} Wdh. – Gewicht halten und den Bereich erst festigen.`,
    }
  }

  return {
    gewichtKg: letzte.gewicht,
    aktion: 'halten',
    grund: `Im Wdh.-Bereich – Gewicht halten und Wiederholungen Richtung ${oben} steigern.`,
  }
}
