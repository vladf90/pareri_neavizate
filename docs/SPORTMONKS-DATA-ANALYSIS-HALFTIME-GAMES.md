# SportMonks API - Analiza Date Pentru Jocuri Interactive (Halftime Show)

## Context
Acest document analizează datele disponibile în SportMonks Football API v3 pentru a identifica informații, statistici și fapte care pot fi folosite pentru automatizarea jocurilor în timpul pauzei de la meciuri (halftime shows) în livestream-uri.

## 📊 Entități Principale Disponibile

### 1. **PLAYER** (Jucător)
**Endpoint**: `GET /v3/football/players/{playerId}`
**Entity Rate Limit**: 3000 requests/hour

#### Date de Bază
```json
{
  "id": 14,
  "common_name": "D. Agger",
  "firstname": "Daniel Munthe",
  "lastname": "Agger",
  "name": "Daniel Munthe Agger",
  "display_name": "Daniel Agger",
  "image_path": "https://cdn.sportmonks.com/images/...",
  "height": 191,
  "weight": 84,
  "date_of_birth": "1984-12-12",
  "gender": "male",
  "country_id": 320,
  "nationality_id": 320,
  "position_id": 25,
  "detailed_position_id": null
}
```

#### Includes Disponibile pentru Player
- `transfers` - Istoricul transferurilor (echipele prin care a trecut)
- `teams` - Echipele curente/anterioare
- `statistics` - Statistici detaliate per sezon
- `trophies` - Trofeele câștigate
- `sidelined` - Perioadele de accidentare
- `latest` - Ultimele meciuri jucate
- `country` - Țara de origine
- `nationality` - Naționalitatea

---

### 2. **TEAM** (Echipă)
**Endpoint**: `GET /v3/football/teams/{teamId}`
**Entity Rate Limit**: 3000 requests/hour

#### Date de Bază
```json
{
  "id": 180,
  "name": "Kilmarnock",
  "short_code": "KIL",
  "image_path": "https://cdn.sportmonks.com/images/...",
  "founded": 1869,
  "type": "domestic",
  "country_id": 1161,
  "venue_id": 8906,
  "gender": "male",
  "last_played_at": "2023-07-29 14:00:00"
}
```

#### Includes Disponibile pentru Team
- `country` - Țara echipei
- `venue` - Stadionul echipei
- `coach` - Antrenorul actual
- `seasons` - Sezoanele în care a participat
- `latest` - Ultimele meciuri
- `upcoming` - Meciurile viitoare
- `sidelined` - Jucători accidentați
- `trophies` - Palmares

---

### 3. **TRANSFERS** (Transferuri)
**Endpoint**: `GET /v3/football/transfers/players/{playerId}`
**Entity Rate Limit**: 3000 requests/hour

#### Date Disponibile
```json
{
  "id": 233102,
  "player_id": 172623,
  "type_id": 219,
  "from_team_id": 150,
  "to_team_id": 282,
  "position_id": 25,
  "detailed_position_id": 148,
  "date": "2023-07-26",
  "career_ended": false,
  "amount": 1500000,
  "currency": "EUR"
}
```

#### Informații Utile
- Echipele prin care a trecut un jucător
- Data și valoarea transferurilor
- Tipul transferului (definitiv, împrumut, liber de contract)
- Istoricul carierei

---

### 4. **SQUADS** (Loturi)
**Endpoint**: `GET /v3/football/squads/teams/{teamId}`
**Endpoint**: `GET /v3/football/squads/seasons/{seasonId}/teams/{teamId}` (ISTORIC)
**Entity Rate Limit**: 3000 requests/hour (PlayerTeam entity)

#### Date Disponibile
```json
{
  "id": 741458,
  "player_id": 172623,
  "team_id": 282,
  "position_id": 25,
  "detailed_position_id": 148,
  "start": "2023-07-26",
  "end": "2025-05-31",
  "captain": false,
  "jersey_number": 5
}
```

