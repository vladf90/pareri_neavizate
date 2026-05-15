# Documentație Completă - Sistem Lineup-uri

## Cuprins
1. [Prezentare Generală](#prezentare-generală)
2. [Citirea Lineup-urilor](#citirea-lineup-urilor)
3. [Structura de Date](#structura-de-date)
4. [Randarea Pozițiilor pe Teren](#randarea-pozițiilor-pe-teren)
5. [Preluarea Numelui Antrenorului](#preluarea-numelui-antrenorului)
6. [Determinarea Formației](#determinarea-formației)
7. [Fluxul Complet de Date](#fluxul-complet-de-date)

---

## Prezentare Generală

Sistemul de lineup-uri afișează formația echipelor, jucătorii titulari, antrenorul și formația tactică (ex: 4-3-3, 4-4-2) pentru meciurile live. Datele provin de la API-ul SportMonks și sunt procesate prin mai multe straturi înainte de a fi afișate în overlay.

---

## Citirea Lineup-urilor

### 1. Server-Side: Polling SportMonks API

**Fișier:** `packages/server/src/pollers/fixturePoller.js`

#### Procesul de citire:

```javascript
// 1. Se face request către SportMonks API cu parametri specifici
const response = await axios.get('https://api.sportmonks.com/v3/football/fixtures', {
  params: {
    includes: 'formations;participants;coaches;lineups;...',
    filters: { ... }
  }
});
```

**Ce se include în request:**
- `formations` - formațiile echipelor (4-3-3, 4-4-2, etc.)
- `participants` - datele echipelor (logo, nume, culori)
- `coaches` - antrenorii echipelor
- `lineups` - lista completă de jucători cu poziții

**Frecvența de polling:**
- Meciuri LIVE: la fiecare **1500ms** (1.5 secunde)
- Meciuri în așteptare: la fiecare **10000ms** (10 secunde)

---

### 2. Client-Side: WebSocket și React Hooks

**Fișier:** `packages/web/src/app/hooks/useOverlayData.js`

#### Hook-ul principal: `useLineupData(fixtureId, isAway)`

```javascript
export const useLineupData = (fixtureId, isAway) => {
  // Se abonează la canalul WebSocket 'fixture_core'
  const fixture = useSocketStore((state) => state.fixtureCore[fixtureId]);

  // Extrage datele pentru echipa selectată (home sau away)
  const team = isAway ? fixture?.away_team : fixture?.home_team;

  // Returnează datele procesate pentru afișare
  return {
    team: { name, logo, colors },
    players: [...], // max 11 jucători titulari
    formation: '4-3-3',
    manager: 'Numele Antrenorului',
    recentForm: ['W', 'D', 'L', 'W', 'W']
  };
};
```

**Pașii de procesare:**

1. **Abonare la WebSocket** - Ascultă canalul `fixture_core`
2. **Selecție echipă** - În funcție de `isAway`, alege home sau away team
3. **Filtrare jucători** - Extrage doar titularii (`typeId === 11`)
4. **Sortare** - Sortează după `formationPosition` (0-10)
5. **Limitare** - Reține max 11 jucători
6. **Transformare** - Pregătește datele pentru componenta de UI

---

## Structura de Date

### DTO pentru Lineup-uri

**Fișier:** `packages/shared/src/dto/fixtureCore.dto.js`

#### Structura unui jucător din lineup:

```javascript
{
  // Identificatori
  id: 12345,                    // ID-ul lineup entry
  playerId: 67890,              // ID-ul jucătorului
  teamId: 111,                  // ID-ul echipei

  // Poziție pe teren
  positionId: 24,               // ID poziție din SportMonks (ex: 24 = CB)
  formationField: "CB",         // Poziția pe teren (RB, CB, CDM, ST, etc.)
  formationPosition: 2,         // Index în formație (0 = GK, 1-10 = restul)

  // Informații vizuale
  jerseyNumber: 4,              // Numărul de pe tricou
  playerName: "Virgil van Dijk", // Numele afișat

  // Tipul jucătorului
  typeId: 11,                   // 11 = starter, 12 = rezervă
  type: { name: "Starting Lineup" },

  // Obiect complet jucător și poziție
  player: {
    display_name: "Virgil van Dijk",
    image_path: "https://...",
    // ... alte date
  },
  position: {
    name: "Centre-Back",
    code: "CB"
  }
}
```

#### Gruparea jucătorilor:

```javascript
// Jucătorii se grupează per echipă
const homeLineup = participants.find(p => p.meta?.location === 'home')?.lineup || [];
const awayLineup = participants.find(p => p.meta?.location === 'away')?.lineup || [];

// Se filtrează doar titularii
const starters = lineup.filter(player => player.typeId === 11);

// Se sortează după poziția în formație
starters.sort((a, b) => a.formationPosition - b.formationPosition);
```

---

## Randarea Pozițiilor pe Teren

### Component Principal

**Fișier:** `packages/web/src/app/widgets/LineupWidget.jsx`

### Definirea pozițiilor pentru fiecare formație

Pozițiile sunt definite ca **procente** pe terenul de joc (left = X-axis, top = Y-axis):

```javascript
const FORMATION_POSITIONS = {
  '4-3-3': [
    // Index 0: Goalkeeper
    { left: 6, top: 45 },

    // Index 1-4: Apărare (4 fundași)
    { left: 25, top: 20 },   // RB - Right Back
    { left: 25, top: 38 },   // CB - Centre Back dreapta
    { left: 25, top: 55 },   // CB - Centre Back stânga
    { left: 25, top: 75 },   // LB - Left Back

    // Index 5-7: Mijloc (3 mijlocași)
    { left: 50, top: 30 },   // CM - Center Mid dreapta
    { left: 50, top: 50 },   // CM - Center Mid centru
    { left: 50, top: 70 },   // CM - Center Mid stânga

    // Index 8-10: Atac (3 atacanți)
    { left: 80, top: 20 },   // RW - Right Wing
    { left: 80, top: 50 },   // ST - Striker
    { left: 80, top: 80 },   // LW - Left Wing
  ],

  '4-4-2': [
    // Index 0: Goalkeeper
    { left: 6, top: 45 },

    // Index 1-4: Apărare (4 fundași)
    { left: 25, top: 20 },   // RB
    { left: 25, top: 38 },   // CB
    { left: 25, top: 55 },   // CB
    { left: 25, top: 75 },   // LB

    // Index 5-8: Mijloc (4 mijlocași)
    { left: 50, top: 15 },   // RM - Right Mid
    { left: 50, top: 38 },   // CM - Center Mid
    { left: 50, top: 62 },   // CM - Center Mid
    { left: 50, top: 85 },   // LM - Left Mid

    // Index 9-10: Atac (2 atacanți)
    { left: 80, top: 35 },   // ST - Striker dreapta
    { left: 80, top: 65 },   // ST - Striker stânga
  ],

  // Alte formații...
  '4-2-3-1': [...],
  '3-5-2': [...],
  '5-3-2': [...]
};
```

### Algoritmul de randare

```javascript
// 1. Se obține formația echipei (default: '4-3-3')
const formation = lineupData.formation || '4-3-3';
const positions = FORMATION_POSITIONS[formation] || FORMATION_POSITIONS['4-3-3'];

// 2. Se mapează fiecare jucător pe poziția sa
lineupData.players.map((player, index) => {
  const position = positions[index]; // { left: 25, top: 20 }

  // 3. Pentru echipa away, se face mirror (oglindire)
  const leftPos = isAway ? (100 - position.left) : position.left;
  const topPos = position.top;

  // 4. Se randează PlayerToken
  return (
    <PlayerToken
      key={player.playerId}
      player={player}
      leftPos={leftPos}
      topPos={topPos}
      index={index}
      isAway={isAway}
    />
  );
});
```

### Oglindirea pentru echipa away

Pentru echipa adversară (away), poziția pe axa X se inversează:

```javascript
// Echipa home atacă de la stânga la dreapta
// left: 6 → GK pe stânga
// left: 80 → Atacanți pe dreapta

// Echipa away atacă de la dreapta la stânga
// leftPos = 100 - 6 = 94 → GK pe dreapta
// leftPos = 100 - 80 = 20 → Atacanți pe stânga
```

### Exemplu vizual de poziționare

```
ECHIPA HOME (4-3-3):
                        RW(8)
            RM(5)       ST(9)       LM(7)
                        CM(6)
    RB(1)   CB(2)   CB(3)   LB(4)
                GK(0)

ECHIPA AWAY (4-3-3) - OGLINDIT:
                GK(0)
    LB(4)   CB(3)   CB(2)   RB(1)
                        CM(6)
            LM(7)       ST(9)       RM(5)
                        RW(8)
```

---

## Preluarea Numelui Antrenorului

### Sursa datelor

Numele antrenorului vine din API-ul SportMonks în secțiunea `participants → meta → manager`.

### Flow-ul complet:

#### 1. SportMonks API returnează:

```json
{
  "participants": [
    {
      "id": 111,
      "name": "Liverpool",
      "meta": {
        "location": "home",
        "manager": "Jürgen Klopp",
        "formation": "4-3-3"
      }
    }
  ]
}
```

#### 2. Maparea în DTO (`fixtureCore.mapper.js`):

```javascript
// Se extrage din răspunsul API
const manager = participant.meta?.manager || null;

// Se salvează în structura participant
participant.meta = {
  location: participant.meta.location,
  manager: manager,  // "Jürgen Klopp"
  formation: participant.meta.formation
};
```

#### 3. Extragerea în hook (`useLineupData`):

```javascript
const useLineupData = (fixtureId, isAway) => {
  const team = isAway ? fixture?.away_team : fixture?.home_team;

  return {
    // ...
    manager: team?.meta?.manager || 'Manager', // Fallback dacă lipsește
    // ...
  };
};
```

#### 4. Afișarea în UI (`LineupWidget.jsx`):

```jsx
<div className="manager-section">
  <div className="label">MANAGER</div>
  <div className="manager-name" style={{
    fontFamily: 'Bebas Neue',
    fontSize: '30px',
    color: '#33EFFF' // Cyan
  }}>
    {lineupData.manager}
  </div>
</div>
```

### Stilizare:

- **Font:** Bebas Neue (font condensat, uppercase feel)
- **Mărime:** 30px
- **Culoare:** Cyan (#33EFFF)
- **Locație:** Sidebar dreapta, sub logo-ul echipei

---

## Determinarea Formației

### Metoda 1: Din API SportMonks (PRIORITARĂ)

Formația vine direct din `participant.meta.formation`:

```javascript
// Exemplu de răspuns API
{
  "meta": {
    "formation": "4-3-3"  // String cu formația
  }
}
```

**Formații suportate:**
- `4-3-3` - 4 apărători, 3 mijlocași, 3 atacanți
- `4-4-2` - 4 apărători, 4 mijlocași, 2 atacanți
- `4-2-3-1` - 4 apărători, 2 mijlocași defensivi, 3 ofensivi, 1 atacant
- `3-5-2` - 3 apărători, 5 mijlocași, 2 atacanți
- `5-3-2` - 5 apărători, 3 mijlocași, 2 atacanți

### Metoda 2: Calculare automată (FALLBACK)

Dacă API-ul nu returnează formația, se calculează din pozițiile jucătorilor:

```javascript
// Pseudo-cod
function detectFormation(players) {
  const defenders = players.filter(p => ['RB', 'CB', 'LB'].includes(p.formationField)).length;
  const midfielders = players.filter(p => ['CDM', 'CM', 'CAM', 'RM', 'LM'].includes(p.formationField)).length;
  const attackers = players.filter(p => ['RW', 'ST', 'LW', 'CF'].includes(p.formationField)).length;

  return `${defenders}-${midfielders}-${attackers}`; // Ex: "4-3-3"
}
```

### Extragerea în cod:

```javascript
// În useLineupData hook
const formation = team?.meta?.formation ?? '4-3-3'; // Default la 4-3-3

return {
  // ...
  formation: formation,
  // ...
};
```

### Afișarea în UI:

```jsx
<div className="formation-section">
  <div className="label">FORMATION</div>
  <div className="formation-badge" style={{
    fontFamily: 'Bebas Neue',
    fontSize: '30px',
    color: '#33EFFF', // Cyan
    background: 'rgba(30, 44, 73, 0.8)', // Deep blue cu transparență
    padding: '8px 16px',
    borderRadius: '8px'
  }}>
    {lineupData.formation}
  </div>
</div>
```

### Utilizarea formației pentru randare:

```javascript
// Se alege setul de poziții corespunzător
const positions = FORMATION_POSITIONS[formation] || FORMATION_POSITIONS['4-3-3'];

// Dacă formația nu este în lista predefinită, se folosește 4-3-3 ca default
```

---

## Fluxul Complet de Date

### Diagrama de arhitectură:

```
┌─────────────────────────────────────────────────────────────────┐
│                      SPORTMONKS API                             │
│  GET /fixtures?includes=formations,lineups,coaches,participants │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ Polling (1.5s live / 10s pending)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│               SERVER: fixturePoller.js                          │
│  - Fetch data from SportMonks                                   │
│  - Process response                                             │
│  - Map to internal DTO (fixtureCore.dto.js)                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ HTTP POST
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│               DATA STORE: FixtureCore                           │
│  {                                                              │
│    fixtureId: {                                                 │
│      home_team: { lineup: [...], meta: { manager, formation }},│
│      away_team: { lineup: [...], meta: { manager, formation }} │
│    }                                                            │
│  }                                                              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ WebSocket Broadcast
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│               WEBSOCKET: Channel 'fixture_core'                 │
│  - Emit updated fixture data                                    │
│  - All connected clients receive updates                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ Socket.io
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│               CLIENT: wsClient.js                               │
│  - Subscribe to 'fixture_core'                                  │
│  - Update Zustand store (useSocketStore)                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ React Hook
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│               HOOK: useLineupData(fixtureId, isAway)            │
│  1. Read from socket store                                      │
│  2. Select home/away team                                       │
│  3. Filter starters (typeId === 11)                             │
│  4. Sort by formationPosition                                   │
│  5. Extract manager, formation                                  │
│  6. Limit to 11 players                                         │
│  7. Return formatted data                                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ Props
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│               COMPONENT: LineupWidget.jsx                       │
│  1. Receive lineupData                                          │
│  2. Select formation positions (FORMATION_POSITIONS)            │
│  3. Map players to positions                                    │
│  4. Apply mirror for away team                                  │
│  5. Render:                                                     │
│     - Pitch background                                          │
│     - 11 PlayerToken components                                 │
│     - Sidebar (manager, formation, recent form)                 │
└─────────────────────────────────────────────────────────────────┘
```

### Pașii detaliați:

#### 1. Polling API (Server)
- **Fișier:** `packages/server/src/pollers/fixturePoller.js`
- **Frecvență:** 1.5s (live) / 10s (pending)
- **Include:** formations, lineups, coaches, participants

#### 2. Mapare DTO (Server)
- **Fișier:** `packages/shared/src/dto/fixtureCore.dto.js`
- **Transformări:**
  - Extrage lineup-uri per echipă
  - Filtrează titulari (typeId === 11)
  - Mapează manager și formație
  - Adaugă recent form

#### 3. Stocare în memorie (Server)
- **Store:** In-memory store pentru fixture data
- **Canale:** fixture_core, fixture_stats, fixture_events

#### 4. Broadcast WebSocket (Server → Client)
- **Protocol:** Socket.io
- **Canal:** `fixture_core`
- **Payload:** Obiectul complet cu fixture data

#### 5. Subscribe WebSocket (Client)
- **Fișier:** `packages/web/src/app/store/wsClient.js`
- **Store:** Zustand (useSocketStore)
- **Update:** Automatic re-render când fixture se updatează

#### 6. Hook de transformare (Client)
- **Fișier:** `packages/web/src/app/hooks/useOverlayData.js`
- **Hook:** `useLineupData(fixtureId, isAway)`
- **Output:**
```javascript
{
  team: { name, logo, colors },
  players: [ /* max 11 */ ],
  formation: '4-3-3',
  manager: 'Manager Name',
  recentForm: ['W', 'D', 'L', 'W', 'W']
}
```

#### 7. Randare componenta (Client)
- **Fișier:** `packages/web/src/app/widgets/LineupWidget.jsx`
- **Responsabilități:**
  - Selectează FORMATION_POSITIONS pentru formația dată
  - Mapează fiecare player pe poziția sa
  - Aplică mirror pentru away team
  - Randează pitch + players + sidebar

#### 8. Animații și stilizare
- **CSS:** `packages/web/src/index.css`
- **Animații:**
  - `playerPop` - Pop-in delay per player
  - `wipeReveal` - Pink wipe pentru sidebar
  - `pitchSlide` / `pitchSlideAway` - Slide in/out
- **Design tokens:** `packages/web/src/styles/designSystem.js`

---

## Fișiere Cheie - Referință Rapidă

| Funcționalitate | Fișier | Linie |
|----------------|--------|-------|
| **Widget principal** | `packages/web/src/app/widgets/LineupWidget.jsx` | - |
| **Hook de date** | `packages/web/src/app/hooks/useOverlayData.js` | 183 (manager) |
| **DTO mapping** | `packages/shared/src/dto/fixtureCore.dto.js` | - |
| **Polling API** | `packages/server/src/pollers/fixturePoller.js` | - |
| **WebSocket client** | `packages/web/src/app/store/wsClient.js` | - |
| **Admin controls** | `packages/web/src/pages/AdminPage.jsx` | - |
| **Design system** | `packages/web/src/styles/designSystem.js` | - |
| **FORMATION_POSITIONS** | `packages/web/src/app/widgets/LineupWidget.jsx` | ~40-120 |

---

## Controlul din Admin Panel

### Selectare fixture și echipă:

```javascript
// Admin panel controls (AdminPage.jsx)
const adminState = {
  mainMatchId: 12345,         // ID-ul meciului principal
  showAwayLineup: false       // false = home, true = away
};

// Componenta lineup citește aceste settings
<LineupWidget
  fixtureId={adminState.mainMatchId}
  isAway={adminState.showAwayLineup}
/>
```

### URL-ul overlay-ului:

```
http://localhost:5173/overlay/lineup
```

URL-ul este static; selecția fixture/echipă se face din admin panel și se sincronizează automat prin WebSocket.

---

## Rezumat - Checklist de Verificare

Pentru a afișa corect un lineup, sistemul verifică:

- [ ] API-ul SportMonks returnează `formations`, `lineups`, `coaches`
- [ ] Lineup-ul conține cel puțin 11 jucători cu `typeId === 11`
- [ ] Fiecare jucător are `formationPosition` (0-10)
- [ ] Formația echipei este validă (ex: "4-3-3")
- [ ] Manager-ul există în `participant.meta.manager`
- [ ] FORMATION_POSITIONS conține setul pentru formația respectivă
- [ ] Away team folosește oglindirea corectă (100 - left)
- [ ] Animațiile se aplică cu delay per index
- [ ] WebSocket transmite update-uri în timp real

---

**Documentație generată:** 2026-02-08
**Versiune aplicație:** Watchalong Base App
**API:** SportMonks v3 Football API
