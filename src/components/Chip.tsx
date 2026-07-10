export type ChipFarbe = 'lime' | 'cyan' | 'violet' | 'neutral'

const FARBEN: Record<ChipFarbe, string> = {
  lime: 'border-neon-lime/40 text-neon-lime',
  cyan: 'border-neon-cyan/40 text-neon-cyan',
  violet: 'border-neon-violet/40 text-neon-violet',
  neutral: 'border-line-strong text-txt3',
}

export default function Chip({ text, farbe = 'neutral' }: { text: string; farbe?: ChipFarbe }) {
  return (
    <span className={`rounded-full border bg-elev px-2.5 py-0.5 text-xs ${FARBEN[farbe]}`}>
      {text}
    </span>
  )
}
