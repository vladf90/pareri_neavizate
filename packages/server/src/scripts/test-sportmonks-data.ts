/**
 * Script de test pentru a explora datele disponibile în SportMonks API
 * Rulează cu: npx tsx src/scripts/test-sportmonks-data.ts
 */

import { config } from "../config.js";

const BASE_URL = config.sportmonks.baseUrl;
const TOKEN = config.sportmonks.token;

async function fetchSportMonks(endpoint: string, includes?: string[]): Promise<any> {
  const url = new URL(endpoint, BASE_URL);

  if (includes?.length) {
    url.searchParams.set("include", includes.join(";"));
  }

  console.log(`\n📡 Fetching: ${url.toString()}\n`);

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: TOKEN,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    console.error(`❌ Error ${response.status}: ${response.statusText}`);
    return null;
  }

  return response.json();
}

function logSection(title: string) {
  console.log("\n" + "=".repeat(80));
  console.log(`📊 ${title}`);
  console.log("=".repeat(80));
}

function logKeys(obj: any, prefix = "", maxDepth = 2, currentDepth = 0) {
  if (!obj || typeof obj !== "object" || currentDepth >= maxDepth) return;

  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const type = Array.isArray(value) ? "array" : typeof value;

    if (type === "array" && value.length > 0) {
      console.log(`${prefix}${key}: [${type}] (${value.length} items)`);
      if (typeof value[0] === "object") {
        logKeys(value[0], prefix + "  └─ ", maxDepth, currentDepth + 1);
      }
    } else if (type === "object" && value !== null) {
      console.log(`${prefix}${key}: {object}`);
      logKeys(value, prefix + "  └─ ", maxDepth, currentDepth + 1);
    } else {
      console.log(`${prefix}${key}: ${type} = ${JSON.stringify(value)?.substring(0, 50)}`);
    }
  }
}

async function testStandings() {
  logSection("1. STANDINGS (Clasament)");

  // Premier League season 2024/2025 - ID: 23614
  const data = await fetchSportMonks("/v3/football/standings/seasons/23614", [
    "participant",
    "details",
    "form",
  ]);

  if (data?.data) {
    console.log("\n📋 Structura Standings:");
    console.log("Număr intrări:", data.data.length);
    if (data.data[0]) {
      console.log("\nPrimul standing entry:");
      logKeys(data.data[0], "  ");
      console.log("\n📄 Exemplu complet (primele 3):");
      console.log(JSON.stringify(data.data.slice(0, 3), null, 2));
    }
  }

  return data;
}

async function testLiveStandings() {
  logSection("2. LIVE STANDINGS (Clasament Live)");

  // Premier League season 2024/2025
  const data = await fetchSportMonks("/v3/football/standings/live/leagues/8", [
    "participant",
    "details",
  ]);

  if (data?.data) {
    console.log("\n📋 Live Standings disponibil:");
    console.log("Număr intrări:", data.data?.length || 0);
    if (data.data[0]) {
      logKeys(data.data[0], "  ");
    }
  } else {
    console.log("ℹ️ Live standings nu returnează date când nu sunt meciuri live");
  }

  return data;
}

async function testFixtureStatistics(fixtureId: string = "19134088") {
  logSection("3. FIXTURE STATISTICS (Statistici Meci)");

  const data = await fetchSportMonks(`/v3/football/fixtures/${fixtureId}`, [
    "statistics",
    "participants",
  ]);

  if (data?.data?.statistics) {
    console.log("\n📋 Statistici disponibile:");
    console.log("Număr entries:", data.data.statistics.length);

    // Group by type
    const types = new Set<string>();
    for (const stat of data.data.statistics) {
      if (stat.type?.name) types.add(stat.type.name);
    }
    console.log("\n📊 Tipuri de statistici găsite:");
    types.forEach((t) => console.log(`  - ${t}`));

    console.log("\n📄 Exemplu complet statistici:");
    console.log(JSON.stringify(data.data.statistics.slice(0, 5), null, 2));
  }

  return data;
}

async function testTeamDetails(teamId: string = "1") {
  logSection("4. TEAM DETAILS (Detalii Echipă)");

  const data = await fetchSportMonks(`/v3/football/teams/${teamId}`, [
    "venue",
    "coaches",
    "players",
    "latest",
    "upcoming",
    "seasons",
    "activeSeasons",
    "statistics",
    "trophies",
  ]);

  if (data?.data) {
    console.log("\n📋 Detalii echipă disponibile:");
    logKeys(data.data, "  ", 3);

    console.log("\n📄 JSON parțial (fără players):");
    const { players, ...rest } = data.data;
    console.log(JSON.stringify(rest, null, 2).substring(0, 3000));

    if (data.data.players) {
      console.log(`\n👥 Jucători: ${data.data.players.length} în lot`);
      if (data.data.players[0]) {
        console.log("Structura jucător:");
        logKeys(data.data.players[0], "  ");
      }
    }
  }

  return data;
}

async function testTeamForm(teamId: string = "1") {
  logSection("4b. TEAM FORM (Forma echipei)");

  // Get latest 5 matches
  const data = await fetchSportMonks(`/v3/football/fixtures`, ["participants", "scores", "state"]);

  // Alternativ: folosim include latest pe team
  const teamData = await fetchSportMonks(`/v3/football/teams/${teamId}`, ["latest"]);

  if (teamData?.data?.latest) {
    console.log("\n📋 Ultimele meciuri:");
    console.log("Număr meciuri:", teamData.data.latest.length);
    console.log("\n📄 Exemplu:");
    console.log(JSON.stringify(teamData.data.latest.slice(0, 2), null, 2));
  }

  return teamData;
}

