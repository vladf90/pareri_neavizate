# SportMonks - Date Disponibile pentru Watch Along

## Sumar Executiv

Acest document listează toate datele disponibile din SportMonks API v3 pe care le putem folosi în aplicația Watch Along pentru a crea overlay-uri grafice atractive.

---

## 📊 1. STANDINGS (Clasamente)

### Endpoint

```
GET /v3/football/standings/seasons/{seasonId}
```

### Date Disponibile

| Câmp                      | Descriere            | Exemplu     |
| ------------------------- | -------------------- | ----------- |
| `position`                | Poziția în clasament | 1, 2, 3...  |
| `participant.name`        | Numele echipei       | "Arsenal"   |
| `participant.short_code`  | Cod scurt            | "ARS"       |
| `participant.image_path`  | Logo echipă          | URL imagine |
| `points`                  | Puncte totale        | 45          |
| `details.played`          | Meciuri jucate       | 20          |
| `details.won`             | Victorii             | 14          |
| `details.draw`            | Egaluri              | 3           |
| `details.lost`            | Înfrângeri           | 3           |
| `details.goals_for`       | Goluri marcate       | 42          |
| `details.goals_against`   | Goluri primite       | 18          |
| `details.goal_difference` | Golaveraj            | +24         |
| `form`                    | Forma (ultimele 5)   | "WWDLW"     |

### Includes

- `participant` - Detalii echipă
- `details` - Statistici detaliate
- `form` - Forma recentă

### Utilizare UI

- ✅ Tabel clasament general
- ✅ Clasament mini (top 5/top 10)
- ✅ Overlay forma echipei
- ✅ Comparație poziție home vs away

---

## 📊 2. LIVE STANDINGS (Clasament Live)

### Endpoint

```
GET /v3/football/standings/live/leagues/{leagueId}
```

### Descriere

Returnează clasamentul **în timp real** incluzând rezultatele meciurilor în desfășurare. Datele sunt calculate live pe baza scorurilor curente.

### Date Disponibile

Aceleași ca și Standings normal, dar actualizate în timp real.

### Notă

⚠️ Returnează date doar când sunt meciuri live în acea ligă.

### Utilizare UI

- ✅ Clasament live cu highlight pe echipele care joacă
- ✅ Animații poziție ↑↓ în timpul meciului
- ✅ "Dacă rămâne acest scor..." preview

---

## 📊 3. FIXTURE STATISTICS (Statistici Meci)

### Endpoint

```
GET /v3/football/fixtures/{fixtureId}?include=statistics
```

### Toate Statisticile Disponibile

| Tip Statistică      | Descriere                 | Tip Date    |
| ------------------- | ------------------------- | ----------- |
| `Ball Possession`   | Posesia mingii            | % (ex: 55%) |
| `Total Shots`       | Total șuturi              | Număr       |
| `Shots On Target`   | Șuturi pe poartă          | Număr       |
| `Shots Off Target`  | Șuturi pe lângă           | Număr       |
| `Blocked Shots`     | Șuturi blocate            | Număr       |
| `Shots Inside Box`  | Șuturi din careu          | Număr       |
| `Shots Outside Box` | Șuturi din afara careului | Număr       |
| `Corners`           | Cornere                   | Număr       |
| `Fouls`             | Faulturi                  | Număr       |
| `Offsides`          | Offside-uri               | Număr       |
| `Yellow Cards`      | Cartonașe galbene         | Număr       |
| `Red Cards`         | Cartonașe roșii           | Număr       |
| `Goalkeeper Saves`  | Parade portar             | Număr       |
| `Passes Total`      | Total pase                | Număr       |
| `Passes Accurate`   | Pase precise              | Număr       |
| `Passes Percentage` | % pase reușite            | %           |
| `Attacks`           | Atacuri                   | Număr       |
| `Dangerous Attacks` | Atacuri periculoase       | Număr       |
| `Free Kicks`        | Lovituri libere           | Număr       |
| `Throw-ins`         | Aut-uri                   | Număr       |
| `Goal Kicks`        | Lovituri de poartă        | Număr       |
| `Tackles`           | Tackleuri                 | Număr       |
| `Interceptions`     | Intercepții               | Număr       |
| `Aerials Won`       | Dueluri aeriene           | Număr       |
| `Clearances`        | Degajări                  | Număr       |

