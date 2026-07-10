// Generiert alle Übungs-Illustrationen als SVG nach src/assets/illustrations/.
// Einheitlicher Stil: Strichfigur (Skelettmodell mit Gelenkwinkeln) + angedeutetes Gerät.
// Kraft/Cardio: 2-Posen-Loop-Animation (CSS im SVG). Dehnen/Blackroll: statisch mit
// Dehnrichtungs-Pfeil, Zielmuskel im Akzentton (Palette nach Abschnitt 5b).
//
// Aufruf: node scripts/generate-illustrations.mjs [--check]
// --check schreibt zusätzlich public/illu-check.html mit allen SVGs als Übersicht.

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'src', 'assets', 'illustrations')
mkdirSync(outDir, { recursive: true })

const AKZENT = { kraft: '#a3e635', cardio: '#22d3ee', dehnen: '#a78bfa', blackroll: '#a78bfa' }
const D = Math.PI / 180
const P = ([x, y], deg, len) => [x + len * Math.cos(deg * D), y + len * Math.sin(deg * D)]
const f = (n) => Math.round(n * 10) / 10
const pt = (p) => `${f(p[0])} ${f(p[1])}`

const line = (a, b) => `<line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}"/>`
const dl = (x1, y1, x2, y2) => line([x1, y1], [x2, y2])
const dc = (cx, cy, r) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${r}"/>`
const roller = (cx, cy, r = 10) => dc(cx, cy, r) + dc(cx, cy, 3)
const ground = (y = 170, x1 = 26, x2 = 174) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" opacity="0.45"/>`

// Skelettmodell: pelvis + Winkel/Längen je Segment → Liniensegmente + Gelenkpunkte
function fig(pose) {
  const j = { pelvis: pose.pelvis }
  const [td, tl, bend] = pose.torso
  j.neck = P(j.pelvis, td, tl)
  j.mid = P(j.pelvis, td, tl / 2)
  let torsoStr
  if (bend) {
    const n = [Math.cos((td - 90) * D), Math.sin((td - 90) * D)]
    const c = [j.mid[0] + n[0] * bend * 2, j.mid[1] + n[1] * bend * 2]
    torsoStr = `<path d="M ${pt(j.pelvis)} Q ${pt(c)} ${pt(j.neck)}"/>`
    j.mid = [(j.pelvis[0] + 2 * c[0] + j.neck[0]) / 4, (j.pelvis[1] + 2 * c[1] + j.neck[1]) / 4]
  } else {
    torsoStr = line(j.pelvis, j.neck)
  }
  j.head = P(j.neck, pose.headDeg ?? td, 13)
  const headStr = `<circle cx="${f(j.head[0])}" cy="${f(j.head[1])}" r="7"/>`

  const segs = { torso: [j.pelvis, j.neck], torsoUpper: [j.mid, j.neck], torsoLower: [j.pelvis, j.mid] }
  const near = []
  const far = []
  for (const [name, anchor, side] of [
    ['armR', j.neck, far],
    ['legR', j.pelvis, far],
    ['armL', j.neck, near],
    ['legL', j.pelvis, near],
  ]) {
    const limb = pose[name]
    if (!limb) continue
    const mitte = P(anchor, ...limb.upper)
    const ende = P(mitte, ...limb.lower)
    const mName = name.startsWith('arm') ? 'elbow' : 'knee'
    const eName = name.startsWith('arm') ? 'hand' : 'foot'
    j[mName + name.slice(3)] = mitte
    j[eName + name.slice(3)] = ende
    segs[(name.startsWith('arm') ? 'upperArm' : 'upperLeg') + name.slice(3)] = [anchor, mitte]
    segs[(name.startsWith('arm') ? 'lowerArm' : 'lowerLeg') + name.slice(3)] = [mitte, ende]
    side.push(line(anchor, mitte) + line(mitte, ende))
    if (limb.foot) {
      const spitze = P(ende, ...limb.foot)
      side.push(line(ende, spitze))
      segs['foot' + name.slice(3) + 'Seg'] = [ende, spitze]
    }
  }
  const str =
    (far.length ? `<g class="far">${far.join('')}</g>` : '') + torsoStr + headStr + near.join('')
  return { str, j, segs }
}

