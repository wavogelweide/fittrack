import { useState } from 'react'
import { db } from '../db/db'
import { setzeTheme } from './theme'

// Löscht alle Nutzerdaten (Katalog-Seeds bleiben); danach startet die App
// wieder mit dem Onboarding
async function alleDatenLoeschen() {
  await db.transaction(
    'rw',
    [db.maxWeights, db.workoutLogs, db.userProfile, db.goals, db.koerperdaten, db.exercises],
    async () => {
      const eigene = (await db.exercises.toArray()).filter((u) => u.eigene).map((u) => u.id)
      await Promise.all([
        db.maxWeights.clear(),
        db.workoutLogs.clear(),
        db.userProfile.clear(),
        db.goals.clear(),
        db.koerperdaten.clear(),
        db.exercises.bulkDelete(eigene),
      ])
    },
  )
  setzeTheme('dunkel') // Design-Standard wiederherstellen
}

export default function AppZuruecksetzen() {
  const [bestaetigen, setBestaetigen] = useState(false)

  const zuruecksetzen = async () => {
    if (
      !window.confirm(
        'Wirklich ALLE Daten löschen?\n\nWorkouts, Maximalgewichte, Ziele, Körperdaten, eigene Übungen und dein Profil werden unwiderruflich entfernt. Ein Backup lässt sich danach weiterhin importieren.',
      )
    ) {
      setBestaetigen(false)
      return
    }
    await alleDatenLoeschen()
    setBestaetigen(false)
  }

  return (
    <section className="rounded-2xl border border-danger/30 bg-danger/5 p-5">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-danger">
        App zurücksetzen
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-txt3">
        Löscht alle Trainingsdaten, Ziele, Körperdaten, eigene Übungen und dein Profil von diesem
        Gerät. Der Übungskatalog bleibt erhalten, die App startet wieder mit der Einrichtung.
        Erstelle vorher am besten ein Backup.
      </p>
      {!bestaetigen ? (
        <button
          onClick={() => setBestaetigen(true)}
          className="mt-4 h-12 w-full rounded-xl border border-danger/40 bg-danger/10 font-semibold text-danger active:bg-danger/20"
        >
          Alle Daten löschen …
        </button>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={() => setBestaetigen(false)}
            className="h-12 rounded-xl border border-line bg-elev font-semibold text-txt2 active:bg-elev2"
          >
            Abbrechen
          </button>
          <button
            onClick={() => void zuruecksetzen()}
            className="h-12 rounded-xl bg-danger font-semibold text-white active:opacity-90"
          >
            Endgültig löschen
          </button>
        </div>
      )}
    </section>
  )
}