#### Funcționalități
- **Squad istoric din 2005** - poți vedea loturile echipelor din sezoane anterioare
- Numerele de tricou
- Căpitanii echipei
- Pozițiile jucătorilor

---

### 5. **SEASON STATISTICS** (Statistici Sezon)
**Endpoint**: `GET /v3/football/statistics/seasons/players/{playerId}`
**Entity Rate Limit**: 3000 requests/hour

#### Date Disponibile (exemplu pentru atacant)
- `goals` - Goluri marcate
- `assists` - Pase decisive
- `minutes_played` - Minute jucate
- `appearances` - Apariții
- `yellow_cards` - Cartonașe galbene
- `red_cards` - Cartonașe roșii
- `shots_total` - Șuturi totale
- `shots_on_target` - Șuturi pe poartă
- `dribbles_attempts` - Încercări de dribbling
- `dribbles_success` - Dribbling-uri reușite
- `passes_total` - Pase totale
- `passes_accuracy` - Precizie pase (%)
- `duels_won` - Dueluri câștigate
- `tackles` - Tackle-uri

---

### 6. **TRANSFER RUMOURS** (Zvonuri Transferuri)
**Endpoint**: `GET /v3/football/transfer-rumours`
**Entity Rate Limit**: 3000 requests/hour
**Necesită Add-on**: Transfer Rumours

#### Date Disponibile
```json
{
  "id": 5,
  "player_id": 34053,
  "from_team_id": 20,
  "to_team_id": 8,
  "probability": "HIGH",
  "source_name": "The Guardian",
  "source_url": "http://...",
  "amount": 144000000,
  "currency": "EUR",
  "date": "2025-06-23",
  "type_id": 219
}
```

#### Informații Utile
- Zvonuri recente despre transferuri
- Probabilitatea transferului (LOW, MEDIUM, HIGH, IMMINENT)
- Sursa zvonului (jurnaliști, publicații)
- Sumele estimate

---

## 🎮 IDEI DE JOCURI PENTRU HALFTIME SHOW

### Joc 1: **"Ghicește Jucătorul După Carieră"**
**Concept**: Afișezi echipele prin care a trecut un jucător și publicul trebuie să ghicească cine este.

**Date Necesare**:
- `GET /v3/football/transfers/players/{playerId}` - pentru istoricul transferurilor
- `GET /v3/football/players/{playerId}` - pentru detalii jucător

**Implementare**:
```javascript
// Exemplu date
{
  player: {
    id: 12345,
    name: "??? (ascuns)"
  },
  career: [
    { team: "Manchester United", years: "2004-2009", appearances: 196 },
    { team: "Real Madrid", years: "2009-2018", appearances: 438 },
    { team: "Juventus", years: "2018-2021", appearances: 134 },
    { team: "Al Nassr", years: "2023-present", appearances: 45 }
  ]
}
// Răspuns: Cristiano Ronaldo
```

**Dificultate Variabilă**:
- **Ușor**: Jucători celebri cu cariere variate
- **Mediu**: Jucători care au jucat la 3-4 echipe mid-tier
- **Greu**: Jucători mai puțin cunoscuți sau tineri cu cariere scurte

---

### Joc 2: **"Record de Transferuri"**
**Concept**: Afișezi mai mulți jucători și trebuie să ghicească care a avut cel mai scump transfer.

**Date Necesare**:
- `GET /v3/football/transfers/players/{playerId}?include=player,from,to`

**Implementare**:
```javascript
// Afișezi 4 jucători
[
  { name: "Neymar", team: "PSG", amount: "???" },
  { name: "Mbappe", team: "Real Madrid", amount: "???" },
  { name: "Grealish", team: "Man City", amount: "???" },
  { name: "Enzo Fernandez", team: "Chelsea", amount: "???" }
]
// Răspuns: Neymar - €222M
```

---

