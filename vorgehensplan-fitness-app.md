# Vorgehensplan: Fitness-App (PWA für iPhone via GitHub Pages)

Dieser Plan ist für die Umsetzung mit **Claude Code** gedacht. Jede Phase enthält Ziele, Aufgaben, einen Beispiel-Prompt und eine Definition of Done (DoD). Die Phasen nacheinander abarbeiten – nach jeder Phase deployen und auf dem iPhone testen.

---

## 1. Rahmenbedingungen

- **Zielplattform:** iPhone (Safari), installierbar als PWA über „Zum Home-Bildschirm hinzufügen"
- **Hosting:** GitHub Pages (kostenlos, öffentliches Repo)
- **Datenhaltung:** Nur lokal auf dem Gerät (IndexedDB), kein Server, kein Login
- **Kosten:** 0 €

## 2. Tech-Stack

| Bereich | Wahl | Begründung |
|---|---|---|
| Framework | React + Vite + TypeScript | Umfangreiche App, gut wartbar, statischer Build für Pages |
| Styling | Tailwind CSS | Schnell, mobil-first |
| Speicherung | Dexie.js (IndexedDB-Wrapper) | Zuverlässiger & größer als localStorage, gut für strukturierte Daten |
| PWA | vite-plugin-pwa | Offline-Fähigkeit, Manifest, Icons |
| Charts | Recharts | Fortschrittsdiagramme |
| Deployment | GitHub Actions → GitHub Pages | Automatisch bei jedem Push |

## 3. Funktionsumfang (Übersicht)

1. **Cardio:** Laufband, Ergometer, Crosstrainer – Einheiten mit Dauer, Distanz, Widerstand/Steigung, Puls (optional). Trainingsmethoden: **GA1** (Grundlagenausdauer mit berechneter Pulszone) und **60/120-Intervalle** (60 s Belastung / 120 s Erholung)
2. **Krafttraining:** Maschinenübungen im Gym, Erfassung von Maximalgewichten, Trainingsprotokoll (Sätze × Wdh. × Gewicht). Zu **jeder Kraftübung zeigt die App das errechnete Arbeitsgewicht** (aus dem 1RM, je nach Trainingsziel)
3. **Dehnübungen:** Katalog mit Anleitung, Zielmuskeln, Haltedauer; zusätzlich optional Blackroll-Übungen (Faszienrolle) mit Zielmuskeln und Anleitung
4. **Analyse:** Erkennung muskulärer Dysbalancen und wahrscheinlicher Verkürzungen auf Basis der Maximalgewichte
5. **Haltungs-Schwerpunkt:** Erkennung und Bekämpfung typischer Haltungsprobleme durch Sitzen am PC – Rundrücken (oberes gekreuztes Syndrom) und Hohlkreuz (unteres gekreuztes Syndrom) – über die Dysbalance-Analyse plus einen kurzen Haltungs-Selbstcheck
6. **Vorschläge:** Trainings- und Dehnempfehlungen zur Korrektur der gefundenen Dysbalancen und Haltungsprobleme
7. **Ziele:** Cardio-Ziele (Zeit/Distanz) und Kraft-Ziele (Gewichte) mit Fortschrittsanzeige
8. **Illustrationen:** Jede Übung (Kraft, Cardio, Dehnen, Blackroll) wird bebildert oder animiert – als selbst erstellte SVG-Illustrationen bzw. SVG/CSS-Animationen (Strichfiguren mit Bewegungsablauf), die im Repo liegen. So bleibt alles offline-fähig, kostenlos und ohne Lizenzprobleme

## 4. Datenmodell (IndexedDB via Dexie)

