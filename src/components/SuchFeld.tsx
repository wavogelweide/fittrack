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
      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-base text-gray-100 placeholder-gray-500 outline-none transition-colors focus:border-white/25"
    />
  )
}