### Utilizare UI

- ✅ Panoul de statistici în overlay
- ✅ Bare de comparație vizuală
- ✅ Posesie animată
- ✅ Highlight statistici importante

---

## 📊 4. TEAM DETAILS (Detalii Echipă)

### Endpoint

```
GET /v3/football/teams/{teamId}?include=venue,coaches,latest
```

### Date Disponibile

#### Echipă

| Câmp         | Descriere        | Exemplu             |
| ------------ | ---------------- | ------------------- |
| `name`       | Nume complet     | "Manchester United" |
| `short_code` | Cod scurt        | "MUN"               |
| `image_path` | Logo             | URL                 |
| `founded`    | Anul înființării | 1878                |
| `gender`     | Gen              | "male"              |
| `type`       | Tip              | "domestic"          |

#### Venue (Stadion)

| Câmp         | Descriere       | Exemplu              |
| ------------ | --------------- | -------------------- |
| `name`       | Nume stadion    | "Old Trafford"       |
| `city_name`  | Oraș            | "Manchester"         |
| `capacity`   | Capacitate      | 74879                |
| `surface`    | Suprafață       | "grass"              |
| `image_path` | Imagine stadion | URL                  |
| `address`    | Adresă          | "Sir Matt Busby Way" |

#### Coaches (via include)

| Câmp       | Descriere      |
| ---------- | -------------- |
| `coach_id` | ID antrenor    |
| `active`   | Dacă e activ   |
| `start`    | Data începerii |

### Utilizare UI

- ✅ Card prezentare echipă
- ✅ Info stadion
- ✅ Bannere pre-meci

---

## 📊 5. TEAM FORM (Forma Echipei)

### Endpoint

```
GET /v3/football/teams/{teamId}?include=latest
```

### Date Disponibile

Array cu ultimele meciuri, fiecare conținând:
| Câmp | Descriere |
|------|-----------|
| `name` | "Team A vs Team B" |
| `starting_at` | Data meciului |
| `state.state` | Stare (FT, etc) |
| `participants[].meta.winner` | Dacă a câștigat |
| `scores[]` | Scoruri pe reprize |
| `venue` | Locul meciului |
| `league` | Competiția |

### Utilizare UI

- ✅ Formă vizuală: 🟢🟢🔴⚪🟢 (W/W/L/D/W)
- ✅ Ultimele 5 rezultate cu scoruri
- ✅ Streak ("3 victorii consecutive")

---

## 📊 6. HEAD TO HEAD (H2H)

### Endpoint

```
GET /v3/football/fixtures/head-to-head/{team1Id}/{team2Id}
```

### Date Disponibile

Array cu toate meciurile directe:
| Câmp | Descriere |
|------|-----------|
| `name` | "Team A vs Team B" |
| `starting_at` | Data meciului |
| `scores[].score.goals` | Goluri (per echipă) |
| `participants[].meta.winner` | Câștigător |
| `participants[].meta.location` | "home"/"away" |
| `venue` | Stadion |
| `league` | Competiție |
| `result_info` | "Team A won after full-time" |

### Statistici Calculabile

- Total meciuri
- Victorii Team A
- Victorii Team B
- Egaluri
- Goluri totale
- Cel mai frecvent scor
- Serie curentă

### Utilizare UI

- ✅ Panou H2H pre-meci
- ✅ Ultimele 5 întâlniri cu scoruri
- ✅ Statistici globale H2H
- ✅ "Arsenal conduce H2H cu 15-8"

---

## 📊 7. TOP SCORERS (Golgeteri)

### Endpoint