```
Exercise          – Übungskatalog Kraft
  id, name, maschine, primärMuskeln[], sekundärMuskeln[],
  bewegungsTyp ("push"|"pull"|"legs_front"|"legs_back"|"core"), antagonistGruppe,
  illustrationId (Referenz auf SVG-Illustration/-Animation im Bundle)

CardioType        – laufband | ergometer | crosstrainer

StretchExercise   – Dehn-/Blackroll-Katalog
  id, name, art ("dehnen"|"blackroll"), zielMuskeln[], anleitung, halteDauerSek,
  illustrationId

MaxWeight         – Maximalgewichte (Verlauf!)
  id, exerciseId, gewichtKg, wiederholungen, datum
  → 1RM wird daraus geschätzt, nie nur der letzte Wert speichern

WorkoutLog        – Trainingsprotokoll
  id, datum, typ ("kraft"|"cardio"|"dehnen"), einträge[]
  Krafteintrag: exerciseId, sätze[{gewicht, wdh}]
  Cardioeintrag: cardioType, dauerMin, distanzKm, widerstand, pulsAvg
  Dehneintrag: stretchId, dauerSek

UserProfile       – Nutzerprofil (für Puls- und Gewichtsberechnung)
  alter, geschlecht (optional), ruhePuls (optional), maxPuls (optional, sonst berechnet),
  trainingsziel ("kraft"|"hypertrophie"|"kraftausdauer"), trainingstageProWoche

Goal              – Ziele
  id, typ ("cardio_zeit"|"cardio_distanz"|"kraft_gewicht"),
  referenz (cardioType|exerciseId), zielwert, zieldatum, status
```

## 5. Fachlogik (Kernstück der App)

### 5.1 1RM-Schätzung
Aus Gewicht × Wiederholungen per **Epley-Formel**: `1RM = Gewicht × (1 + Wdh/30)` (alternativ Brzycki; beide implementieren und mitteln).

**Arbeitsgewicht pro Übung:** Die App zeigt zu jeder Kraftübung das errechnete Arbeitsgewicht als %1RM, abhängig vom Trainingsziel im Nutzerprofil: Kraftausdauer 50–60 % (15–20 Wdh.), Hypertrophie 65–75 % (8–12 Wdh.), Maximalkraft 80–90 % (3–6 Wdh.). Anzeige überall, wo die Übung auftaucht: Katalog-Detail, Vorschlagsplan, Workout-Modus. Auf gerätesinnvolle Stufen runden (z. B. 2,5-kg-Schritte).

