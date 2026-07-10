// Theme-Umschaltung: Dark ist Standard (Abschnitt 5b), Hell und System optional.
// Gespeichert in localStorage, angewendet als Klasse auf <html>.
export type ThemeWahl = 'dunkel' | 'hell' | 'system'

const KEY = 'fittrack-theme'
const SURFACE = { dunkel: '#0a0e14', hell: '#eef1f6' }

const systemHell = () => window.matchMedia('(prefers-color-scheme: light)')

export function gespeicherteWahl(): ThemeWahl {
  const w = localStorage.getItem(KEY)
  return w === 'hell' || w === 'system' ? w : 'dunkel'
}

function wendeAn(wahl: ThemeWahl) {
  const hell = wahl === 'hell' || (wahl === 'system' && systemHell().matches)
  document.documentElement.classList.toggle('light', hell)
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', hell ? SURFACE.hell : SURFACE.dunkel)
}

export function setzeTheme(wahl: ThemeWahl) {
  localStorage.setItem(KEY, wahl)
  wendeAn(wahl)
}

export function initTheme() {
  wendeAn(gespeicherteWahl())
  systemHell().addEventListener('change', () => wendeAn(gespeicherteWahl()))
}