```
GET /v3/football/topscorers/seasons/{seasonId}?include=player,participant,type
```

### Date Disponibile

| Câmp                     | Descriere                 |
| ------------------------ | ------------------------- |
| `player.name`            | Nume jucător              |
| `player.display_name`    | Nume afișat               |
| `player.image_path`      | Foto jucător              |
| `player.position_id`     | Poziție                   |
| `participant.name`       | Echipa                    |
| `participant.image_path` | Logo echipă               |
| `total`                  | Goluri marcate            |
| `type.name`              | Tip (Goals, Assists, etc) |

### Tipuri de Topscorers

- Goals (Goluri)
- Assists (Pase decisive)
- Yellow Cards (Cartonașe)
- Red Cards
- Clean Sheets (Portari)

### Utilizare UI

- ✅ Top 5 golgeteri
- ✅ Card jucător cu statistici
- ✅ Comparație marcatori din meci

---

## 📊 8. TEAM SQUAD (Lotul Echipei)

### Endpoint

```
GET /v3/football/squads/teams/{teamId}?include=player,position,detailedPosition
```

### Date Disponibile per Jucător

| Câmp                    | Descriere         | Exemplu             |
| ----------------------- | ----------------- | ------------------- |
| `player.name`           | Nume complet      | "James Ward-Prowse" |
| `player.display_name`   | Nume afișat       | "James Ward-Prowse" |
| `player.common_name`    | Nume scurt        | "J. Ward-Prowse"    |
| `player.image_path`     | Foto              | URL                 |
| `player.height`         | Înălțime (cm)     | 177                 |
| `player.weight`         | Greutate (kg)     | 66                  |
| `player.date_of_birth`  | Data nașterii     | "1994-11-01"        |
| `jersey_number`         | Număr tricou      | 8                   |
| `captain`               | Este căpitan      | true/false          |
| `position.name`         | Poziție           | "Midfielder"        |
| `detailedposition.name` | Poziție detaliată | "Central Midfield"  |
| `start`                 | Contract de la    | "2023-08-14"        |
| `end`                   | Contract până la  | "2027-06-30"        |

### Utilizare UI

- ✅ Prezentare lot
- ✅ Formație cu poze jucători
- ✅ Card jucător detaliat

---

## 📊 9. FIXTURE EVENTS (Evenimente Meci)

### Endpoint

```
GET /v3/football/fixtures/{fixtureId}?include=events
```

### Tipuri de Evenimente

| Event Type       | Descriere              |
| ---------------- | ---------------------- |
| `GOAL`           | Gol                    |
| `OWN_GOAL`       | Autogol                |
| `PENALTY_GOAL`   | Gol din penalty        |
| `PENALTY_MISS`   | Penalty ratat          |
| `YELLOW_CARD`    | Cartonaș galben        |
| `RED_CARD`       | Cartonaș roșu          |
| `YELLOWRED_CARD` | Al 2-lea galben (roșu) |
| `SUBSTITUTION`   | Schimbare              |
| `VAR`            | Decizie VAR            |

### Date per Eveniment

| Câmp                  | Descriere                   |
| --------------------- | --------------------------- |
| `minute`              | Minutul                     |
| `extra_minute`        | Minute adiționale           |
| `player_name`         | Nume jucător                |
| `related_player_name` | Jucător legat (pasa de gol) |
| `participant_id`      | Echipa                      |
| `result`              | Scorul după gol             |

### Utilizare UI

- ✅ Timeline evenimente
- ✅ Toast notificări gol/cartonaș
- ✅ Marcatori în scoreboard

---

## 📊 10. LINEUPS (Formații)

### Endpoint

```
GET /v3/football/fixtures/{fixtureId}?include=lineups.player
```

### Date Disponibile

| Câmp                | Descriere             |
| ------------------- | --------------------- |
| `formation_field`   | Poziție (1-4-3-3 etc) |
| `player.name`       | Nume jucător          |
| `player.image_path` | Foto                  |
| `jersey_number`     | Număr                 |
| `type_id`           | Titular/Rezervă       |
| `position`          | GK/DEF/MID/FWD        |

