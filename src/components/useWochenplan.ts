import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { berechneRatios, bewerteHaltung } from '../logic/analyse'
import { einRMProUebung } from '../logic/einRM'
import { ga1Zone } from '../logic/puls'
import { erstelleWochenplan } from '../logic/vorschlag'

// Wochenplan aus Maximalgewichten, Analyse und Profil – genutzt von Plan- und Workout-Tab
export function useWochenplan() {
  const maxWeights = useLiveQuery(() => db.maxWeights.toArray(), []) ?? []
  const logs = useLiveQuery(() => db.workoutLogs.toArray(), []) ?? []
  const profil = useLiveQuery(() => db.userProfile.get(1), [])

  const einRMs = einRMProUebung(maxWeights)
  const ratios = berechneRatios(einRMs)
  const muster = bewerteHaltung(ratios, profil?.selbstcheck)
  const plan = erstelleWochenplan({
    einRMs,
    ratios,
    muster,
    trainingsziel: profil?.trainingsziel ?? 'hypertrophie',
    trainingstageProWoche: profil?.trainingstageProWoche ?? 3,
    ga1Zone: ga1Zone(profil ?? {}),
    logs,
  })

  return { plan, profil, einRMs }
}
