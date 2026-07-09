// Generiert die PWA-Icons (PNG) ohne externe Abhängigkeiten.
// Motiv: dunkler Hintergrund, neon-cyanfarbene Hantel (Stil nach Abschnitt 5b).
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')
mkdirSync(outDir, { recursive: true })

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function makePng(size, draw) {
  const px = Buffer.alloc(size * size * 4)
  draw(px, size)
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const bg = [10, 14, 20] // #0a0e14
const cyan = [34, 211, 238] // #22d3ee

function drawIcon(px, size) {
  const set = (x, y, [r, g, b]) => {
    const i = (y * size + x) * 4
    px[i] = r
    px[i + 1] = g
    px[i + 2] = b
    px[i + 3] = 255
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) set(x, y, bg)

  const rect = (x0, y0, x1, y1, col) => {
    for (let y = Math.round(y0); y < Math.round(y1); y++)
      for (let x = Math.round(x0); x < Math.round(x1); x++)
        if (x >= 0 && y >= 0 && x < size && y < size) set(x, y, col)
  }

  // Hantel: Griffstange + je zwei Gewichtsscheiben pro Seite, zentriert
  const cy = size / 2
  const barH = size * 0.055
  rect(size * 0.2, cy - barH / 2, size * 0.8, cy + barH / 2, cyan)
  // innere Scheiben (höher), äußere Scheiben (etwas niedriger)
  const plate = (cx, h, w) => rect(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2, cyan)
  plate(size * 0.3, size * 0.42, size * 0.075)
  plate(size * 0.21, size * 0.28, size * 0.06)
  plate(size * 0.7, size * 0.42, size * 0.075)
  plate(size * 0.79, size * 0.28, size * 0.06)
}

for (const [name, size] of [
  ['pwa-192x192.png', 192],
  ['pwa-512x512.png', 512],
  ['apple-touch-icon.png', 180],
]) {
  writeFileSync(join(outDir, name), makePng(size, drawIcon))
  console.log('geschrieben:', name)
}
