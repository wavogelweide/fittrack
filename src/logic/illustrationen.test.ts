import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CARDIO_GERAETE, DEHN_UEBUNGEN, KRAFT_UEBUNGEN } from '../db/seed'

const dateien = readdirSync('src/assets/illustrations').filter((f) => f.endsWith('.svg'))
const ids = new Set(dateien.map((f) => f.replace('.svg', '')))

describe('Übungs-Illustrationen', () => {
  it('jede Übung im Seed hat eine SVG-Illustration', () => {
    for (const u of [...KRAFT_UEBUNGEN, ...CARDIO_GERAETE, ...DEHN_UEBUNGEN]) {
      expect(ids.has(u.illustrationId), `fehlt: ${u.illustrationId}`).toBe(true)
    }
  })

  it('Kraft- und Cardio-Illustrationen sind animiert (2 Posen), Dehnen/Blackroll statisch mit Pfeil', () => {
    for (const u of [...KRAFT_UEBUNGEN, ...CARDIO_GERAETE]) {
      const svg = readFileSync(`src/assets/illustrations/${u.illustrationId}.svg`, 'utf8')
      expect(svg.includes('class="f2"'), u.illustrationId).toBe(true)
      expect(svg.includes('@keyframes'), u.illustrationId).toBe(true)
    }
    for (const u of DEHN_UEBUNGEN) {
      const svg = readFileSync(`src/assets/illustrations/${u.illustrationId}.svg`, 'utf8')
      expect(svg.includes('class="f2"'), u.illustrationId).toBe(false)
      expect(svg.includes('marker-end'), u.illustrationId).toBe(true)
    }
  })
})