### Utilizare UI

- ✅ Formație vizuală pe teren
- ✅ Lista titulari + rezerve
- ✅ Overlay formație 11v11

---

## 📊 11. ROUNDS/MATCHDAYS (Etape)

### Endpoint

```
GET /v3/football/rounds/seasons/{seasonId}?include=fixtures
```

### Date Disponibile

| Câmp          | Descriere                 |
| ------------- | ------------------------- |
| `name`        | Număr etapă ("1", "2"...) |
| `finished`    | Dacă e terminată          |
| `is_current`  | Etapa curentă             |
| `starting_at` | Data început              |
| `ending_at`   | Data sfârșit              |
| `fixtures`    | Meciurile din etapă       |

### Utilizare UI

- ✅ "Etapa 20 din 38"
- ✅ Alte meciuri din etapă
- ✅ Rezultate etapă

---

## 📊 12. PLAYER STATISTICS (Statistici Jucător)

### Endpoint

```
GET /v3/football/players/{playerId}?include=statistics
```

### Date Disponibile

| Câmp              | Descriere        |
| ----------------- | ---------------- |
| `name`            | Nume             |
| `image_path`      | Foto             |
| `position.name`   | Poziție          |
| `height`/`weight` | Date fizice      |
| `date_of_birth`   | Vârstă           |
| `statistics[]`    | Stats pe sezoane |

---

## 🎨 RECOMANDĂRI GRAFICE

### Pre-Meci Overlay

1. **H2H Panel**
   - Ultimele 5 meciuri directe
   - Statistici generale
2. **Team Cards**
   - Logo + Forma + Clasament
   - Stadion + Capacitate

3. **Formații**
   - 11v11 vizual
   - Jucători cheie evidențiați

### În Timpul Meciului

1. **Scoreboard Principal**
   - Scor + Minut + Marcatori

2. **Stats Bar**
   - Posesie + Șuturi + Cornere

3. **Event Toasts**
   - Gol/Cartonaș animații

4. **Live Standings**
   - Clasament updatat live

### Ticker (Alte Meciuri)

- Scor + Minut
- Logo echipe
- Marcatori

---

## 📦 ID-uri Utile

### Ligi Populare

| Liga             | ID  |
| ---------------- | --- |
| Premier League   | 8   |
| La Liga          | 564 |
| Serie A          | 384 |
| Bundesliga       | 82  |
| Ligue 1          | 301 |
| Champions League | 2   |
| Europa League    | 5   |

### Sezoane Curente (2024/2025)

| Liga             | Season ID |
| ---------------- | --------- |
| Premier League   | 23614     |
| Champions League | 23744     |

---

## ⚠️ Limitări

1. **Rate Limit**: 3000 requests/hour
2. **Batch max**: 50 fixtures per request
3. **Unele include-uri necesită plan superior** (ex: ballCoordinates, heatmaps)
4. **Live standings** - doar când sunt meciuri live

---

## 📋 PRIORITATE IMPLEMENTARE

### 🔴 Prioritate ÎNALTĂ (v1)

1. ✅ Match Statistics (deja parțial)
2. ⬜ Standings (clasament)
3. ⬜ H2H (head to head)
4. ⬜ Team Form (forma)

### 🟡 Prioritate MEDIE (v2)

5. ⬜ Live Standings
6. ⬜ Top Scorers
7. ⬜ Lineups/Formations vizual

### 🟢 Prioritate SCĂZUTĂ (v3)

8. ⬜ Team Squad complet
9. ⬜ Player Statistics detaliate
10. ⬜ Rounds/Matchdays context

---

## NEXT STEPS

Spune-mi ce vrei să implementăm prima dată și vom trece la cod!

Recomand să începem cu:

1. **Standings** - cel mai vizual impact
2. **H2H** - esențial pentru pre-meci
3. **Team Form** - simplu și atractiv
