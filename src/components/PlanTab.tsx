import { useState } from 'react'
import { db } from '../db/db'
import { DEHN_UEBUNGEN } from '../db/seed'
import type { Exercise, UserProfile } from '../db/types'
import { backupErinnerung } from '../logic/backup'
import { retestEmpfohlen } from '../logic/deload'
import { montagDerWoche } from '../logic/statistik'
import { alternativeUebungen, setzeAnpassung } from '../logic/planAnpassung'
import { rueckblickFaellig, wochenRueckblick } from '../logic/rueckblick'
import {
  heutigerPlanTag,
  standardWochentage,
  wochentagFuerPlanTag,
} from '../logic/trainingstage'
import type { KraftVorschlag, TrainingsTag } from '../logic/vorschlag'
import ExerciseIllustration from './ExerciseIllustration'
import { useKraftUebungen } from './useKraftUebungen'
import { useWochenplan } from './useWochenplan'
import { useZurueckGeste } from './zurueckGeste'

const DEHN_INFO = Object.fromEntries(DEHN_UEBUNGEN.map((u) => [u.id, u]))

const heute = () => new Date().toISOString().slice(0, 10)

const PRIO: Record<KraftVorschlag['prioritaet'], { label: string; klasse: string } | null> = {
  hoch: { label: 'Priorität', klasse: 'border-neon-lime/40 bg-neon-lime/10 text-neon-lime' },
  erhaltung: { label: 'Erhaltung', klasse: 'border-line-strong bg-elev text-txt3' },
  normal: null,
}

const kg = (n: number) => n.toLocaleString('de-DE', { maximumFractionDigits: 1 })

// Progressions-Chips: automatische Steigerung/Reduktion aus der letzten Einheit
const PROGRESSION_CHIP: Partial<
  Record<NonNullable<KraftVorschlag['progression']>, { label: string; klasse: string }>
> = {
  steigern: { label: '↑ +2,5 kg', klasse: 'border-neon-lime/40 bg-neon-lime/10 text-neon-lime' },
  reduzieren: { label: '↓ −5 %', klasse: 'border-warn/40 bg-warn/10 text-warn' },
}

// Aktualisiert die Plananpassungen im Profil (Übung ersetzen / ausblenden / zurücksetzen)
async function speichereAnpassung(exerciseId: string, wert: string | null | undefined) {
  const profil = await db.userProfile.get(1)
  await db.userProfile.put({
    trainingsziel: 'hypertrophie',
    trainingstageProWoche: 3,
    ...profil,
    id: 1,
    planAnpassungen: setzeAnpassung(profil?.planAnpassungen, exerciseId, wert),
  })
}

