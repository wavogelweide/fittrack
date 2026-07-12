// Datenmodell nach vorgehensplan-fitness-app.md Abschnitt 4

export type Muskel =
  | 'brust'
  | 'vordere_schulter'
  | 'seitliche_schulter'
  | 'hintere_schulter'
  | 'nacken_trapez'
  | 'latissimus'
  | 'oberer_ruecken'
  | 'rueckenstrecker'
  | 'bizeps'
  | 'trizeps'
  | 'unterarme'
  | 'bauch'
  | 'seitlicher_bauch'
  | 'hueftbeuger'
  | 'gesaess'
  | 'abduktoren'
  | 'adduktoren'
  | 'beinstrecker'
  | 'beinbeuger'
  | 'waden'
  | 'fusssohle'

export type BewegungsTyp = 'push' | 'pull' | 'legs_front' | 'legs_back' | 'core'

// Gruppen für die Agonist/Antagonist-Ratios aus Abschnitt 5.2
export type AntagonistGruppe =
  | 'knie_strecker'
  | 'knie_beuger'
  | 'druck_horizontal'
  | 'zug_horizontal'
  | 'druck_vertikal'
  | 'zug_vertikal'
  | 'abduktion'
  | 'adduktion'
  | 'rumpf_bauch'
  | 'rumpf_ruecken'

export interface Exercise {
  id: string
  name: string
  maschine: string
  primaerMuskeln: Muskel[]
  sekundaerMuskeln: Muskel[]
  bewegungsTyp: BewegungsTyp
  antagonistGruppe?: AntagonistGruppe
  illustrationId: string
}

export type CardioTypeId = 'laufband' | 'ergometer' | 'crosstrainer'

export interface CardioGeraet {
  id: CardioTypeId
  name: string
  beschreibung: string
  illustrationId: string
}

export type StretchArt = 'dehnen' | 'blackroll'

export interface StretchExercise {
  id: string
  name: string
  art: StretchArt
  zielMuskeln: Muskel[]
  anleitung: string
  halteDauerSek: number
  illustrationId: string
}

export interface MaxWeight {
  id: number
  exerciseId: string
  gewichtKg: number
  wiederholungen: number
  datum: string // ISO-Datum
}

export interface KraftEintrag {
  art: 'kraft'
  exerciseId: string
  saetze: { gewichtKg: number; wdh: number }[]
}

export interface CardioEintrag {
  art: 'cardio'
  cardioType: CardioTypeId
  dauerMin: number
  distanzKm?: number
  widerstand?: number
  pulsAvg?: number
}

export interface DehnEintrag {
  art: 'dehnen'
  stretchId: string
  dauerSek: number
}

export type WorkoutEintrag = KraftEintrag | CardioEintrag | DehnEintrag

export interface WorkoutLog {
  id: number
  datum: string // ISO-Datum
  typ: 'kraft' | 'cardio' | 'dehnen'
  dauerMin?: number // Gesamtdauer der Einheit (Start bis Abschluss)
  eintraege: WorkoutEintrag[]
}

export type Trainingsziel = 'kraft' | 'hypertrophie' | 'kraftausdauer'

// Haltungs-Selbstcheck (Abschnitt 5.2b) – ergänzt die Kraft-Ratios,
// damit die Haltungsanalyse auch ohne vollständige Maximalgewichte funktioniert
export interface SelbstcheckAntworten {
  sitzStundenProTag?: number
  wandtestKopfErreichtWand?: 'ja' | 'nein'
  schulternFallenVorn?: 'ja' | 'nein'
  beckenKipptVorn?: 'ja' | 'nein'
  nackenVerspannungen?: 'ja' | 'nein'
  lwsBeschwerden?: 'ja' | 'nein'
}

export interface UserProfile {
  id: number
  alter?: number
  geschlecht?: 'm' | 'w' | 'd'
  ruhePuls?: number
  maxPuls?: number
  trainingsziel: Trainingsziel
  trainingstageProWoche: number
  selbstcheck?: SelbstcheckAntworten & { datum: string }
}

export interface Goal {
  id: number
  // 'cardio_leistung' = Distanz in Zeit bis Datum; 'cardio_zeit'/'cardio_distanz'
  // sind Alt-Typen früherer Versionen und bleiben lesbar
  typ: 'kraft_gewicht' | 'cardio_leistung' | 'cardio_zeit' | 'cardio_distanz'
  referenz: string // CardioTypeId oder exerciseId
  zielwert: number // kg (1RM), km (cardio_leistung/distanz) oder Min. (cardio_zeit)
  zielDauerMin?: number // nur cardio_leistung: Zeitvorgabe für die Distanz
  zieldatum?: string
  status: 'aktiv' | 'erreicht' | 'abgebrochen'
}
