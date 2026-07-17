// Bindet die generierten SVGs aus src/assets/illustrations/ ein (siehe
// scripts/generate-illustrations.mjs). Kraft/Cardio animieren als CSS-Loop im SVG.
const BILDER = import.meta.glob('../assets/illustrations/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

export default function ExerciseIllustration({
  illustrationId,
  name,
  klein = false,
}: {
  illustrationId: string
  name: string
  klein?: boolean
}) {
  const url = BILDER[`../assets/illustrations/${illustrationId}.svg`]
  if (klein) {
    // Fallback für Übungen ohne SVG (z. B. eigene Übungen): Initial-Kachel
    return url ? (
      <img
        src={url}
        alt=""
        aria-hidden="true"
        className="h-16 w-16 shrink-0 rounded-xl bg-illu"
        draggable={false}
      />
    ) : (
      <div
        aria-hidden="true"
        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-illu text-2xl font-bold text-txt3"
      >
        {name.trim().charAt(0).toUpperCase() || '?'}
      </div>
    )
  }
  if (!url) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-line-strong text-sm text-faint">
        Keine Illustration vorhanden
      </div>
    )
  }
  return (
    <div className="rounded-xl bg-illu p-2">
      <img
        src={url}
        alt={`Illustration: ${name}`}
        className="mx-auto h-52 w-52 max-w-full"
        draggable={false}
      />
    </div>
  )
}
