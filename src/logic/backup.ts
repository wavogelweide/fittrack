// Datenexport/-import nach vorgehensplan-fitness-app.md Phase 7:
// IndexedDB kann bei Speicherplatzmangel von iOS gelöscht werden –
// deshalb alle Nutzerdaten als JSON-Backup exportier- und importierbar.
import type { Exercise, Goal, KoerperMessung, MaxWeight, UserProfile, WorkoutLog } from '../db/types'

// v2: Körperdaten-Verlauf und eigene Übungen im Backup
export const BACKUP_VERSION = 2

export interface BackupDaten {
  app: 'fittrack'
  version: number
  exportiertAm: string // ISO-Datum
  maxWeights: MaxWeight[]
  workoutLogs: WorkoutLog[]
  userProfile: UserProfile[]
  goals: Goal[]
  koerperdaten: KoerperMessung[]
  eigeneUebungen: Exercise[]
}

export interface BackupInhalt {
  maxWeights: MaxWeight[]
  workoutLogs: WorkoutLog[]
  userProfile: UserProfile[]
  goals: Goal[]
  koerperdaten: KoerperMessung[]
  eigeneUebungen: Exercise[]
}

export function erstelleBackup(inhalt: BackupInhalt, exportiertAm: string): BackupDaten {
  return { app: 'fittrack', version: BACKUP_VERSION, exportiertAm, ...inhalt }
}

export function backupDateiname(exportiertAm: string): string {
  return `fittrack-backup-${exportiertAm}.json`
}

export function zaehleBackup(b: BackupInhalt): string {
  return [
    `${b.maxWeights.length} Maximalgewichte`,
    `${b.workoutLogs.length} Workouts`,
    `${b.goals.length} Ziele`,
    `${b.koerperdaten.length} Körpermessungen`,
    b.userProfile.length > 0 ? 'Profil' : 'kein Profil',
  ].join(', ')
}

export type BackupParseErgebnis =
  | { ok: true; daten: BackupDaten }
  | { ok: false; fehler: string }

// Defensive Prüfung: die Datei kommt von außen (Dateisystem/Share-Sheet)
export function parseBackup(jsonText: string): BackupParseErgebnis {
  let roh: unknown
  try {
    roh = JSON.parse(jsonText)
  } catch {
    return { ok: false, fehler: 'Die Datei ist kein gültiges JSON.' }
  }
  if (typeof roh !== 'object' || roh === null) {
    return { ok: false, fehler: 'Die Datei enthält kein FitTrack-Backup.' }
  }
  const b = roh as Record<string, unknown>
  if (b.app !== 'fittrack') {
    return { ok: false, fehler: 'Die Datei enthält kein FitTrack-Backup.' }
  }
  if (typeof b.version !== 'number' || b.version > BACKUP_VERSION) {
    return {
      ok: false,
      fehler: `Backup-Version ${String(b.version)} wird nicht unterstützt – bitte App aktualisieren.`,
    }
  }
  for (const tabelle of ['maxWeights', 'workoutLogs', 'userProfile', 'goals'] as const) {
    if (!Array.isArray(b[tabelle])) {
      return { ok: false, fehler: `Backup unvollständig: „${tabelle}" fehlt.` }
    }
  }
  // v1-Backups kennen diese Tabellen noch nicht → leer auffüllen
  if (!Array.isArray(b.koerperdaten)) b.koerperdaten = []
  if (!Array.isArray(b.eigeneUebungen)) b.eigeneUebungen = []
  const daten = b as unknown as BackupDaten
  // Stichprobenhafte Feldprüfung, damit ein fremdes JSON nicht die DB zerschießt
  if (daten.maxWeights.some((m) => typeof m.exerciseId !== 'string' || typeof m.gewichtKg !== 'number')) {
    return { ok: false, fehler: 'Backup beschädigt: ungültige Maximalgewicht-Einträge.' }
  }
  if (daten.workoutLogs.some((w) => typeof w.datum !== 'string' || !Array.isArray(w.eintraege))) {
    return { ok: false, fehler: 'Backup beschädigt: ungültige Workout-Einträge.' }
  }
  if (daten.goals.some((g) => typeof g.typ !== 'string' || typeof g.zielwert !== 'number')) {
    return { ok: false, fehler: 'Backup beschädigt: ungültige Ziele.' }
  }
  if (daten.koerperdaten.some((k) => typeof k.datum !== 'string' || typeof k.gewichtKg !== 'number')) {
    return { ok: false, fehler: 'Backup beschädigt: ungültige Körpermessungen.' }
  }
  if (daten.eigeneUebungen.some((u) => typeof u.id !== 'string' || typeof u.name !== 'string')) {
    return { ok: false, fehler: 'Backup beschädigt: ungültige eigene Übungen.' }
  }
  return { ok: true, daten }
}

// --- Backup-Erinnerung --------------------------------------------------------

export const BACKUP_ERINNERUNG_TAGE = 28
const MIN_WORKOUTS_FUER_ERINNERUNG = 3

export interface BackupErinnerung {
  faellig: boolean
  grund: string | null
}

// Sanfter Hinweis, sobald Trainingsdaten da sind und das letzte Backup fehlt
// oder älter als vier Wochen ist
export function backupErinnerung(
  letztesBackup: string | undefined,
  heute: string,
  anzahlWorkouts: number,
): BackupErinnerung {
  if (anzahlWorkouts < MIN_WORKOUTS_FUER_ERINNERUNG) return { faellig: false, grund: null }
  if (!letztesBackup) {
    return {
      faellig: true,
      grund: 'Noch kein Backup erstellt – deine Daten liegen nur auf diesem Gerät.',
    }
  }
  const tage = Math.round(
    (new Date(`${heute}T12:00:00`).getTime() - new Date(`${letztesBackup}T12:00:00`).getTime()) /
      (24 * 60 * 60 * 1000),
  )
  if (tage >= BACKUP_ERINNERUNG_TAGE) {
    return { faellig: true, grund: `Dein letztes Backup ist ${tage} Tage alt.` }
  }
  return { faellig: false, grund: null }
}
