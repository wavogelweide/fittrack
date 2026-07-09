# FitTrack – Fitness-PWA

## Kontext
Fitness-App als PWA für iPhone, gehostet auf GitHub Pages, Daten nur lokal (Dexie/IndexedDB).
Vorgehensplan: siehe vorgehensplan-fitness-app.md

## Stack
React + Vite + TypeScript, Tailwind, Dexie.js, vite-plugin-pwa, Recharts, Vitest

## Regeln
- Mobil-first, große Touch-Ziele, deutsche UI-Texte
- Design: modern & leicht futuristisch nach Abschnitt 5b des Plans (Dark Mode Standard, Neon-Akzente, Glassmorphism-Karten, große Zahlen, Mikro-Animationen)
- Keine Server-Calls, keine Analytics, keine Logins
- Fachlogik (1RM, Ratios, Haltungsmuster, Vorschläge) immer als reine, getestete Funktionen in src/logic/
- Übungs-Illustrationen als SVG in src/assets/illustrations/, einheitlicher Stil, keine externen Bildquellen
- Nach jeder Phase: npm run test && npm run build müssen grün sein
- base-Pfad für GitHub Pages nicht verändern

## Befehle
npm run dev / npm run test / npm run build
