// Pulszonen-Berechnung nach vorgehensplan-fitness-app.md Abschnitt 5.1b
export interface PulsProfil {
  alter?: number
  ruhePuls?: number
  maxPuls?: number
}

// HFmax aus Profil oder Schätzung 220 − Alter
export function maxHerzfrequenz(profil: PulsProfil): number | null {
  if (profil.maxPuls && profil.maxPuls > 0) return profil.maxPuls
  if (profil.alter && profil.alter > 0) return 220 - profil.alter
  return null
}

// GA1-Zone: 60–75 % HFmax; mit Ruhepuls genauer per Karvonen-Formel
export function ga1Zone(profil: PulsProfil): { von: number; bis: number; hfMax: number } | null {
  const hfMax = maxHerzfrequenz(profil)
  if (hfMax === null) return null
  const intensitaet: [number, number] = [0.6, 0.75]
  if (profil.ruhePuls && profil.ruhePuls > 0) {
    const reserve = hfMax - profil.ruhePuls
    return {
      von: Math.round(profil.ruhePuls + intensitaet[0] * reserve),
      bis: Math.round(profil.ruhePuls + intensitaet[1] * reserve),
      hfMax,
    }
  }
  return {
    von: Math.round(intensitaet[0] * hfMax),
    bis: Math.round(intensitaet[1] * hfMax),
    hfMax,
  }
}