### Joc 3: **"Ghicește Anul Transferului"**
**Concept**: Afișezi un transfer celebru și trebuie să ghicească anul.

**Date Necesare**:
- `GET /v3/football/transfers/players/{playerId}`

**Exemple**:
- Ronaldo: Manchester United → Real Madrid (2009)
- Bale: Tottenham → Real Madrid (2013)
- Mbappe: Monaco → PSG (2017)

---

### Joc 4: **"Cine A Marcat Mai Mult?"**
**Concept**: Compari statisticile a 2 jucători dintr-un anumit sezon.

**Date Necesare**:
- `GET /v3/football/statistics/seasons/players/{playerId}`

**Implementare**:
```javascript
// Sezonul 2022/2023
{
  question: "Cine a marcat mai multe goluri în Premier League?",
  players: [
    { name: "Erling Haaland", goals: "???" },
    { name: "Harry Kane", goals: "???" }
  ]
}
// Răspuns: Haaland - 36 goluri
```

---

### Joc 5: **"Lotul Istoric"**
**Concept**: Afișezi un lot dintr-un anumit sezon și trebuie să ghicească echipa sau anul.

**Date Necesare**:
- `GET /v3/football/squads/seasons/{seasonId}/teams/{teamId}`

**Exemplu**:
```javascript
// Afișezi 11 jucători
[
  "Iker Casillas", "Sergio Ramos", "Pepe", "Marcelo",
  "Xabi Alonso", "Khedira", "Di Maria", "Özil",
  "Cristiano Ronaldo", "Benzema", "Higuain"
]
// Răspuns: Real Madrid 2011/2012 (sezonul cu "La Decima")
```

---

### Joc 6: **"Trofeele Jucătorului"**
**Concept**: Afișezi trofeele câștigate și trebuie să ghicească jucătorul.

**Date Necesare**:
- `GET /v3/football/players/{playerId}?include=trophies`

**Exemplu**:
```javascript
{
  trophies: [
    "Champions League x5",
    "Ballon d'Or x5",
    "Premier League x3",
    "La Liga x2",
    "Serie A x2"
  ]
}
// Răspuns: Cristiano Ronaldo
```

---

### Joc 7: **"Zvonuri vs Realitate"**
**Concept**: Afișezi zvonuri de transfer și trebuie să ghicească care s-au materializat.

**Date Necesare**:
- `GET /v3/football/transfer-rumours/players/{playerId}`
- `GET /v3/football/transfers/players/{playerId}`

**Exemplu**:
```javascript
// Vară 2024 - Zvonuri despre Mbappe
[
  "Real Madrid - IMMINENT",
  "PSG renewal - LOW",
  "Liverpool - MEDIUM"
]
// Care s-a întâmplat? → Real Madrid ✓
```

---

### Joc 8: **"Capitanul Misterios"**
**Concept**: Afișezi informații despre un căpitan (echipă, perioada, trofee) fără să-i spui numele.

**Date Necesare**:
- `GET /v3/football/squads/teams/{teamId}` (vezi `captain: true`)
- `GET /v3/football/players/{playerId}?include=trophies`

---

### Joc 9: **"Cel Mai Înalt/Greu Jucător"**
**Concept**: Quiz despre caracteristici fizice.

**Date Necesare**:
- `GET /v3/football/players/{playerId}` (vezi `height`, `weight`)

**Exemplu**:
- "Care atacant din Premier League este cel mai înalt?" → Jan Koller (202cm)

---

### Joc 10: **"Timeline Transferuri"**
**Concept**: Pui transferuri în ordine cronologică.

**Date Necesare**:
- `GET /v3/football/transfers/players/{playerId}`

**Exemplu**:
```javascript
// Sortează în ordine cronologică transferurile lui Ibrahimovic
[
  "Ajax", "Juventus", "Inter", "Barcelona",
  "AC Milan", "PSG", "Manchester United", "LA Galaxy"
]
```

---

