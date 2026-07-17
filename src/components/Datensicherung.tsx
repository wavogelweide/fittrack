import { useCallback, useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import {
  backupDateiname,
  erstelleBackup,
  parseBackup,
  zaehleBackup,
  type BackupInhalt,
} from '../logic/backup'

const heute = () => new Date().toISOString().slice(0, 10)

async function ladeInhalt(): Promise<BackupInhalt> {
  return {
    maxWeights: await db.maxWeights.toArray(),
    workoutLogs: await db.workoutLogs.toArray(),
    userProfile: await db.userProfile.toArray(),
    goals: await db.goals.toArray(),
    koerperdaten: await db.koerperdaten.toArray(),
    eigeneUebungen: (await db.exercises.toArray()).filter((u) => u.eigene),
  }
}

// Backup-Zeitpunkt fürs Erinnerungs-Feature im Profil festhalten
async function merkeBackupDatum(datum: string) {
  const profil = await db.userProfile.get(1)
  await db.userProfile.put({
    trainingsziel: 'hypertrophie',
    trainingstageProWoche: 3,
    ...profil,
    id: 1,
    letztesBackup: datum,
  })
}

function formatiereBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toLocaleString('de-DE', { maximumFractionDigits: 1 })} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} kB`
}

export default function Datensicherung() {
  const profil = useLiveQuery(() => db.userProfile.get(1), [])
  const dateiInput = useRef<HTMLInputElement>(null)
  const [meldung, setMeldung] = useState<{ text: string; fehler: boolean } | null>(null)
  const [persistent, setPersistent] = useState<boolean | null>(null)
  const [speicher, setSpeicher] = useState<{ usage: number; quota: number } | null>(null)

  const aktualisiereSpeicher = useCallback(() => {
    void navigator.storage?.persisted?.().then(setPersistent)
    void navigator.storage?.estimate?.().then((e) => {
      if (e.usage !== undefined && e.quota !== undefined) {
        setSpeicher({ usage: e.usage, quota: e.quota })
      }
    })
  }, [])

  useEffect(aktualisiereSpeicher, [aktualisiereSpeicher])

  const exportieren = async () => {
    const datum = heute()
    const backup = erstelleBackup(await ladeInhalt(), datum)
    const json = JSON.stringify(backup, null, 2)
    const datei = new File([json], backupDateiname(datum), { type: 'application/json' })
    // iOS: Share-Sheet, sonst klassischer Download
    if (navigator.canShare?.({ files: [datei] })) {
      try {
        await navigator.share({ files: [datei], title: 'FitTrack-Backup' })
        await merkeBackupDatum(datum)
        setMeldung({ text: `Backup geteilt (${zaehleBackup(backup)}).`, fehler: false })
        return
      } catch {
        // Nutzer hat das Share-Sheet abgebrochen → nichts weiter tun
        return
      }
    }
    const url = URL.createObjectURL(datei)
    const a = document.createElement('a')
    a.href = url
    a.download = datei.name
    a.click()
    URL.revokeObjectURL(url)
    await merkeBackupDatum(datum)
    setMeldung({ text: `Backup heruntergeladen (${zaehleBackup(backup)}).`, fehler: false })
  }

  const importieren = async (datei: File) => {
    const ergebnis = parseBackup(await datei.text())
    if (!ergebnis.ok) {
      setMeldung({ text: ergebnis.fehler, fehler: true })
      return
    }
    const { daten } = ergebnis
    const bestaetigt = window.confirm(
      `Backup vom ${daten.exportiertAm} importieren (${zaehleBackup(daten)})?\n\nVorhandene Trainingsdaten werden ersetzt.`,
    )
    if (!bestaetigt) return
    await db.transaction(
      'rw',
      [db.maxWeights, db.workoutLogs, db.userProfile, db.goals, db.koerperdaten, db.exercises],
      async () => {
        const alteEigene = (await db.exercises.toArray()).filter((u) => u.eigene).map((u) => u.id)
        await Promise.all([
          db.maxWeights.clear(),
          db.workoutLogs.clear(),
          db.userProfile.clear(),
          db.goals.clear(),
          db.koerperdaten.clear(),
          db.exercises.bulkDelete(alteEigene),
        ])
        await Promise.all([
          db.maxWeights.bulkPut(daten.maxWeights),
          db.workoutLogs.bulkPut(daten.workoutLogs),
          db.userProfile.bulkPut(daten.userProfile),
          db.goals.bulkPut(daten.goals),
          db.koerperdaten.bulkPut(daten.koerperdaten),
          db.exercises.bulkPut(daten.eigeneUebungen),
        ])
      },
    )
    setMeldung({ text: `Backup vom ${daten.exportiertAm} importiert (${zaehleBackup(daten)}).`, fehler: false })
  }

  const fordereAnPersistent = () => {
    void navigator.storage?.persist?.().then(() => aktualisiereSpeicher())
  }

  return (
    <section className="rounded-2xl border border-line bg-elev p-5 backdrop-blur-md">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">
        Datensicherung & Speicher
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-txt3">
        Deine Daten liegen nur auf diesem Gerät. iOS kann den Speicher bei Platzmangel leeren –
        sichere deshalb regelmäßig ein Backup.
      </p>
      <p className="mt-1 text-xs text-muted">
        Letztes Backup:{' '}
        {profil?.letztesBackup
          ? `${profil.letztesBackup.slice(8, 10)}.${profil.letztesBackup.slice(5, 7)}.${profil.letztesBackup.slice(0, 4)}`
          : 'noch keins'}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          onClick={() => void exportieren()}
          className="h-12 rounded-xl border border-neon-cyan/40 bg-neon-cyan/10 font-semibold text-neon-cyan active:bg-neon-cyan/20"
        >
          Exportieren
        </button>
        <button
          onClick={() => dateiInput.current?.click()}
          className="h-12 rounded-xl border border-line-strong bg-elev font-semibold text-txt active:bg-elev2"
        >
          Importieren
        </button>
      </div>
      <input
        ref={dateiInput}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const datei = e.target.files?.[0]
          if (datei) void importieren(datei)
          e.target.value = ''
        }}
      />

      {meldung && (
        <p
          className={`mt-3 rounded-xl border p-3 text-sm leading-relaxed ${
            meldung.fehler
              ? 'border-danger/30 bg-danger/10 text-danger'
              : 'border-neon-lime/25 bg-neon-lime/5 text-neon-lime'
         }`}
        >
          {meldung.text}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between gap-3 text-sm">
        <span className="text-txt3">Speicherstatus</span>
        {persistent === null ? (
          <span className="text-faint">unbekannt</span>
        ) : persistent ? (
          <span className="text-neon-lime">✓ dauerhaft</span>
        ) : (
          <button onClick={fordereAnPersistent} className="text-neon-cyan underline underline-offset-2">
            dauerhaft anfordern
          </button>
        )}
      </div>
      {speicher && speicher.quota > 0 && (
        <p className="mt-1 text-xs text-muted">
          Belegt: {formatiereBytes(speicher.usage)} von {formatiereBytes(speicher.quota)}
        </p>
      )}
    </section>
  )
}
