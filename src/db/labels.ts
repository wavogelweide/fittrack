import type { BewegungsTyp, Muskel, StretchArt } from './types'

export const MUSKEL_LABELS: Record<Muskel, string> = {
  brust: 'Brust',
  vordere_schulter: 'Vordere Schulter',
  seitliche_schulter: 'Seitliche Schulter',
  hintere_schulter: 'Hintere Schulter',
  nacken_trapez: 'Nacken/Trapez',
  latissimus: 'Latissimus',
  oberer_ruecken: 'Oberer Rücken',
  rueckenstrecker: 'Rückenstrecker',
  bizeps: 'Bizeps',
  trizeps: 'Trizeps',
  unterarme: 'Unterarme',
  bauch: 'Bauch',
  seitlicher_bauch: 'Seitlicher Bauch',
  hueftbeuger: 'Hüftbeuger',
  gesaess: 'Gesäß',
  abduktoren: 'Abduktoren',
  adduktoren: 'Adduktoren',
  beinstrecker: 'Beinstrecker (Quadrizeps)',
  beinbeuger: 'Beinbeuger',
  waden: 'Waden',
  fusssohle: 'Fußsohle',
}

export const BEWEGUNGSTYP_LABELS: Record<BewegungsTyp, string> = {
  push: 'Drücken',
  pull: 'Ziehen',
  legs_front: 'Beine – Vorderseite',
  legs_back: 'Beine – Rückseite',
  core: 'Rumpf',
}

export const ART_LABELS: Record<StretchArt, string> = {
  dehnen: 'Dehnen',
  blackroll: 'Blackroll',
}
