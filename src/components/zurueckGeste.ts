// iOS-Wischgeste "zurück" für Overlays: Jedes offene Overlay legt einen
// History-Eintrag an. Die Randwischgeste (bzw. der Browser-Zurück-Button)
// löst popstate aus und schließt das oberste Overlay – statt die App zu
// verlassen. Wird ein Overlay per Button geschlossen, räumen wir den
// eigenen History-Eintrag wieder ab, damit nichts liegen bleibt.
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

// Im offenen Overlay aufrufen (Mount = Overlay sichtbar). onZurueck wird bei
// Wischgeste/Zurück ausgeführt und soll das Overlay schließen; false halten es offen.
export function useZurueckGeste(onZurueck: () => boolean | void) {
  const aktuell = useRef(onZurueck)
  aktuell.current = onZurueck

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
        // per Button geschlossen → History-Eintrag still entfernen
        stapel.splice(idx, 1)
        eigeneBacks++
        window.history.back()
      }
      // idx === -1: schon durch die Wischgeste (popstate) geschlossen
    }
  }, [])
}
