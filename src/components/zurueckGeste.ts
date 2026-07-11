// Zurück-Wischgeste für Overlays.
//
// Zwei Mechanismen, weil iOS im Standalone-PWA-Modus KEINE native
// Randwischgeste anbietet:
// 1. History-Integration: jedes offene Overlay legt einen History-Eintrag an;
//    Browser-Zurück (Safari-Geste im Browser, Android-Back) löst popstate aus
//    und schließt das oberste Overlay statt die App zu verlassen.
// 2. Eigene Touch-Geste: Ziehen vom linken Rand schiebt das Overlay mit dem
//    Finger nach rechts; ab ausreichender Distanz wird geschlossen, sonst
//    schnappt es zurück. Funktioniert damit auch als installierte PWA.
import { useEffect, useRef } from 'react'

interface Eintrag {
  // false zurückgeben = Overlay bleibt offen (z. B. Abbruch im confirm)
  onZurueck: () => boolean | void
}

const stapel: Eintrag[] = []
let eigeneBacks = 0 // von uns ausgelöste history.back()-Aufrufe ignorieren
let listenerRegistriert = false

function popstateHandler() {
  if (eigeneBacks > 0) {
    eigeneBacks--
    return
  }
  const oben = stapel[stapel.length - 1]
  if (!oben) return
  if (oben.onZurueck() === false) {
    // Overlay bleibt offen → den soeben weggewischten Eintrag wiederherstellen
    window.history.pushState({ fittrackOverlay: true }, '')
  } else {
    stapel.pop()
  }
}

const RAND_PX = 32 // Startzone der Geste am linken Rand
const RICHTUNGS_SCHWELLE_PX = 10

// Im offenen Overlay aufrufen (Mount = Overlay sichtbar). onZurueck wird bei
// der Geste bzw. Browser-Zurück ausgeführt und soll das Overlay schließen;
// false halten es offen. Den zurückgegebenen Ref auf das Overlay-Wurzelelement
// setzen, damit die Touch-Geste greift.
export function useZurueckGeste(onZurueck: () => boolean | void) {
  const aktuell = useRef(onZurueck)
  aktuell.current = onZurueck
  const flaeche = useRef<HTMLDivElement | null>(null)

  // 1) History-Eintrag fürs Browser-Zurück
  useEffect(() => {
    const eintrag: Eintrag = { onZurueck: () => aktuell.current() }
    stapel.push(eintrag)
    window.history.pushState({ fittrackOverlay: true }, '')
    if (!listenerRegistriert) {
      window.addEventListener('popstate', popstateHandler)
      listenerRegistriert = true
    }
    return () => {
      const idx = stapel.indexOf(eintrag)
      if (idx >= 0) {
        // per Button/Geste geschlossen → History-Eintrag still entfernen
        stapel.splice(idx, 1)
        eigeneBacks++
        window.history.back()
      }
      // idx === -1: schon durch popstate geschlossen
    }
  }, [])

  // 2) Eigene Randwischgeste (nötig für iOS-Standalone-PWA)
  useEffect(() => {
    const el = flaeche.current
    if (!el) return

    let startX = 0
    let startY = 0
    let dx = 0
    let verfolgt = false // Finger startete am Rand
    let zieht = false // horizontale Richtung erkannt, Overlay folgt

    const zuruecksetzen = (animiert: boolean) => {
      el.style.transition = animiert ? 'transform 180ms ease-out' : ''
      el.style.transform = ''
      verfolgt = false
      zieht = false
      dx = 0
    }

    const start = (e: TouchEvent) => {
      const t = e.touches[0]
      if (e.touches.length !== 1 || t.clientX > RAND_PX) return
      // Verschachtelte Overlays: nur das innerste (zuerst erreichte) Overlay
      // verarbeitet die Geste – sonst schließt ein Wisch beide gleichzeitig
      e.stopPropagation()
      startX = t.clientX
      startY = t.clientY
      dx = 0
      verfolgt = true
      zieht = false
    }

    const move = (e: TouchEvent) => {
      if (!verfolgt) return
      e.stopPropagation()
      const t = e.touches[0]
      dx = t.clientX - startX
      const dy = t.clientY - startY
      if (!zieht) {
        // Richtung entscheiden: vertikal = normales Scrollen, horizontal = Geste
        if (Math.abs(dy) > RICHTUNGS_SCHWELLE_PX && Math.abs(dy) > Math.abs(dx)) {
          verfolgt = false
          return
        }
        if (dx <= RICHTUNGS_SCHWELLE_PX) return
        zieht = true
        el.style.transition = 'none'
      }
      e.preventDefault() // Scrollen unterdrücken, solange die Geste läuft
      el.style.transform = `translateX(${Math.max(0, dx)}px)`
    }

    const ende = () => {
      if (!verfolgt) return
      if (!zieht) {
        verfolgt = false
        return
      }
      const schwelle = Math.min(120, el.clientWidth / 3)
      if (dx > schwelle) {
        // hinausgleiten lassen, dann schließen (confirm kann es zurückholen)
        el.style.transition = 'transform 150ms ease-out'
        el.style.transform = 'translateX(100%)'
        window.setTimeout(() => {
          if (aktuell.current() === false) zuruecksetzen(true)
        }, 150)
        verfolgt = false
        zieht = false
      } else {
        zuruecksetzen(true)
      }
    }

    const abbruch = () => zuruecksetzen(false)

    el.addEventListener('touchstart', start, { passive: true })
    el.addEventListener('touchmove', move, { passive: false })
    el.addEventListener('touchend', ende)
    el.addEventListener('touchcancel', abbruch)
    return () => {
      el.removeEventListener('touchstart', start)
      el.removeEventListener('touchmove', move)
      el.removeEventListener('touchend', ende)
      el.removeEventListener('touchcancel', abbruch)
    }
  }, [])

  return flaeche
}
