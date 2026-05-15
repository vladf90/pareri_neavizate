# 1) Obiectiv
Aplicație locală pentru watchalong, care afișează grafică broadcast (HUD/Ticker/Lineup) în OBS, controlată dintr-un Admin Panel, cu date live din SportMonks.

## 2) Personas
- **Streamer/Operator (Admin):** selectează meciuri, teme, toggles, declanșează animații, controlează widget-uri via Master Overlay.
- **Overlay Viewer (OBS):** overlay-uri read-only care randază starea curentă.

## 3) User Stories (must-have)
### Admin
- Pot selecta un **meci principal** (matchId) și pot schimba în timpul live-ului.
- Pot selecta o listă de **meciuri secundare** pentru ticker (0..N).
- Pot selecta **tema grafică** (competiție) și pot schimba tema live.
- Pot activa/dezactiva componente: scoreboard, ticker, toast events, stats panel.
- Pot controla **widget-uri individuale** în Master Overlay (standings, h2h, lineups, etc.) 
- Pot alege formatul de randare pentru overlays: **16:9** și **9:16**.
- Am un "Test Mode" cu butoane: simulate goal / card / substitution / VAR (fără API).

### Overlay
- Se conectează automat la server (WS), primește state updates.
- Nu are logică de date; doar randare.
- Nu face layout shift la update-uri (stabil în OBS).
- **Master Overlay**: single browser source cu toate widget-urile, controlate individual. 

## 4) Overlays (v1.3)

### 4.1 HUD
Conținut minim:
- Scor (Home/Away) - folosește prioritate CURRENT > 2ND_HALF > 1ST_HALF 
- Ceas (minut + stare: 1H/HT/2H/ET/PEN dacă e disponibil)
- Evenimente recente (ex: GOAL, RED, VAR) ca toast / ribbon
Opțional v1:
- Stats: pos, shots, xG, corners (doar dacă sunt disponibile)

Rute:
- `/overlay/hud?format=16x9`
- `/overlay/hud?format=9x16`

### 4.2 Ticker (multi-match)
Conținut minim:
- Listă meciuri secundare: `TEAM 1-0 TEAM (63')`
- Evidențiere eveniment (ex: "GOAL" blink 2s) pe meciul care tocmai s-a schimbat
Rute:
- `/overlay/ticker?format=16x9`
- `/overlay/ticker?format=9x16`
- `/overlay/ticker-compact` 

### 4.3 Lineup
Conținut minim:
- Starting XI pentru echipa selectată (home/away separate) 
- Layout pitch 2D cu **formationPosition ordering** (GK jos, atacanți sus) 
- Variante: full, compact 
Rute:
- `/overlay/lineups` (HOME)
- `/overlay/lineups-away` (AWAY) 
- `/overlay/lineups-compact` 
- `/overlay/lineups-away-compact` 
- `/overlay/lineups?mode=tactical`

### 4.4 Widget Overlays (v1.2+)
- `/overlay/standings` - Clasament competiție
- `/overlay/h2h` - Head-to-head între echipe
- `/overlay/form` - Formă recentă echipe
- `/overlay/topscorers` - Golgeteri sezon
- `/overlay/livestandings` - Clasament live cu evidențieri

### 4.5 Master Overlay 
**Single browser source pentru OBS** care conține TOATE widget-urile:
- Scoreboard, Ticker, Stats
- Standings, H2H, Form, TopScorers
- Lineups (HOME/AWAY), LiveStandings

**Control**: Toggle-uri individuale via WebSocket din Admin Panel
**Beneficii**:
- Fără scene switching în OBS
- Tranziții smooth între widgets
- Single source management

Rută:
- `/overlay/master`

## 5) Non-functional (must-have)
- Rulează local, fără cloud.
- Rezistent la căderi API: păstrează last-known state, afișează "Data delayed".
- Polling rate-limit safe.
- WS reconnect robust.
- Performanță: 60fps posibil pe PC de streaming; fallback la 30fps.

## 6) Definition of Done (v1.3)
- Admin poate schimba match principal / ticker matches / theme fără refresh în OBS.
- Overlays nu "sar" (fără shift la font/time/score).
- Există MockProvider complet pentru development offline.
- Există Design System + tokens pentru teme și componentizare.
- **Master Overlay funcțional** cu control individual pe fiecare widget. 
- **Score mapping corect** pentru meciuri live și terminate. 
- **Lineup ordering corect** cu formationPosition. 

## 7) Future (v2+)
- ~~Standings overlay~~  DONE
- Upcoming fixtures
- Intermission screen
- Sponsor frames
- QR/socials
- "Man of the match"
- Multi-language support
- Cloud sync for settings
