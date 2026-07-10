export default function SuchFeld({
  wert,
  onChange,
}: {
  wert: string
  onChange: (wert: string) => void
}) {
  return (
    <input
      type="search"
      inputMode="search"
      placeholder="Suchen…"
      value={wert}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-line bg-elev px-4 py-3 text-base text-txt placeholder-muted outline-none transition-colors focus:border-line-strong"
    />
  )
}