async function testH2H(team1Id: string = "1", team2Id: string = "14") {
  logSection("5. HEAD TO HEAD (H2H)");

  const data = await fetchSportMonks(`/v3/football/fixtures/head-to-head/${team1Id}/${team2Id}`, [
    "participants",
    "scores",
    "state",
    "venue",
    "league",
  ]);

  if (data?.data) {
    console.log("\n📋 H2H Meciuri:");
    console.log("Număr meciuri:", data.data.length);

    if (data.data[0]) {
      console.log("\nStructura meci H2H:");
      logKeys(data.data[0], "  ");

      console.log("\n📄 Ultimele 3 meciuri:");
      console.log(JSON.stringify(data.data.slice(0, 3), null, 2));
    }
  }

  return data;
}

async function testTopScorers(seasonId: string = "23614") {
  logSection("6. TOP SCORERS (Golgeteri sezon)");

  const data = await fetchSportMonks(`/v3/football/topscorers/seasons/${seasonId}`, [
    "player",
    "participant",
    "type",
  ]);

  if (data?.data) {
    console.log("\n📋 Top Scorers:");
    console.log("Număr intrări:", data.data.length);

    // Filtrăm doar goals
    const goals = data.data.filter((s: any) => s.type?.name?.toLowerCase().includes("goal"));
    console.log("Golgeteri:", goals.length);

    if (goals[0]) {
      console.log("\nStructura topscorer:");
      logKeys(goals[0], "  ");

      console.log("\n📄 Top 5 golgeteri:");
      console.log(JSON.stringify(goals.slice(0, 5), null, 2));
    }
  }

  return data;
}

async function testTeamSquad(teamId: string = "1") {
  logSection("7. TEAM SQUAD (Lotul echipei)");

  const data = await fetchSportMonks(`/v3/football/squads/teams/${teamId}`, [
    "player",
    "position",
    "detailedPosition",
  ]);

  if (data?.data) {
    console.log("\n📋 Squad:");
    console.log("Număr jucători:", data.data.length);

    if (data.data[0]) {
      console.log("\nStructura jucător în squad:");
      logKeys(data.data[0], "  ", 3);

      console.log("\n📄 Primii 3 jucători:");
      console.log(JSON.stringify(data.data.slice(0, 3), null, 2));
    }
  }

  return data;
}

async function testCoaches(teamId: string = "1") {
  logSection("8. COACHES (Antrenori)");

  const data = await fetchSportMonks(`/v3/football/coaches`, ["teams"]);

  // sau direct pe team
  const teamData = await fetchSportMonks(`/v3/football/teams/${teamId}`, ["coaches"]);

  if (teamData?.data?.coaches) {
    console.log("\n📋 Antrenori echipă:");
    console.log(JSON.stringify(teamData.data.coaches, null, 2));
  }

  return teamData;
}

async function testFixtureWithAllData(fixtureId: string = "19134088") {
  logSection("9. FIXTURE COMPLET (Toate datele unui meci)");

  const data = await fetchSportMonks(`/v3/football/fixtures/${fixtureId}`, [
    "participants",
    "scores",
    "state",
    "venue",
    "league",
    "season",
    "events",
    "statistics",
    "lineups.player",
    "periods",
    "timeline",
    "coaches",
    "formations",
    "ballCoordinates",
    "comments",
    "highlights",
    "tvstations",
    "referees",
    "metadata",
  ]);

  if (data?.data) {
    console.log("\n📋 Fixture complet - chei disponibile:");
    logKeys(data.data, "  ", 2);
  }

  return data;
}

async function testRounds(seasonId: string = "23614") {
  logSection("10. ROUNDS/MATCHDAYS (Etape)");

  const data = await fetchSportMonks(`/v3/football/rounds/seasons/${seasonId}`, ["fixtures"]);

  if (data?.data) {
    console.log("\n📋 Etape în sezon:");
    console.log("Număr etape:", data.data.length);

    if (data.data[0]) {
      console.log("\nStructura etapă:");
      logKeys(data.data[0], "  ");
    }
  }

  return data;
}

async function testPlayerStatistics(playerId: string = "276") {
  logSection("11. PLAYER STATISTICS");

  const data = await fetchSportMonks(`/v3/football/players/${playerId}`, [
    "statistics",
    "teams",
    "position",
  ]);

  if (data?.data) {
    console.log("\n📋 Player data:");
    logKeys(data.data, "  ", 3);
  }

  return data;
}

// ========== MAIN ==========
async function main() {
  console.log("🚀 SportMonks Data Explorer");
  console.log("===========================\n");
  console.log("API Token:", TOKEN ? "✅ Configurat" : "❌ LIPSĂ!");

  if (!TOKEN) {
    console.error("Setează SPORTMONKS_TOKEN în .env!");
    process.exit(1);
  }

  try {
    // Test fiecare endpoint
    await testStandings();
    await testLiveStandings();
    await testFixtureStatistics();
    await testTeamDetails();
    await testTeamForm();
    await testH2H();
    await testTopScorers();
    await testTeamSquad();
    await testCoaches();
    await testFixtureWithAllData();
    await testRounds();
    await testPlayerStatistics();

    logSection("DONE!");
    console.log("\n✅ Toate testele completate!");
  } catch (err) {
    console.error("\n❌ Eroare:", err);
  }
}

main();