### 5.1b Cardio-Methoden
- **GA1 (Grundlagenausdauer 1):** Zielpulszone 60–75 % der max. Herzfrequenz. HFmax aus Profil (falls erfasst) oder Schätzung `220 − Alter`; mit Ruhepuls genauer per **Karvonen-Formel**: `ZielHF = RuheHF + Intensität × (HFmax − RuheHF)`. App zeigt die persönliche GA1-Zone pro Nutzer an (z. B. „128–142 bpm") und empfiehlt Dauer 30–60 Min.
- **60/120-Intervalle:** 60 s hohe Belastung / 120 s lockere Erholung, z. B. 6–10 Runden nach Aufwärmen. Im Workout-Modus mit **Intervall-Timer** (Signal bei Wechsel). Belastungspuls ~85–90 % HFmax, Erholung zurück in die GA1-Zone.
- Beide Methoden für alle drei Geräte (Laufband, Ergometer, Crosstrainer) wählbar.

### 5.2 Dysbalance-Erkennung
Die 1RM-Werte werden Muskelgruppen zugeordnet und als **Kraftverhältnisse (Ratios)** zwischen Agonist und Antagonist verglichen. Richtwerte (in der App als konfigurierbare Konstanten hinterlegen):

| Verhältnis | Übungspaar (Maschinen) | Richtwert | Abweichung deutet auf |
|---|---|---|---|
| Beinbeuger : Beinstrecker | Leg Curl : Leg Extension | ~ 0,6–0,75 | zu schwache Beinrückseite, oft verkürzte Beinbeuger |
| Zug : Druck horizontal | Rudermaschine : Brustpresse | ~ 1,0 | schwacher Rücken, verkürzte Brust (Rundrücken-Tendenz) |
| Zug : Druck vertikal | Latzug : Schulterpresse | ~ 1,0–1,3 | Schulter-Dysbalance |
| Abduktion : Adduktion | Abduktoren- : Adduktorenmaschine | ~ 1,0 | Hüft-Dysbalance |
| Bauch : unterer Rücken | Crunch-Maschine : Rückenstrecker | ~ 0,7–1,0 | Rumpf-Dysbalance, Hohlkreuz-Tendenz |

**Logik:** Weicht ein Ratio > X % (Standard 15 %) vom Richtwert ab → Dysbalance-Flag mit Schweregrad (leicht/mittel/deutlich).

### 5.2b Haltungsmuster (Schwerpunkt: Sitzen am PC)
Die Dysbalance-Flags werden zusätzlich zu zwei typischen **Haltungsmustern** verdichtet:

| Muster | Typische Ursache | Schwach (kräftigen) | Verkürzt (dehnen/rollen) | Erkennungssignale in der App |
|---|---|---|---|---|
| **Rundrücken** (oberes gekreuztes Syndrom) | PC-Arbeit, vorgeneigter Kopf | oberer Rücken (Rudern, Reverse Fly, Latzug), tiefe Nackenflexoren | Brust, Nacken/oberer Trapez, Blackroll BWS | Zug:Druck horizontal < Richtwert, Selbstcheck |
| **Hohlkreuz** (unteres gekreuztes Syndrom) | langes Sitzen, verkürzte Hüftbeuger | Bauch, Gesäß, Beinbeuger | Hüftbeuger, unterer Rücken, vordere Oberschenkel | Bauch:Rückenstrecker < Richtwert, Beinbeuger:Strecker < Richtwert, Selbstcheck |

Ergänzend zum Kraft-Ratio gibt es einen **Haltungs-Selbstcheck** (kurzer Fragebogen: Stunden Sitzen/Tag, Wandtest für Rundrücken, Beckenkippung/Hohlkreuz-Anzeichen, Beschwerden). Ratio-Signale und Selbstcheck werden zu einem Muster-Score kombiniert – so funktioniert die Haltungsanalyse auch, bevor alle Maximalgewichte erfasst sind.

### 5.3 Vorschlagslogik
Aus den Flags generiert die App:

- **Kraft:** schwächere Seite mit +1 Satz/Woche und höherer Priorität im Plan; stärkere Seite auf Erhaltung
- **Dehnen:** typischerweise verkürzte Gegenspieler dehnen (z. B. schwacher Rücken → Brust & Hüftbeuger dehnen; schwache Beinrückseite → Beinbeuger dehnen + kräftigen), optional ergänzt um passende Blackroll-Übungen für dieselben Muskeln
- **Cardio:** Empfehlung nach Ziel (Grundlagenausdauer vs. Intervall), Gerätevariation
- **Haltung:** Bei erkanntem Rundrücken- oder Hohlkreuz-Muster bekommt der Wochenplan einen Haltungsblock mit Priorität – z. B. Rundrücken: 2:1-Verhältnis Zug- zu Drückübungen, Brustdehnung + BWS-Rolle in jeder Einheit; Hohlkreuz: Bauch-/Gesäßübungen in jeder Einheit, Hüftbeugerdehnung täglich empfohlen

**Wichtig:** Disclaimer in der App – Schätzwerte, ersetzen keine physiotherapeutische Diagnose.

## 5b. Design-Leitlinien: modern & leicht futuristisch

- **Dark Mode als Standard:** sehr dunkler Hintergrund (fast schwarz, leicht bläulich), helle Typografie
- **Akzentfarben:** 1–2 kräftige Neon-Akzente (z. B. Cyan/Elektroblau für Cardio, Limette/Grün für Kraft, Violett für Dehnen) – sparsam für Fortschritt, aktive Zustände und Charts
- **Karten mit Glassmorphism:** halbtransparente Flächen mit Blur, feine 1-px-Ränder mit leichtem Glow
- **Typografie:** moderne geometrische Sans (z. B. Inter/Space Grotesk), große Zahlen für Gewichte/Zeiten/Puls
- **Mikro-Animationen:** weiche Übergänge, animierte Fortschrittsringe, pulsierender Puls-Indikator im Cardio-Modus
- **Klar statt verspielt:** viel Weißraum, keine Schatten-Orgien – futuristisch heißt reduziert + präzise, nicht überladen
- Die SVG-Übungsillustrationen übernehmen dieselbe Akzent-Farbpalette (Zielmuskel im Akzentton)

## 6. Phasenplan

### Phase 0 – Setup & Deployment zuerst
**Ziel:** Leere App läuft auf dem iPhone über GitHub Pages.

- Repo anlegen, Vite + React + TS + Tailwind + vite-plugin-pwa aufsetzen
- `base`-Pfad in `vite.config.ts` auf Repo-Namen setzen (GitHub-Pages-Stolperfalle!)
- GitHub-Actions-Workflow: Build + Deploy nach Pages bei jedem Push auf `main`
- PWA-Manifest + Icons, „Hello World" installierbar auf dem iPhone

**Prompt für Claude Code:**
> Setze ein neues Vite-Projekt mit React, TypeScript, Tailwind und vite-plugin-pwa auf. Konfiguriere es für Deployment auf GitHub Pages (base-Pfad, GitHub-Actions-Workflow deploy.yml mit actions/deploy-pages). Erstelle ein PWA-Manifest für eine Fitness-App namens "FitTrack" mit Icons. Die App soll offline funktionieren.

**DoD:** App über `https://<user>.github.io/<repo>/` erreichbar, auf iPhone zum Home-Bildschirm hinzugefügt, startet offline.

### Phase 1 – Datenmodell & Übungskatalog
**Ziel:** Dexie-Datenbank steht, Kataloge sind befüllt.

- Dexie-Schema nach Abschnitt 4 implementieren
- Seed-Daten: ~20 gängige Gym-Maschinen mit Muskelzuordnung, 3 Cardio-Geräte, ~15 Dehnübungen, optional ~8 Blackroll-Übungen
- Einfache Katalog-Ansicht (Liste + Detail)

**Prompt:**
> Implementiere das Datenmodell aus vorgehensplan-fitness-app.md Abschnitt 4 mit Dexie.js. Erstelle Seed-Daten: 20 Gym-Maschinenübungen mit primären/sekundären Muskeln und bewegungsTyp, die Cardio-Typen Laufband/Ergometer/Crosstrainer sowie 15 Dehnübungen und 8 Blackroll-Übungen (art: "dehnen"|"blackroll") mit Zielmuskeln und Anleitung. Baue eine mobile Katalog-Ansicht mit Tabs (Kraft/Cardio/Dehnen inkl. Blackroll).

**DoD:** Kataloge auf dem iPhone durchsuchbar, Daten überleben App-Neustart.

### Phase 1b – Übungs-Illustrationen
**Ziel:** Jede Übung ist bebildert oder animiert.

- Einheitliches SVG-Illustrationssystem: Strichfigur + Gerät, ein konsistenter Stil für alle Übungen
- Kraftübungen und Cardio als **SVG/CSS-Animation** (Bewegungsablauf in 2 Endpositionen, Loop), Dehn-/Blackroll-Übungen als statische Illustration der Endposition mit Pfeil-Markierung der Dehnrichtung
- Wiederverwendbare `<ExerciseIllustration illustrationId=… />`-Komponente, Anzeige in Katalog-Detail, Vorschlagsplan und Workout-Modus
- Alle SVGs liegen im Repo (offline-fähig, keine Lizenzkosten)

**Prompt:**
> Erstelle ein konsistentes SVG-Illustrationssystem für alle Übungen im Katalog: minimalistische Strichfiguren mit angedeutetem Gerät, einheitliche Strichstärke und Farbpalette. Kraft- und Cardio-Übungen als CSS-animierte SVGs, die den Bewegungsablauf als Loop zwischen Start- und Endposition zeigen; Dehn- und Blackroll-Übungen als statische SVGs mit Pfeilen für die Dehnrichtung und farblicher Hervorhebung des Zielmuskels. Baue eine ExerciseIllustration-Komponente und binde sie in die Katalog-Detailansicht ein. Generiere die SVGs für alle Seed-Übungen.

**DoD:** Jede Übung im Katalog zeigt eine erkennbare Illustration bzw. Animation; Bundle bleibt klein (SVG statt Video/GIF).

### Phase 2 – Maximalgewichte & 1RM
**Ziel:** Nutzer erfasst Maximalgewichte, App berechnet 1RM.

- Eingabeformular: Übung, Gewicht, Wiederholungen, Datum
- 1RM-Berechnung (Epley + Brzycki, Mittelwert), Verlauf pro Übung mit Chart
- Unit-Tests für die Formeln

**Prompt:**
> Baue die Maximalgewicht-Erfassung: Formular (Übung, Gewicht kg, Wiederholungen, Datum), Speicherung als Verlauf in MaxWeight. Implementiere geschätztes 1RM (Mittel aus Epley und Brzycki) als getestete Utility-Funktion mit Vitest. Implementiere außerdem das Nutzerprofil (Alter, Ruhepuls, Trainingsziel) und die Arbeitsgewicht-Berechnung aus Abschnitt 5.1: Zu jeder Kraftübung wird das empfohlene Arbeitsgewicht als %1RM je nach Trainingsziel angezeigt (auf 2,5 kg gerundet), in Katalog-Detail und später im Plan. Zeige pro Übung den 1RM-Verlauf als Liniendiagramm (Recharts).

**DoD:** Tests grün, 1RM-Verlauf sichtbar, jede Übung mit erfasstem Maximalgewicht zeigt ihr Arbeitsgewicht.

### Phase 3 – Dysbalance- & Haltungsanalyse
**Ziel:** App erkennt Dysbalancen aus den 1RM-Werten und leitet Haltungsmuster ab.

- Ratio-Engine nach Abschnitt 5.2 (Paare + Richtwerte als Konfiguration)
- Haltungsmuster-Erkennung nach 5.2b: Rundrücken-/Hohlkreuz-Score aus Ratios + Haltungs-Selbstcheck (Fragebogen)
- Analyse-Screen: Ampel pro Muskelpaar (ok / leicht / deutlich), Haltungsmuster-Karten mit Erklärungstexten
- Umgang mit fehlenden Daten („Für diese Analyse fehlt dein Maximalgewicht an der Rudermaschine")
- Unit-Tests mit Beispielszenarien

**Prompt:**
> Implementiere die Dysbalance-Analyse aus vorgehensplan-fitness-app.md Abschnitt 5.2: konfigurierbare Muskelpaar-Ratios mit Richtwerten, Berechnung aus den aktuellen 1RM-Werten, Schweregrade bei >15 %/>30 % Abweichung. Implementiere zusätzlich die Haltungsmuster-Erkennung aus Abschnitt 5.2b (Rundrücken/Hohlkreuz): kurzer Selbstcheck-Fragebogen, kombiniert mit den Ratio-Signalen zu einem Muster-Score. Baue einen Analyse-Screen mit Ampeldarstellung, Haltungsmuster-Karten und verständlichen Erklärungen. Fehlende Messwerte sollen als konkrete Handlungsaufforderung angezeigt werden. Schreibe Unit-Tests für mindestens 5 Szenarien inkl. Haltungsmuster.

**DoD:** Analyse liefert bei Testdaten plausible, getestete Ergebnisse; Haltungsmuster wird auch ohne vollständige Maximalgewichte (nur Selbstcheck) angezeigt.

### Phase 4 – Trainingsvorschläge
**Ziel:** App generiert konkrete Empfehlungen aus der Analyse.

- Vorschlags-Engine nach 5.3: Kraftübungen mit Sätzen/Wdh./Gewicht (%1RM), passende Dehnübungen, Cardio-Empfehlung
- Wochenplan-Vorschlag (z. B. 2–4 Einheiten je nach Nutzereinstellung)
- Disclaimer-Hinweis

**Prompt:**
> Baue die Vorschlags-Engine: Aus den Dysbalance-Flags, Haltungsmustern und 1RM-Werten wird ein Wochenplan generiert – Kraftübungen mit konkreten Gewichten (65–75 % 1RM, 3×10), Priorisierung schwächerer Muskelgruppen (+1 Satz), passende Dehnübungen für die typischerweise verkürzten Gegenspieler, plus Cardio-Empfehlung nach Abschnitt 5.1b (GA1 mit persönlicher Pulszone oder 60/120-Intervalle, je nach Ziel abwechselnd im Wochenplan). Bei erkanntem Rundrücken: 2:1-Verhältnis Zug- zu Drückübungen und Brustdehnung + BWS-Blackroll in jeder Einheit; bei Hohlkreuz: Bauch-/Gesäßübungen in jeder Einheit und tägliche Hüftbeugerdehnung als Empfehlung. Nutzereinstellung: Trainingstage pro Woche (2–5). Zeige den Plan übersichtlich pro Trainingstag. Füge einen medizinischen Disclaimer hinzu.

**DoD:** Nachvollziehbarer Wochenplan, der sich bei geänderten Maximalgewichten anpasst.

### Phase 5 – Trainingsprotokoll
**Ziel:** Einheiten schnell während des Trainings erfassen.

- Workout-Modus: Vorschlagsplan abhaken, Gewichte/Wdh. anpassen, Cardio-Werte eintragen, Dehnen mit Timer
- Historie-Ansicht (Kalender/Liste)
- Große Touch-Ziele, Nutzung mit einer Hand im Gym

**Prompt:**
> Baue den Workout-Modus: Der Nutzer startet eine Einheit aus dem Wochenplan oder frei, hakt Übungen ab (vorbefüllt mit dem errechneten Arbeitsgewicht), passt Gewicht/Wiederholungen an, erfasst Cardio (Dauer, Distanz, Widerstand, optional Puls) und Dehnübungen mit Countdown-Timer. Für Cardio: GA1-Modus mit Anzeige der persönlichen Pulszone und 60/120-Intervallmodus mit Intervall-Timer und Signal beim Wechsel. Speicherung in WorkoutLog. Baue eine Historie als Liste mit Detailansicht. UI mobil-first mit großen Buttons für die Nutzung im Gym.

**DoD:** Komplette Einheit ist am iPhone in <2 Min. Zusatzaufwand erfassbar.

### Phase 6 – Ziele & Fortschritt
**Ziel:** Ziele setzen und Fortschritt sehen.

- Ziel-Typen: Cardio-Zeit/-Distanz, Kraft-Zielgewicht je Übung, mit Zieldatum
- Fortschritt aus WorkoutLog/MaxWeight ableiten, Anzeige mit Charts und %-Balken
- Erledigte Ziele markieren

**Prompt:**
> Implementiere Trainingsziele: Cardio-Zeit, Cardio-Distanz und Kraft-Zielgewicht mit optionalem Zieldatum. Der Fortschritt wird automatisch aus WorkoutLog und MaxWeight berechnet. Baue einen Ziele-Screen mit Fortschrittsbalken, Recharts-Verlauf und Abschluss-Status.

**DoD:** Ziel anlegen → trainieren → Fortschritt steigt automatisch.

### Phase 7 – Feinschliff & Datensicherheit
**Ziel:** Alltagstauglich und datenverlustsicher.

- **Export/Import** aller Daten als JSON-Datei (wichtig: IndexedDB kann bei Speicherplatzmangel von iOS gelöscht werden!)
- `navigator.storage.persist()` anfordern
- Dark Mode, Ladeperformance, iOS-Safe-Areas, App-Icon-Feinschliff
- Abschlusstest komplett am iPhone

**Prompt:**
> Füge Datenexport/-import als JSON hinzu (Share-Sheet-kompatibel auf iOS), fordere persistenten Speicher via navigator.storage.persist() an und zeige den Speicherstatus in den Einstellungen. Ergänze Dark Mode und optimiere für iOS-Safe-Areas. Prüfe die Lighthouse-PWA-Kriterien.

**DoD:** Backup lässt sich exportieren und auf einem frischen Gerät wieder importieren.

## 7. CLAUDE.md-Vorlage (ins Repo legen)

```markdown
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
```

## 8. Arbeitsweise mit Claude Code

1. Diese Datei als `vorgehensplan-fitness-app.md` ins Repo legen, CLAUDE.md aus Abschnitt 7 erstellen
2. Pro Phase eine Session: Prompt aus dem Plan geben, Ergebnis prüfen, committen, pushen
3. Nach jedem Push: auf dem iPhone testen (Pages deployt automatisch)
4. Bei Problemen Claude Code die Fehlermeldung/Screenshot geben statt selbst zu debuggen

**Grobe Aufwandsschätzung:** Phase 0–2 je 1 Session, Phase 3–5 je 1–2 Sessions, Phase 6–7 je 1 Session.