function KraftZeile({
  vorschlag,
  info,
  onMenu,
}: {
  vorschlag: KraftVorschlag
  info: Record<string, Exercise>
  onMenu: (v: KraftVorschlag) => void
}) {
  const prio = PRIO[vorschlag.prioritaet]
  const progression = vorschlag.progression && PROGRESSION_CHIP[vorschlag.progression]
  const ersetzt = vorschlag.basisId && vorschlag.basisId !== vorschlag.exerciseId
  const uebung = info[vorschlag.exerciseId]
  return (
    <li className="flex items-center gap-3 border-t border-hairline py-2.5 first:border-t-0">
      <ExerciseIllustration
        klein
        illustrationId={uebung?.illustrationId ?? vorschlag.exerciseId}
        name={uebung?.name ?? vorschlag.exerciseId}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{uebung?.name ?? vorschlag.exerciseId}</p>
          {prio && (
            <span className={`rounded-full border px-2 py-0.5 text-[11px] ${prio.klasse}`}>
              {prio.label}
            </span>
          )}
          {progression && (
            <span className={`rounded-full border px-2 py-0.5 text-[11px] ${progression.klasse}`}>
              {progression.label}
            </span>
          )}
          {ersetzt && (
            <span className="rounded-full border border-neon-cyan/40 bg-neon-cyan/10 px-2 py-0.5 text-[11px] text-neon-cyan">
              ersetzt
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-txt3">
          {vorschlag.saetze} × {vorschlag.wdh[0]}–{vorschlag.wdh[1]} Wdh.
          {vorschlag.gewichtKg !== null ? (
            <span>
              {' · '}
              <span className={`font-semibold ${vorschlag.deload ? 'text-neon-cyan' : 'text-neon-lime'}`}>
                {kg(vorschlag.gewichtKg)} kg
              </span>
            </span>
          ) : (
            <span className="text-faint"> · Gewicht: 1RM fehlt</span>
          )}
        </p>
        {vorschlag.grund && <p className="mt-0.5 text-xs text-muted">{vorschlag.grund}</p>}
      </div>
      {vorschlag.basisId && (
        <button
          onClick={() => onMenu(vorschlag)}
          aria-label="Übung anpassen"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-txt3 active:bg-elev2"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
            <circle cx="5" cy="12" r="1.6" />
            <circle cx="12" cy="12" r="1.6" />
            <circle cx="19" cy="12" r="1.6" />
          </svg>
        </button>
      )}
    </li>
  )
}

// Aktionsmenü: Übung ersetzen (Alternativen mit gleichem Muskel/Bewegung),
// ausblenden oder auf Standard zurücksetzen
function AnpassungsMenue({
  vorschlag,
  alle,
  onClose,
}: {
  vorschlag: KraftVorschlag
  alle: Exercise[]
  onClose: () => void
}) {
  const basisId = vorschlag.basisId!
  const ersetzt = basisId !== vorschlag.exerciseId
  const alternativen = alternativeUebungen(basisId, alle)
  const basisName = alle.find((u) => u.id === basisId)?.name ?? basisId
  const geste = useZurueckGeste(onClose)

  const setze = async (wert: string | null | undefined) => {
    await speichereAnpassung(basisId, wert)
    onClose()
  }

  return (
    <div ref={geste} className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/50" onClick={onClose}>
      <div
        className="max-h-[80vh] overflow-y-auto rounded-t-3xl border-t border-line bg-card px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line-strong" />
        <p className="text-sm font-semibold">{basisName} anpassen</p>
        <p className="mt-0.5 text-xs text-muted">
          Ersetze die Übung durch eine Alternative für dieselbe Muskelgruppe oder blende sie aus.
        </p>

        <div className="mt-3 space-y-1.5">
          {ersetzt && (
            <button
              onClick={() => void setze(undefined)}
              className="flex h-12 w-full items-center rounded-xl border border-line bg-elev px-4 text-left text-sm text-neon-cyan active:bg-elev2"
            >
              ↺ Standardübung ({basisName}) wiederherstellen
            </button>
          )}
          {alternativen.map((alt) => (
            <button
              key={alt.id}
              onClick={() => void setze(alt.id)}
              className={`flex h-12 w-full items-center gap-3 rounded-xl border px-3 text-left text-sm active:bg-elev2 ${
                alt.id === vorschlag.exerciseId
                  ? 'border-neon-lime/40 bg-neon-lime/10 text-neon-lime'
                  : 'border-line bg-elev text-txt'
              }`}
            >
              <ExerciseIllustration klein illustrationId={alt.illustrationId} name={alt.name} />
              <span className="min-w-0 flex-1 truncate">{alt.name}</span>
              {alt.id === vorschlag.exerciseId && <span className="text-xs">aktiv</span>}
            </button>
          ))}
          <button
            onClick={() => void setze(null)}
            className="flex h-12 w-full items-center rounded-xl border border-danger/30 bg-danger/10 px-4 text-left text-sm text-danger active:bg-danger/15"
          >
            ✕ Übung ausblenden
          </button>
        </div>
      </div>
    </div>
  )
}

function TagKarte({
  tag,
  wochentag,
  istHeute,
  info,
  onStart,
  onMenu,
}: {
  tag: TrainingsTag
  wochentag: string | null
  istHeute: boolean
  info: Record<string, Exercise>
  onStart: (tag: TrainingsTag) => void
  onMenu: (v: KraftVorschlag) => void
}) {
  return (
    <div
      className={`rounded-2xl border p-4 backdrop-blur-md ${
        istHeute ? 'border-neon-lime/50 bg-neon-lime/5' : 'border-line bg-elev'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="text-2xl font-bold text-txt">
            Tag {tag.nr}
            {wochentag && <span className="ml-1.5 text-lg font-semibold text-txt3">· {wochentag}</span>}
          </span>
          {istHeute && (
            <span className="ml-2 rounded-full border border-neon-lime/50 bg-neon-lime/15 px-2 py-0.5 align-middle text-[11px] font-semibold text-neon-lime">
              Heute
            </span>
          )}
          <span className="block text-sm text-muted">{tag.name}</span>
        </div>
        <button
          onClick={() => onStart(tag)}
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-neon-lime px-4 font-semibold text-onaccent transition-transform active:scale-[0.97]"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
            <path d="M8 5.5v13l11-6.5z" />
          </svg>
          Start
        </button>
      </div>

      <h3 className="mt-3 text-xs font-semibold uppercase tracking-widest text-muted">Kraft</h3>
      <ul className="mt-1">
        {tag.kraft.map((k) => (
          <KraftZeile
            key={`${k.basisId ?? ''}-${k.exerciseId}`}
            vorschlag={k}
            info={info}
            onMenu={onMenu}
          />
        ))}
      </ul>

      <div className="mt-3 rounded-xl border border-neon-cyan/25 bg-neon-cyan/5 p-3">
        <p className="text-sm font-semibold text-neon-cyan">{tag.cardio.titel}</p>
        <p className="mt-0.5 text-sm leading-relaxed text-txt2">{tag.cardio.beschreibung}</p>
      </div>

      <h3 className="mt-4 text-xs font-semibold uppercase tracking-widest text-muted">
        Dehnen & Rollen
      </h3>
      <ul className="mt-1 space-y-1.5">
        {tag.dehnen.map((d) => {
          const info = DEHN_INFO[d.stretchId]
          return (
            <li key={d.stretchId} className="flex items-baseline justify-between gap-2 text-sm">
              <span className="text-txt2">
                {info?.name ?? d.stretchId}
                {d.grund && <span className="ml-2 text-xs text-muted">({d.grund})</span>}
              </span>
              <span className="shrink-0 text-neon-violet">{info?.halteDauerSek ?? ''} s</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// Deload-Woche starten/beenden über das Profil
async function setzeDeloadWoche(wert: string | undefined) {
  const profil = await db.userProfile.get(1)
  await db.userProfile.put({
    trainingsziel: 'hypertrophie',
    trainingstageProWoche: 3,
    ...profil,
    id: 1,
    deloadWoche: wert,
  })
}

const zahl = (n: number, stellen = 0) =>
  n.toLocaleString('de-DE', { maximumFractionDigits: stellen })

// Profilfeld speichern (mit Defaults, falls noch kein Profil existiert)
async function speichereProfilFeld(patch: Partial<UserProfile>) {
  const profil = await db.userProfile.get(1)
  await db.userProfile.put({
    trainingsziel: 'hypertrophie',
    trainingstageProWoche: 3,
    ...profil,
    ...patch,
    id: 1,
  })
}

export default function PlanTab({
  onStart,
  onFreiesWorkout,
  onOeffneProfil,
}: {
  onStart: (tag: TrainingsTag) => void
  onFreiesWorkout: () => void
  onOeffneProfil: () => void
}) {
  const { plan, profil, deload, logs, maxWeights } = useWochenplan()
  const [menue, setMenue] = useState<KraftVorschlag | null>(null)
  const kraftUebungen = useKraftUebungen()
  const kraftInfo = Object.fromEntries(kraftUebungen.map((u) => [u.id, u]))

  // Wochenrückblick beim ersten Öffnen in einer neuen Woche
  const rueckblick =
    rueckblickFaellig(profil?.rueckblickGesehen, heute()) &&
    wochenRueckblick(logs, maxWeights, heute())
  // 1RM-Retest in der Woche nach dem Deload
  const retest = retestEmpfohlen(profil?.deloadWoche, heute(), profil?.retestQuittiert)
  // Backup-Erinnerung (nur wenn kein Rückblick die Bühne braucht)
  const backup = backupErinnerung(profil?.letztesBackup, heute(), logs.length)

  // Wochentage der Trainingstage (aus dem Profil, sonst gleichmäßig verteilt);
  // der heutige Trainingstag steht zuoberst und ist hervorgehoben
  const wochentage = profil?.trainingsWochentage?.length
    ? profil.trainingsWochentage
    : standardWochentage(profil?.trainingstageProWoche ?? 3)
  const heuteNr = heutigerPlanTag(wochentage, heute(), plan.tage.length)
  const tageSortiert =
    heuteNr === null
      ? plan.tage
      : [...plan.tage.filter((t) => t.nr === heuteNr), ...plan.tage.filter((t) => t.nr !== heuteNr)]

  return (
    <div className="space-y-4">
      {rueckblick && (
        <div className="rounded-2xl border border-neon-violet/40 bg-neon-violet/5 p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-neon-violet">
              Dein Wochenrückblick
            </p>
            <button
              onClick={() => void speichereProfilFeld({ rueckblickGesehen: montagDerWoche(heute()) })}
              aria-label="Rückblick schließen"
              className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-txt3 active:bg-elev2"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-2 text-center">
            <div>
              <p className="text-2xl font-bold text-txt">{rueckblick.einheiten}</p>
              <p className="text-[11px] text-muted">Einheiten</p>
            </div>
            <div>
              <p className="truncate text-2xl font-bold text-txt">{zahl(rueckblick.volumenKg)}</p>
              <p className="text-[11px] text-muted">kg Volumen</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-warn">{rueckblick.rekorde}</p>
              <p className="text-[11px] text-muted">{rueckblick.rekorde === 1 ? 'Rekord' : 'Rekorde'}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-neon-lime">{rueckblick.serieWochen}</p>
              <p className="text-[11px] text-muted">Wo. Serie</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-muted">
            Letzte Woche{rueckblick.cardioMin > 0 ? ` · ${rueckblick.cardioMin} Min. Cardio` : ''} –
            weiter so!
          </p>
        </div>
      )}

      {retest && (
        <div className="rounded-2xl border border-neon-lime/40 bg-neon-lime/5 p-4">
          <p className="text-sm font-semibold text-neon-lime">Maximalgewichte neu testen</p>
          <p className="mt-1 text-sm leading-relaxed text-txt2">
            Deine Deload-Woche ist vorbei – der ideale Zeitpunkt für einen 1RM-Retest. Trage
            neue Maximalgewichte im Katalog ein, damit Plan und Ziele auf frischen Daten stehen.
          </p>
          <button
            onClick={() => void speichereProfilFeld({ retestQuittiert: profil?.deloadWoche })}
            className="mt-3 h-11 w-full rounded-xl border border-line bg-elev text-sm text-txt3 active:bg-elev2"
          >
            Verstanden
          </button>
        </div>
      )}

      {!rueckblick && backup.faellig && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-warn/30 bg-warn/10 p-4">
          <p className="min-w-0 text-sm leading-relaxed text-warn">{backup.grund}</p>
          <button
            onClick={onOeffneProfil}
            className="h-10 shrink-0 rounded-lg border border-warn/40 bg-warn/10 px-3 text-sm font-semibold text-warn active:bg-warn/20"
          >
            Backup
          </button>
        </div>
      )}

      {deload.faellig && (
        <div className="rounded-2xl border border-neon-cyan/40 bg-neon-cyan/5 p-4">
          <p className="text-sm font-semibold text-neon-cyan">Deload-Woche empfohlen</p>
          <p className="mt-1 text-sm leading-relaxed text-txt2">{deload.grund}</p>
          <button
            onClick={() => void setzeDeloadWoche(montagDerWoche(heute()))}
            className="mt-3 h-11 w-full rounded-xl border border-neon-cyan/50 bg-neon-cyan/10 font-semibold text-neon-cyan active:bg-neon-cyan/20"
          >
            Deload-Woche starten
          </button>
        </div>
      )}

      {deload.aktiv && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-neon-cyan/40 bg-neon-cyan/5 p-4">
          <p className="text-sm font-semibold text-neon-cyan">Deload-Woche aktiv</p>
          <button
            onClick={() => {
              // Vorwoche als letzten Deload markieren, damit die Empfehlung
              // nicht sofort wieder erscheint – die Zählung beginnt neu
              const vorwoche = new Date(`${montagDerWoche(heute())}T12:00:00`)
              vorwoche.setDate(vorwoche.getDate() - 7)
              void setzeDeloadWoche(vorwoche.toISOString().slice(0, 10))
            }}
            className="h-9 shrink-0 rounded-lg border border-line bg-elev px-3 text-sm text-txt3 active:bg-elev2"
          >
            Beenden
          </button>
        </div>
      )}

      {plan.hinweise.length > 0 && (
        <div className="rounded-2xl border border-warn/30 bg-warn/10 p-4">
          <ul className="space-y-1.5 text-sm leading-relaxed text-warn">
            {plan.hinweise.map((h) => (
              <li key={h} className="flex gap-2">
                <span aria-hidden="true">•</span>
                {h}
              </li>
            ))}
          </ul>
        </div>
      )}

      {tageSortiert.map((t) => (
        <TagKarte
          key={t.nr}
          tag={t}
          wochentag={wochentagFuerPlanTag(wochentage, t.nr)}
          istHeute={t.nr === heuteNr}
          info={kraftInfo}
          onStart={onStart}
          onMenu={setMenue}
        />
      ))}

      <button
        onClick={onFreiesWorkout}
        className="h-14 w-full rounded-2xl border border-dashed border-line-strong text-txt2 active:bg-elev"
      >
        Freies Workout starten
      </button>

      <p className="px-1 pb-2 text-xs leading-relaxed text-faint">
        Der Plan basiert auf deinen Eingaben, deiner Analyse und deinem Trainingsziel – er passt
        sich automatisch an, sobald sich deine Maximalgewichte ändern. Alle Empfehlungen sind
        Schätzwerte und ersetzen keine physiotherapeutische oder ärztliche Beratung.
      </p>

      {menue && (
        <AnpassungsMenue vorschlag={menue} alle={kraftUebungen} onClose={() => setMenue(null)} />
      )}
    </div>
  )
}