// Akzent-Overlay: Segmente (Halo + Kernlinie) oder Punkte (Kreis) für den Zielmuskel
function akzent(figObj, hl) {
  if (!hl || hl.length === 0) return ''
  const punkte = { hip: 'pelvis', neck: 'neck', footL: 'footL', footR: 'footR' }
  let halo = ''
  let kern = ''
  for (const name of hl) {
    if (punkte[name]) {
      const p = figObj.j[punkte[name]]
      halo += `<circle cx="${f(p[0])}" cy="${f(p[1])}" r="11" fill="currentColor" stroke="none" opacity="0.22"/>`
      kern += `<circle cx="${f(p[0])}" cy="${f(p[1])}" r="4.5" fill="currentColor" stroke="none"/>`
    } else {
      const s = figObj.segs[name]
      if (!s) throw new Error(`Unbekanntes Highlight-Segment: ${name}`)
      halo += line(...s)
      kern += line(...s)
    }
  }
  return `<g class="halo">${halo}</g><g class="acc">${kern}</g>`
}

const arrow = (d) => `<path class="arr" d="${d}" marker-end="url(#ah)"/>`

function svgDatei({ kategorie, device = '', poses, hl = [], arrows = [], attach, extra = '' }) {
  const farbe = AKZENT[kategorie]
  const animiert = poses.length === 2
  let inhalt
  if (animiert) {
    const [a, b] = poses.map((p) => fig(p))
    inhalt =
      `<g class="f1">${a.str}${akzent(a, hl)}${attach ? attach(a.j) : ''}</g>` +
      `<g class="f2">${b.str}${akzent(b, hl)}${attach ? attach(b.j) : ''}</g>`
  } else {
    const a = fig(poses[0])
    inhalt = a.str + akzent(a, hl) + (attach ? attach(a.j) : '') + arrows.map(arrow).join('')
  }
  const anim = animiert
    ? `.f1{animation:fa 1.9s ease-in-out infinite}.f2{opacity:0;animation:fb 1.9s ease-in-out infinite}
@keyframes fa{0%,42%{opacity:1}52%,90%{opacity:0}100%{opacity:1}}
@keyframes fb{0%,42%{opacity:0}52%,90%{opacity:1}100%{opacity:0}}
@media (prefers-reduced-motion:reduce){.f1,.f2{animation:none}}`
    : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none">
<style>
svg{color:${farbe}}
line,path,circle{stroke:#dde3ec;stroke-width:5;stroke-linecap:round;fill:none}
.far line,.far path{stroke:#7d8595}
.dev line,.dev path,.dev circle{stroke:#5c6678;stroke-width:4}
.dev .fill{fill:#39414f;stroke:none}
.halo line{stroke:currentColor;stroke-width:14;opacity:0.22}
.acc line{stroke:currentColor;stroke-width:6}
.arr{stroke:currentColor;stroke-width:3.5;opacity:0.9}
${anim}</style>
<defs><marker id="ah" markerWidth="12" markerHeight="12" refX="8" refY="6" orient="auto" markerUnits="userSpaceOnUse"><path d="M1 1 L10 6 L1 11 Z" style="fill:${farbe};stroke:none"/></marker></defs>
<g class="dev">${device}</g>
${inhalt}${extra}
</svg>`
}

// --- Wiederkehrende Szenen-Bausteine ---------------------------------------
const SITZ_GERAET = dl(68, 128, 108, 128) + dl(88, 128, 88, 166) + dl(74, 166, 102, 166)
const LEHNE = dl(68, 72, 76, 124)
const SITZ_POSE = { pelvis: [88, 120], torso: [-92, 46], legL: { upper: [6, 36], lower: [86, 38] } }
const STAND_BEINE = {
  legL: { upper: [82, 34], lower: [88, 32] },
  legR: { upper: [98, 34], lower: [92, 32] },
}
const ARME_VERSCHRAENKT = { armL: { upper: [35, 14], lower: [-135, 14] } }

// --- Alle 46 Übungen ---------------------------------------------------------
const ENTRIES = [
  // ===== KRAFT (animiert, Akzent Limette) =====
  {
    id: 'brustpresse',
    kategorie: 'kraft',
    device: SITZ_GERAET + LEHNE,
    hl: ['torsoUpper'],
    poses: [
      { ...SITZ_POSE, armL: { upper: [38, 20], lower: [-18, 24] } },
      { ...SITZ_POSE, armL: { upper: [8, 22], lower: [4, 26] } },
    ],
    attach: (j) => `<g class="dev">${dl(j.handL[0], j.handL[1] - 9, j.handL[0], j.handL[1] + 9)}</g>`,
  },
  {
    id: 'butterfly',
    kategorie: 'kraft',
    device: SITZ_GERAET + LEHNE,
    hl: ['torsoUpper'],
    poses: [
      { ...SITZ_POSE, armL: { upper: [-55, 24], lower: [30, 20] } },
      { ...SITZ_POSE, armL: { upper: [2, 24], lower: [12, 20] } },
    ],
    attach: (j) => `<g class="dev">${dl(j.handL[0], j.handL[1] - 8, j.handL[0], j.handL[1] + 8)}</g>`,
  },
  {
    id: 'schulterpresse',
    kategorie: 'kraft',
    device: SITZ_GERAET + LEHNE,
    hl: ['upperArmL'],
    poses: [
      { ...SITZ_POSE, armL: { upper: [-15, 16], lower: [-100, 20] } },
      { ...SITZ_POSE, armL: { upper: [-80, 22], lower: [-84, 22] } },
    ],
    attach: (j) => `<g class="dev">${dl(j.handL[0] - 9, j.handL[1], j.handL[0] + 9, j.handL[1])}</g>`,
  },
  {
    id: 'seitheben',
    kategorie: 'kraft',
    device: ground(),
    hl: ['upperArmL'],
    poses: [
      { pelvis: [100, 106], torso: [-90, 48], ...STAND_BEINE, armL: { upper: [75, 26], lower: [80, 20] } },
      { pelvis: [100, 106], torso: [-90, 48], ...STAND_BEINE, armL: { upper: [2, 26], lower: [-2, 20] } },
    ],
  },
  {
    id: 'trizepsdruecken',
    kategorie: 'kraft',
    device: ground() + dc(126, 26, 5) + dl(126, 14, 126, 21),
    hl: ['upperArmL'],
    poses: [
      { pelvis: [96, 106], torso: [-88, 48], ...STAND_BEINE, armL: { upper: [70, 22], lower: [-28, 22] } },
      { pelvis: [96, 106], torso: [-88, 48], ...STAND_BEINE, armL: { upper: [70, 22], lower: [70, 22] } },
    ],
    attach: (j) =>
      `<g class="dev">${line([126, 31], j.handL)}${dl(j.handL[0] - 8, j.handL[1], j.handL[0] + 8, j.handL[1])}</g>`,
  },
  {
    id: 'dip_maschine',
    kategorie: 'kraft',
    device: SITZ_GERAET + LEHNE,
    hl: ['upperArmL'],
    poses: [
      { ...SITZ_POSE, armL: { upper: [58, 20], lower: [-4, 20] } },
      { ...SITZ_POSE, armL: { upper: [84, 22], lower: [80, 20] } },
    ],
    attach: (j) => `<g class="dev">${dl(j.handL[0] - 8, j.handL[1], j.handL[0] + 8, j.handL[1])}</g>`,
  },
  {
    id: 'rudermaschine',
    kategorie: 'kraft',
    device: SITZ_GERAET + dl(126, 58, 126, 112),
    hl: ['torsoUpper'],
    poses: [
      { ...SITZ_POSE, armL: { upper: [8, 24], lower: [6, 24] } },
      { ...SITZ_POSE, armL: { upper: [135, 18], lower: [-15, 20] } },
    ],
    attach: (j) =>
      `<g class="dev">${line([126, 86], j.handL)}${dl(j.handL[0], j.handL[1] - 8, j.handL[0], j.handL[1] + 8)}</g>`,
  },
  {
    id: 'latzug',
    kategorie: 'kraft',
    device: SITZ_GERAET + dl(90, 16, 90, 24),
    hl: ['torsoUpper'],
    poses: [
      { ...SITZ_POSE, armL: { upper: [-72, 24], lower: [-70, 22] } },
      { ...SITZ_POSE, armL: { upper: [-135, 20], lower: [-60, 18] } },
    ],
    attach: (j) =>
      `<g class="dev">${dl(j.handL[0] - 16, j.handL[1], j.handL[0] + 16, j.handL[1])}${line([90, 24], j.handL)}</g>`,
  },
  {
    id: 'reverse_fly',
    kategorie: 'kraft',
    device: SITZ_GERAET + dl(116, 66, 116, 120),
    hl: ['torsoUpper'],
    poses: [
      { ...SITZ_POSE, armL: { upper: [5, 26], lower: [5, 18] } },
      { ...SITZ_POSE, armL: { upper: [168, 24], lower: [172, 16] } },
    ],
  },
  {
    id: 'bizepscurls',
    kategorie: 'kraft',
    device: SITZ_GERAET + dl(94, 96, 124, 106),
    hl: ['upperArmL'],
    poses: [
      { ...SITZ_POSE, armL: { upper: [35, 22], lower: [30, 24] } },
      { ...SITZ_POSE, armL: { upper: [35, 22], lower: [-75, 22] } },
    ],
  },
  {
    id: 'beinstrecker',
    kategorie: 'kraft',
    device: SITZ_GERAET + LEHNE,
    hl: ['upperLegL'],
    poses: [
      { pelvis: [88, 120], torso: [-92, 46], ...ARME_VERSCHRAENKT, legL: { upper: [8, 36], lower: [88, 38] } },
      { pelvis: [88, 120], torso: [-92, 46], ...ARME_VERSCHRAENKT, legL: { upper: [8, 36], lower: [10, 40] } },
    ],
    attach: (j) => `<g class="dev">${dc(j.footL[0], j.footL[1], 5)}</g>`,
  },
  {
    id: 'beinpresse',
    kategorie: 'kraft',
    device: dl(38, 84, 68, 130) + dl(52, 130, 52, 166) + dl(38, 166, 70, 166),
    hl: ['upperLegL'],
    poses: [
      {
        pelvis: [76, 122], torso: [-135, 44],
        armL: { upper: [40, 16], lower: [80, 12] },
        legL: { upper: [-18, 32], lower: [58, 34] },
      },
      {
        pelvis: [76, 122], torso: [-135, 44],
        armL: { upper: [40, 16], lower: [80, 12] },
        legL: { upper: [-8, 36], lower: [10, 38] },
      },
    ],
    attach: (j) => {
      const s = P(j.footL, -60, 4)
      return `<g class="dev">${dl(s[0] + 4, s[1] - 20, s[0] + 12, s[1] + 20)}</g>`
    },
  },
  {
    id: 'beinbeuger',
    kategorie: 'kraft',
    device: dl(44, 144, 152, 144) + dl(56, 144, 56, 166) + dl(140, 144, 140, 166),
    hl: ['upperLegL'],
    poses: [
      {
        pelvis: [110, 138], torso: [184, 50], headDeg: 178,
        armL: { upper: [95, 20], lower: [100, 16] },
        legL: { upper: [-6, 34], lower: [4, 36] },
      },
      {
        pelvis: [110, 138], torso: [184, 50], headDeg: 178,
        armL: { upper: [95, 20], lower: [100, 16] },
        legL: { upper: [-6, 34], lower: [-80, 34] },
      },
    ],
    attach: (j) => `<g class="dev">${dc(j.footL[0], j.footL[1], 5)}</g>`,
  },
  {
    id: 'wadenheben',
    kategorie: 'kraft',
    device: `<rect class="fill" x="82" y="158" width="46" height="10" rx="2"/>` + ground(170, 30, 170),
    hl: ['lowerLegL'],
    poses: [
      {
        pelvis: [100, 108], torso: [-90, 46],
        armL: { upper: [80, 24], lower: [85, 20] },
        legL: { upper: [86, 30], lower: [90, 22], foot: [0, 14] },
      },
      {
        pelvis: [100, 100], torso: [-90, 46],
        armL: { upper: [80, 24], lower: [85, 20] },
        legL: { upper: [86, 30], lower: [90, 24], foot: [-30, 14] },
      },
    ],
  },
  {
    id: 'glute_kickback',
    kategorie: 'kraft',
    device: dl(146, 62, 146, 166) + ground(),
    hl: ['hip'],
    poses: [
      {
        pelvis: [92, 112], torso: [-40, 46],
        armL: { upper: [65, 24], lower: [70, 18] },
        legL: { upper: [92, 36], lower: [88, 30] },
        legR: { upper: [110, 34], lower: [95, 28] },
      },
      {
        pelvis: [92, 112], torso: [-40, 46],
        armL: { upper: [65, 24], lower: [70, 18] },
        legL: { upper: [92, 36], lower: [88, 30] },
        legR: { upper: [155, 36], lower: [160, 30] },
      },
    ],
  },
  {
    id: 'abduktoren_maschine',
    kategorie: 'kraft',
    device: dl(100, 122, 100, 166) + dl(84, 166, 116, 166),
    hl: ['upperLegL', 'upperLegR'],
    poses: [
      {
        pelvis: [100, 114], torso: [-90, 44],
        armL: { upper: [115, 24], lower: [110, 16] }, armR: { upper: [65, 24], lower: [70, 16] },
        legL: { upper: [84, 32], lower: [88, 32] }, legR: { upper: [96, 32], lower: [92, 32] },
      },
      {
        pelvis: [100, 114], torso: [-90, 44],
        armL: { upper: [115, 24], lower: [110, 16] }, armR: { upper: [65, 24], lower: [70, 16] },
        legL: { upper: [118, 32], lower: [112, 32] }, legR: { upper: [62, 32], lower: [68, 32] },
      },
    ],
  },
  {
    id: 'adduktoren_maschine',
    kategorie: 'kraft',
    device: dl(100, 122, 100, 166) + dl(84, 166, 116, 166),
    hl: ['upperLegL', 'upperLegR'],
    poses: [
      {
        pelvis: [100, 114], torso: [-90, 44],
        armL: { upper: [115, 24], lower: [110, 16] }, armR: { upper: [65, 24], lower: [70, 16] },
        legL: { upper: [118, 32], lower: [112, 32] }, legR: { upper: [62, 32], lower: [68, 32] },
      },
      {
        pelvis: [100, 114], torso: [-90, 44],
        armL: { upper: [115, 24], lower: [110, 16] }, armR: { upper: [65, 24], lower: [70, 16] },
        legL: { upper: [84, 32], lower: [88, 32] }, legR: { upper: [96, 32], lower: [92, 32] },
      },
    ],
  },
  {
    id: 'crunch_maschine',
    kategorie: 'kraft',
    device: SITZ_GERAET + LEHNE,
    hl: ['torsoLower'],
    poses: [
      { ...SITZ_POSE, torso: [-88, 46], ...ARME_VERSCHRAENKT },
      { ...SITZ_POSE, torso: [-56, 42], ...ARME_VERSCHRAENKT },
    ],
  },
  {
    id: 'rueckenstrecker_maschine',
    kategorie: 'kraft',
    device: SITZ_GERAET + dl(118, 92, 118, 126),
    hl: ['torsoLower'],
    poses: [
      { ...SITZ_POSE, torso: [-52, 44], ...ARME_VERSCHRAENKT },
      { ...SITZ_POSE, torso: [-98, 46], ...ARME_VERSCHRAENKT },
    ],
  },
  {
    id: 'rumpfrotation',
    kategorie: 'kraft',
    device: dl(100, 122, 100, 166) + dl(84, 166, 116, 166),
    hl: ['torsoLower'],
    poses: [
      {
        pelvis: [100, 114], torso: [-102, 44],
        armL: { upper: [178, 24], lower: [182, 14] }, armR: { upper: [-4, 24], lower: [0, 14] },
        legL: { upper: [84, 32], lower: [88, 32] }, legR: { upper: [96, 32], lower: [92, 32] },
      },
      {
        pelvis: [100, 114], torso: [-78, 44],
        armL: { upper: [178, 24], lower: [174, 14] }, armR: { upper: [-4, 24], lower: [4, 14] },
        legL: { upper: [84, 32], lower: [88, 32] }, legR: { upper: [96, 32], lower: [92, 32] },
      },
    ],
  },

  // ===== CARDIO (animiert, Akzent Cyan) =====
  {
    id: 'laufband',
    kategorie: 'cardio',
    device:
      dl(48, 160, 152, 154) + dl(144, 154, 154, 96) + dl(148, 96, 168, 92) +
      `<path class="arr" d="M150 88 l10 -2" opacity="0.9"/>`,
    poses: [
      {
        pelvis: [96, 104], torso: [-80, 44],
        armL: { upper: [-25, 20], lower: [35, 18] }, armR: { upper: [120, 20], lower: [55, 18] },
        legL: { upper: [48, 32], lower: [96, 28] }, legR: { upper: [128, 32], lower: [-155, 26] },
      },
      {
        pelvis: [96, 104], torso: [-80, 44],
        armL: { upper: [120, 20], lower: [55, 18] }, armR: { upper: [-25, 20], lower: [35, 18] },
        legL: { upper: [128, 32], lower: [-155, 26] }, legR: { upper: [48, 32], lower: [96, 28] },
      },
    ],
  },
  {
    id: 'ergometer',
    kategorie: 'cardio',
    device:
      dc(62, 148, 16) + dc(142, 148, 13) +
      dl(62, 148, 100, 138) + dl(100, 138, 142, 148) + dl(100, 138, 96, 104) +
      dl(88, 104, 106, 104) + dl(100, 138, 132, 96) + dl(126, 94, 140, 90),
    poses: [
      {
        pelvis: [96, 100], torso: [-72, 42],
        armL: { upper: [38, 22], lower: [58, 20] },
        legL: { upper: [55, 26], lower: [95, 22] }, legR: { upper: [98, 24], lower: [65, 22] },
      },
      {
        pelvis: [96, 100], torso: [-72, 42],
        armL: { upper: [38, 22], lower: [58, 20] },
        legL: { upper: [98, 26], lower: [62, 22] }, legR: { upper: [55, 24], lower: [98, 22] },
      },
    ],
    attach: (j) =>
      `<g class="dev">${dl(j.footL[0] - 7, j.footL[1], j.footL[0] + 7, j.footL[1])}${dl(j.footR[0] - 7, j.footR[1], j.footR[0] + 7, j.footR[1])}</g>`,
  },
  {
    id: 'crosstrainer',
    kategorie: 'cardio',
    device: dl(64, 166, 152, 166) + dl(128, 166, 128, 64),
    poses: [
      {
        pelvis: [100, 102], torso: [-85, 44],
        armL: { upper: [8, 22], lower: [18, 20] }, armR: { upper: [58, 20], lower: [30, 18] },
        legL: { upper: [62, 34], lower: [92, 28] }, legR: { upper: [112, 34], lower: [82, 28] },
      },
      {
        pelvis: [100, 102], torso: [-85, 44],
        armL: { upper: [58, 20], lower: [30, 18] }, armR: { upper: [8, 22], lower: [18, 20] },
        legL: { upper: [112, 34], lower: [82, 28] }, legR: { upper: [62, 34], lower: [92, 28] },
      },
    ],
    attach: (j) =>
      `<g class="dev">${line([128, 80], j.handL)}${line([128, 80], j.handR)}${dl(j.footL[0] - 9, j.footL[1] + 3, j.footL[0] + 9, j.footL[1] + 3)}${dl(j.footR[0] - 9, j.footR[1] + 3, j.footR[0] + 9, j.footR[1] + 3)}</g>`,
  },

  // ===== DEHNEN (statisch, Pfeil = Dehnrichtung, Akzent Violett) =====
  {
    id: 'brust_tuerrahmen',
    kategorie: 'dehnen',
    device: dl(128, 38, 128, 152) + ground(166),
    hl: ['torsoUpper'],
    poses: [{
      pelvis: [92, 110], torso: [-88, 46],
      armL: { upper: [15, 20], lower: [-75, 22] },
      legL: { upper: [78, 30], lower: [84, 28] }, legR: { upper: [102, 30], lower: [96, 28] },
    }],
    arrows: ['M 78 68 Q 62 74 66 90'],
  },
  {
    id: 'nacken_seitlich',
    kategorie: 'dehnen',
    device: ground(),
    hl: ['neck'],
    poses: [{
      pelvis: [100, 110], torso: [-90, 46], headDeg: -48,
      armL: { upper: [110, 24], lower: [105, 18] }, armR: { upper: [70, 24], lower: [75, 18] },
      ...STAND_BEINE,
    }],
    arrows: ['M 122 46 Q 130 56 124 68'],
  },
  {
    id: 'hueftbeuger_ausfallschritt',
    kategorie: 'dehnen',
    device: ground(),
    hl: ['hip'],
    poses: [{
      pelvis: [96, 130], torso: [-84, 44],
      armL: { upper: [80, 22], lower: [85, 18] },
      legL: { upper: [25, 34], lower: [90, 28] },
      legR: { upper: [150, 38], lower: [178, 32] },
    }],
    arrows: ['M 74 124 L 94 120'],
  },
  {
    id: 'beinbeuger_stehend',
    kategorie: 'dehnen',
    device: `<rect class="fill" x="128" y="128" width="42" height="6" rx="2"/>` + dl(136, 134, 136, 168) + dl(162, 134, 162, 168) + ground(),
    hl: ['upperLegL'],
    poses: [{
      pelvis: [86, 122], torso: [-48, 44],
      armL: { upper: [42, 24], lower: [48, 20] },
      legL: { upper: [4, 38], lower: [0, 26] },
      legR: { upper: [94, 32], lower: [90, 26] },
    }],
    arrows: ['M 106 68 Q 120 74 126 90'],
  },
  {
    id: 'quadrizeps_stehend',
    kategorie: 'dehnen',
    device: ground(),
    hl: ['upperLegL'],
    poses: [{
      pelvis: [100, 104], torso: [-92, 46],
      armL: { upper: [155, 22], lower: [110, 30] },
      legL: { upper: [130, 34], lower: [-100, 30] },
      legR: { upper: [92, 34], lower: [90, 32] },
    }],
    arrows: ['M 86 132 Q 74 120 80 106'],
  },
  {
    id: 'waden_wand',
    kategorie: 'dehnen',
    device: dl(148, 56, 148, 168) + ground(168, 26, 148),
    hl: ['lowerLegR'],
    poses: [{
      pelvis: [88, 112], torso: [-60, 46],
      armL: { upper: [12, 22], lower: [20, 18] },
      legL: { upper: [72, 32], lower: [86, 28] },
      legR: { upper: [116, 36], lower: [104, 26] },
    }],
    arrows: ['M 66 150 L 84 158'],
  },
  {
    id: 'gesaess_liegend',
    kategorie: 'dehnen',
    device: ground(164),
    hl: ['hip'],
    poses: [{
      pelvis: [108, 152], torso: [175, 46],
      armL: { upper: [-20, 22], lower: [-45, 20] },
      legL: { upper: [-70, 32], lower: [190, 30] },
      legR: { upper: [-115, 30], lower: [-15, 24] },
    }],
    arrows: ['M 100 116 L 82 130'],
  },
  {
    id: 'adduktoren_schmetterling',
    kategorie: 'dehnen',
    device: ground(164),
    hl: ['upperLegL', 'upperLegR'],
    poses: [{
      pelvis: [100, 140], torso: [-90, 46],
      armL: { upper: [125, 26], lower: [60, 14] }, armR: { upper: [55, 26], lower: [120, 14] },
      legL: { upper: [35, 30], lower: [175, 28] },
      legR: { upper: [145, 30], lower: [5, 28] },
    }],
    arrows: ['M 128 144 L 132 158', 'M 72 144 L 68 158'],
  },
  {
    id: 'lat_kniestand',
    kategorie: 'dehnen',
    device: ground(168),
    hl: ['torsoUpper'],
    poses: [{
      pelvis: [128, 142], torso: [165, 50], headDeg: 150,
      armL: { upper: [180, 26], lower: [178, 22] },
      legL: { upper: [110, 24], lower: [178, 26] },
    }],
    arrows: ['M 58 142 L 36 142'],
  },
  {
    id: 'schulter_ueberkreuz',
    kategorie: 'dehnen',
    device: ground(),
    hl: ['upperArmL'],
    poses: [{
      pelvis: [100, 112], torso: [-90, 46],
      armL: { upper: [175, 24], lower: [165, 18] },
      armR: { upper: [115, 22], lower: [200, 24] },
      ...STAND_BEINE,
    }],
    arrows: ['M 84 58 L 64 58'],
  },
  {
    id: 'trizeps_ueberkopf',
    kategorie: 'dehnen',
    device: ground(),
    hl: ['upperArmL'],
    poses: [{
      pelvis: [100, 112], torso: [-90, 46],
      armL: { upper: [-75, 24], lower: [150, 20] },
      armR: { upper: [-100, 26], lower: [15, 12] },
      ...STAND_BEINE,
    }],
    arrows: ['M 118 38 Q 124 48 118 56'],
  },
  {
    id: 'knie_zur_brust',
    kategorie: 'dehnen',
    device: ground(164),
    hl: ['torsoLower'],
    poses: [{
      pelvis: [104, 152], torso: [172, 46],
      armL: { upper: [-10, 26], lower: [-50, 22] },
      legL: { upper: [-60, 30], lower: [160, 26] },
    }],
    arrows: ['M 102 124 L 84 136'],
  },
  {
    id: 'bws_rotation',
    kategorie: 'dehnen',
    device: ground(164),
    hl: ['torsoUpper'],
    poses: [{
      pelvis: [124, 132], torso: [187, 48],
      armL: { upper: [90, 32], lower: [95, 4] },
      armR: { upper: [-80, 30], lower: [-70, 20] },
      legL: { upper: [100, 26], lower: [175, 26] },
    }],
    arrows: ['M 96 82 Q 112 66 126 76'],
  },
  {
    id: 'katze_kuh',
    kategorie: 'dehnen',
    device: ground(164),
    hl: ['torso'],
    poses: [{
      pelvis: [124, 132], torso: [187, 48, -14], headDeg: 210,
      armL: { upper: [90, 32], lower: [95, 4] },
      legL: { upper: [100, 26], lower: [175, 26] },
    }],
    arrows: ['M 100 96 L 100 78'],
  },
  {
    id: 'kindhaltung',
    kategorie: 'dehnen',
    device: ground(168),
    hl: ['torso'],
    poses: [{
      pelvis: [132, 150], torso: [168, 50], headDeg: 155,
      armL: { upper: [182, 26], lower: [178, 20] },
      legL: { upper: [115, 20], lower: [185, 22] },
    }],
    arrows: ['M 62 146 L 40 148'],
  },

  // ===== BLACKROLL (statisch, Rollrichtung als Pfeil, Akzent Violett) =====
  {
    id: 'br_bws',
    kategorie: 'blackroll',
    device: roller(100, 148) + ground(164),
    hl: ['torsoUpper'],
    poses: [{
      pelvis: [138, 132], torso: [175, 46], headDeg: 200,
      armL: { upper: [-140, 14], lower: [-170, 10] },
      legL: { upper: [-30, 28], lower: [82, 34] },
    }],
    arrows: ['M 82 172 L 118 172'],
  },
  {
    id: 'br_beinbeuger',
    kategorie: 'blackroll',
    device: roller(102, 146) + ground(160),
    hl: ['upperLegL'],
    poses: [{
      pelvis: [72, 138], torso: [-80, 44],
      armL: { upper: [140, 22], lower: [95, 26] },
      legL: { upper: [-6, 36], lower: [2, 34] },
    }],
    arrows: ['M 86 170 L 118 170'],
  },
  {
    id: 'br_quadrizeps',
    kategorie: 'blackroll',
    device: roller(136, 150) + ground(164),
    hl: ['upperLegL'],
    poses: [{
      pelvis: [116, 140], torso: [187, 48], headDeg: 200,
      armL: { upper: [85, 24], lower: [0, 20] },
      legL: { upper: [6, 34], lower: [2, 32] },
    }],
    arrows: ['M 116 172 L 148 172'],
  },
  {
    id: 'br_waden',
    kategorie: 'blackroll',
    device: roller(124, 146) + ground(160),
    hl: ['lowerLegL'],
    poses: [{
      pelvis: [72, 138], torso: [-80, 44],
      armL: { upper: [140, 22], lower: [95, 26] },
      legL: { upper: [-4, 34], lower: [0, 34] },
    }],
    arrows: ['M 104 170 L 136 170'],
  },
  {
    id: 'br_gesaess',
    kategorie: 'blackroll',
    device: roller(96, 148) + ground(164),
    hl: ['hip'],
    poses: [{
      pelvis: [96, 134], torso: [-80, 44],
      armL: { upper: [140, 22], lower: [95, 28] },
      legL: { upper: [15, 32], lower: [92, 22] },
      legR: { upper: [-22, 30], lower: [42, 18] },
    }],
    arrows: ['M 76 172 L 108 172'],
  },
  {
    id: 'br_it_band',
    kategorie: 'blackroll',
    device: roller(132, 148) + ground(162),
    hl: ['upperLegL'],
    poses: [{
      pelvis: [112, 138], torso: [185, 46], headDeg: 200,
      armL: { upper: [95, 26], lower: [5, 20] },
      legL: { upper: [5, 34], lower: [8, 32] },
    }],
    arrows: ['M 108 170 L 142 170'],
  },
  {
    id: 'br_lat',
    kategorie: 'blackroll',
    device: roller(90, 146) + ground(160),
    hl: ['torsoUpper'],
    poses: [{
      pelvis: [128, 142], torso: [190, 46], headDeg: 215,
      armL: { upper: [185, 26], lower: [182, 20] },
      legL: { upper: [40, 30], lower: [95, 24] },
    }],
    arrows: ['M 68 168 L 100 168'],
  },
  {
    id: 'br_fusssohle',
    kategorie: 'blackroll',
    device: dc(126, 158, 6) + dc(126, 158, 2) + ground(168, 26, 174),
    hl: ['footL'],
    poses: [{
      pelvis: [100, 106], torso: [-90, 46],
      armL: { upper: [100, 24], lower: [95, 18] },
      legL: { upper: [28, 34], lower: [86, 30] },
      legR: { upper: [96, 32], lower: [92, 30] },
    }],
    arrows: ['M 112 174 L 140 174'],
  },
]

let checkHtml = ''
for (const e of ENTRIES) {
  const svg = svgDatei(e)
  writeFileSync(join(outDir, `${e.id}.svg`), svg)
  checkHtml += `<figure><div>${svg}</div><figcaption>${e.id} (${e.kategorie})</figcaption></figure>\n`
}
console.log(`${ENTRIES.length} SVGs geschrieben nach src/assets/illustrations/`)

if (process.argv.includes('--check')) {
  writeFileSync(
    join(root, 'public', 'illu-check.html'),
    `<!doctype html><meta charset="utf-8"><title>Illustrations-Check</title>
<style>body{background:#0a0e14;color:#9ca3af;font-family:sans-serif;display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px;padding:16px}
figure{margin:0;text-align:center}figure div{background:#121826;border-radius:12px}svg{width:100%;height:auto}figcaption{font-size:11px;margin-top:4px}</style>
${checkHtml}`,
  )
  console.log('Check-Seite: public/illu-check.html')
}