## 🔧 Recomandări de Implementare

### 1. **Caching și Pre-Processing**
Deoarece fiecare entitate are **3000 req/h**, este esențial să:
- Pre-procesezi datele pentru jocuri în avans (offline)
- Cache-uiești informațiile despre jucători populari
- Construiești un DB local cu jucători/echipe/transferuri pentru rapid access

### 2. **Structură de Date Sugerate**
```typescript
interface HalftimeGameData {
  gameType: 'guess-player' | 'transfer-record' | 'career-path';
  difficulty: 'easy' | 'medium' | 'hard';
  player: {
    id: number;
    name: string; // ascuns până la răspuns
    image: string;
    career: Transfer[];
    stats: SeasonStats;
  };
  options?: string[]; // pentru multiple choice
  correctAnswer: string;
  hints?: string[];
}
```

### 3. **Endpoints de Colectare Date**
Pentru a construi baza de date pentru jocuri:

```bash
# 1. Colectează top jucători dintr-o ligă
GET /v3/football/topscorers/seasons/{seasonId}

# 2. Pentru fiecare jucător, adună:
GET /v3/football/players/{playerId}
GET /v3/football/transfers/players/{playerId}
GET /v3/football/statistics/seasons/players/{playerId}

# 3. Salvează într-un DB local pentru acces rapid
```

### 4. **Filtrare și Selecție Jucători**
```javascript
// Selectează jucători cu cariere interesante
const interestingPlayers = players.filter(p => 
  p.transfers.length >= 3 && // minim 3 echipe
  p.transfers.some(t => t.amount > 10_000_000) // cel puțin 1 transfer mare
);

// Sortează după dificultate
const easyPlayers = interestingPlayers.filter(p => 
  p.appearances > 300 && // jucători cu multe meciuri
  p.internationalCaps > 20 // cu meciuri la națională
);
```

---

## 📈 Date Statistice Disponibile

### Pentru Jucători
- **Ofensiv**: goluri, pase decisive, șuturi, driblinguri
- **Defensiv**: tackle-uri, intercepții, dueluri aeriene
- **Disciplinar**: cartonașe galbene/roșii
- **Performanță**: minute jucate, meciuri, rating mediu

### Pentru Echipe
- **Istoric**: anul înființării, trofee
- **Current**: lot actual, antrenor, stadion
- **Performanță**: rezultate recente, formă

---

## ⚠️ Limitări și Observații

1. **Rate Limits** - 3000/h per entitate
   - Playerul și Transferurile consumă din aceeași entitate "Player"
   - Planifică request-urile cu grijă

2. **Date Istorice**
   - Squads disponibile de la **2005** în sus
   - Nu toate ligile au date complete pentru toate sezoanele

3. **Transfer Rumours**
   - Necesită add-on separat
   - Date disponibile doar pentru transferuri recente/curente

4. **Acuratețe Date**
   - Unele statistici pot fi incomplete pentru ligi mai mici
   - Verifică `has_values: true/false` în răspunsuri

---

## 🎯 Concluzie

SportMonks API oferă date suficiente pentru a crea **jocuri interactive complexe și diverse** pentru halftime shows. Cele mai bune cazuri de utilizare sunt:

✅ **Cel mai potrivit**:
- Ghicește jucătorul după carieră (transferuri)
- Comparații statistici între jucători
- Quiz-uri despre trofee și realizări
- Timeline-uri și cronologii

⚠️ **Necesită procesare**:
- Loturile istorice (trebuie descărcate și procesate)
- Statistici comparative (calcule agregat)

❌ **Nu este disponibil direct**:
- Trivia despre viața personală a jucătorilor
- Fun facts non-statistice
- Date despre echipele naționale (limitate)

**Recomandare**: Construiește un sistem de pre-procesare care să descarce și să organizeze datele într-un format optimizat pentru jocurile tale, apoi folosește API-ul doar pentru update-uri periodice.
