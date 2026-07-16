// Aufwärmsätze vor dem Arbeitsgewicht – übliche Empfehlung aus
// Online-Trainingsplänen für Maschinentraining: erst ~50 % × 10, dann
// ~75 % × 5, auf gerätesinnvolle 2,5-kg-Stufen gerundet. Bei leichten
// Arbeitsgewichten reicht ein Satz bzw. gar kein Aufwärmsatz.
import { rundeAufStufe } from './einRM'

export interface AufwaermSatz {
  gewichtKg: number
  wdh: number
}

const STUFEN = [
  { prozent: 0.5, wdh: 10 },
  { prozent: 0.75, wdh: 5 },
]

export function aufwaermSaetze(arbeitsgewichtKg: number | null): AufwaermSatz[] {
  if (arbeitsgewichtKg === null || arbeitsgewichtKg < 20) return []
  const stufen = arbeitsgewichtKg < 30 ? STUFEN.slice(0, 1) : STUFEN
  const saetze: AufwaermSatz[] = []
  for (const s of stufen) {
    const gewichtKg = rundeAufStufe(arbeitsgewichtKg * s.prozent)
    if (
      gewichtKg >= 2.5 &&
      gewichtKg < arbeitsgewichtKg &&
      !saetze.some((x) => x.gewichtKg === gewichtKg)
    ) {
      saetze.push({ gewichtKg, wdh: s.wdh })
    }
  }
  return saetze
}
