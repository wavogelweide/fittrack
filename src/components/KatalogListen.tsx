import { useState } from 'react'
import { ART_LABELS, MUSKEL_LABELS } from '../db/labels'
import type { CardioGeraet, Exercise, StretchArt, StretchExercise } from '../db/types'
import Chip from './Chip'
import ExerciseIllustration from './ExerciseIllustration'

function KatalogKarte({
  onClick,
  thumb,
  children,
}: {
  onClick: () => void
  thumb?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-line bg-elev p-4 text-left backdrop-blur-md transition-transform active:scale-[0.98]"
    >
      {thumb}
      <div className="min-w-0 flex-1">{children}</div>
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-faint" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </button>
  )
}

function KeineTreffer() {
  return <p className="py-10 text-center text-muted">Keine Treffer.</p>
}

export function KraftListe({
  uebungen,
  onAuswahl,
}: {
  uebungen: Exercise[]
  onAuswahl: (u: Exercise) => void
}) {
  if (uebungen.length === 0) return <KeineTreffer />
  return (
    <div className="space-y-3">
      {uebungen.map((u) => (
        <KatalogKarte
          key={u.id}
          onClick={() => onAuswahl(u)}
          thumb={<ExerciseIllustration klein illustrationId={u.illustrationId} name={u.name} />}
        >
          <p className="font-semibold">{u.name}</p>
          <p className="mt-0.5 truncate text-sm text-muted">{u.maschine}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {u.primaerMuskeln.map((m) => (
              <Chip key={m} text={MUSKEL_LABELS[m]} farbe="lime" />
            ))}
          </div>
        </KatalogKarte>
      ))}
    </div>
  )
}

export function CardioListe({
  geraete,
  onAuswahl,
}: {
  geraete: CardioGeraet[]
  onAuswahl: (g: CardioGeraet) => void
}) {
  if (geraete.length === 0) return <KeineTreffer />
  return (
    <div className="space-y-3">
      {geraete.map((g) => (
        <KatalogKarte
          key={g.id}
          onClick={() => onAuswahl(g)}
          thumb={<ExerciseIllustration klein illustrationId={g.illustrationId} name={g.name} />}
        >
          <p className="font-semibold">{g.name}</p>
          <p className="mt-0.5 line-clamp-2 text-sm text-muted">{g.beschreibung}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip text="GA1" farbe="cyan" />
            <Chip text="60/120-Intervalle" farbe="cyan" />
          </div>
        </KatalogKarte>
      ))}
    </div>
  )
}

const ART_FILTER: { id: StretchArt | 'alle'; label: string }[] = [
  { id: 'alle', label: 'Alle' },
  { id: 'dehnen', label: 'Dehnen' },
  { id: 'blackroll', label: 'Blackroll' },
]

export function DehnListe({
  uebungen,
  onAuswahl,
}: {
  uebungen: StretchExercise[]
  onAuswahl: (u: StretchExercise) => void
}) {
  const [art, setArt] = useState<StretchArt | 'alle'>('alle')
  const gefiltert = art === 'alle' ? uebungen : uebungen.filter((u) => u.art === art)

  return (
    <div>
      <div className="mb-3 flex gap-2">
        {ART_FILTER.map((f) => (
          <button
            key={f.id}
            onClick={() => setArt(f.id)}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              art === f.id
                ? 'border-neon-violet/50 bg-neon-violet/10 text-neon-violet'
                : 'border-line bg-elev text-txt3'
           }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      {gefiltert.length === 0 ? (
        <KeineTreffer />
      ) : (
        <div className="space-y-3">
          {gefiltert.map((u) => (
            <KatalogKarte
              key={u.id}
              onClick={() => onAuswahl(u)}
              thumb={<ExerciseIllustration klein illustrationId={u.illustrationId} name={u.name} />}
            >
              <p className="font-semibold">{u.name}</p>
              <p className="mt-0.5 text-sm text-muted">
                {ART_LABELS[u.art]} · {u.halteDauerSek} Sek.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {u.zielMuskeln.map((m) => (
                  <Chip key={m} text={MUSKEL_LABELS[m]} farbe="violet" />
                ))}
              </div>
            </KatalogKarte>
          ))}
        </div>
      )}
    </div>
  )
}
