import { describe, expect, it } from 'vitest'
import {
  backupDateiname,
  backupErinnerung,
  BACKUP_VERSION,
  erstelleBackup,
  parseBackup,
  zaehleBackup,
  type BackupInhalt,
} from './backup'

const INHALT: BackupInhalt = {
  maxWeights: [{ id: 1, exerciseId: 'brustpresse', gewichtKg: 50, wiederholungen: 5, datum: '2026-07-01' }],
  workoutLogs: [
    {
      id: 1,
      datum: '2026-07-08',
      typ: 'kraft',
      eintraege: [{ art: 'kraft', exerciseId: 'brustpresse', saetze: [{ gewichtKg: 40, wdh: 10 }] }],
    },
  ],
  userProfile: [{ id: 1, trainingsziel: 'hypertrophie', trainingstageProWoche: 3 }],
  goals: [{ id: 1, typ: 'kraft_gewicht', referenz: 'brustpresse', zielwert: 60, status: 'aktiv' }],
  koerperdaten: [{ id: 1, datum: '2026-07-01', gewichtKg: 82.5, fettProzent: 22 }],
  eigeneUebungen: [
    {
      id: 'eigene_1',
      name: 'Hip Thrust Maschine',
      maschine: 'Hip Thrust Maschine',
      primaerMuskeln: ['gesaess'],
      sekundaerMuskeln: [],
      bewegungsTyp: 'legs_back',
      illustrationId: 'eigene',
      eigene: true,
    },
  ],
}

describe('erstelleBackup / parseBackup', () => {
  it('Roundtrip: exportiertes Backup wird identisch wieder eingelesen', () => {
    const backup = erstelleBackup(INHALT, '2026-07-10')
    const ergebnis = parseBackup(JSON.stringify(backup))
    expect(ergebnis.ok).toBe(true)
    if (ergebnis.ok) {
      expect(ergebnis.daten.version).toBe(BACKUP_VERSION)
      expect(ergebnis.daten.exportiertAm).toBe('2026-07-10')
      expect(ergebnis.daten.maxWeights).toEqual(INHALT.maxWeights)
      expect(ergebnis.daten.workoutLogs).toEqual(INHALT.workoutLogs)
      expect(ergebnis.daten.goals).toEqual(INHALT.goals)
      expect(ergebnis.daten.koerperdaten).toEqual(INHALT.koerperdaten)
      expect(ergebnis.daten.eigeneUebungen).toEqual(INHALT.eigeneUebungen)
    }
  })

  it('liest v1-Backups ohne Körperdaten/eigene Übungen (leer aufgefüllt)', () => {
    const v1 = erstelleBackup(INHALT, '2026-07-10') as unknown as Record<string, unknown>
    v1.version = 1
    delete v1.koerperdaten
    delete v1.eigeneUebungen
    const ergebnis = parseBackup(JSON.stringify(v1))
    expect(ergebnis.ok).toBe(true)
    if (ergebnis.ok) {
      expect(ergebnis.daten.koerperdaten).toEqual([])
      expect(ergebnis.daten.eigeneUebungen).toEqual([])
    }
  })

  it('lehnt ungültiges JSON und fremde Dateien ab', () => {
    expect(parseBackup('kein json {')).toEqual({ ok: false, fehler: 'Die Datei ist kein gültiges JSON.' })
    expect(parseBackup('42').ok).toBe(false)
    expect(parseBackup(JSON.stringify({ irgendwas: true })).ok).toBe(false)
  })

  it('lehnt neuere Backup-Versionen ab', () => {
    const backup = { ...erstelleBackup(INHALT, '2026-07-10'), version: BACKUP_VERSION + 1 }
    const ergebnis = parseBackup(JSON.stringify(backup))
    expect(ergebnis.ok).toBe(false)
    if (!ergebnis.ok) expect(ergebnis.fehler).toContain('nicht unterstützt')
  })

  it('lehnt Backups mit fehlenden Tabellen ab', () => {
    const backup = erstelleBackup(INHALT, '2026-07-10') as unknown as Record<string, unknown>
    delete backup.goals
    const ergebnis = parseBackup(JSON.stringify(backup))
    expect(ergebnis.ok).toBe(false)
    if (!ergebnis.ok) expect(ergebnis.fehler).toContain('goals')
  })

  it('lehnt beschädigte Einträge ab', () => {
    const kaputt = erstelleBackup(
      { ...INHALT, maxWeights: [{ id: 1, exerciseId: 5, gewichtKg: 'x' } as never] },
      '2026-07-10',
    )
    const ergebnis = parseBackup(JSON.stringify(kaputt))
    expect(ergebnis.ok).toBe(false)
    if (!ergebnis.ok) expect(ergebnis.fehler).toContain('Maximalgewicht')
  })
})

describe('Dateiname und Zusammenfassung', () => {
  it('bildet Dateiname und Inhaltsübersicht', () => {
    expect(backupDateiname('2026-07-10')).toBe('fittrack-backup-2026-07-10.json')
    expect(zaehleBackup(INHALT)).toBe(
      '1 Maximalgewichte, 1 Workouts, 1 Ziele, 1 Körpermessungen, Profil',
    )
    expect(zaehleBackup({ ...INHALT, userProfile: [] })).toContain('kein Profil')
  })
})

describe('backupErinnerung', () => {
  it('erinnert ohne Backup bzw. ab 28 Tagen – aber erst mit genug Workouts', () => {
    expect(backupErinnerung(undefined, '2026-07-16', 5).faellig).toBe(true)
    expect(backupErinnerung(undefined, '2026-07-16', 2).faellig).toBe(false)
    expect(backupErinnerung('2026-07-01', '2026-07-16', 5).faellig).toBe(false)
    const alt = backupErinnerung('2026-06-01', '2026-07-16', 5)
    expect(alt.faellig).toBe(true)
    expect(alt.grund).toContain('45 Tage')
  })
})
