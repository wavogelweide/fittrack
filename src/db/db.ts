import Dexie, { type EntityTable } from 'dexie'
import type {
  Exercise,
  Goal,
  KoerperMessung,
  MaxWeight,
  StretchExercise,
  UserProfile,
  WorkoutLog,
} from './types'
import { DEHN_UEBUNGEN, KRAFT_UEBUNGEN } from './seed'

class FitTrackDB extends Dexie {
  exercises!: EntityTable<Exercise, 'id'>
  stretches!: EntityTable<StretchExercise, 'id'>
  maxWeights!: EntityTable<MaxWeight, 'id'>
  workoutLogs!: EntityTable<WorkoutLog, 'id'>
  userProfile!: EntityTable<UserProfile, 'id'>
  goals!: EntityTable<Goal, 'id'>
  koerperdaten!: EntityTable<KoerperMessung, 'id'>

  constructor() {
    super('fittrack')
    this.version(1).stores({
      exercises: 'id, name, bewegungsTyp, antagonistGruppe',
      stretches: 'id, name, art',
      maxWeights: '++id, exerciseId, datum',
      workoutLogs: '++id, datum, typ',
      userProfile: '++id',
      goals: '++id, typ, status',
    })
    // v2: Körperdaten-Verlauf (Gewicht/Körperfettanteil)
    this.version(2).stores({
      koerperdaten: '++id, datum',
    })
    this.on('populate', (tx) => {
      void tx.table('exercises').bulkAdd(KRAFT_UEBUNGEN)
      void tx.table('stretches').bulkAdd(DEHN_UEBUNGEN)
    })
  }
}

export const db = new FitTrackDB()
