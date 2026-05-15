import express, { Request, Response } from "express";
import type { AppStateStore } from "../store/AppStateStore.js";
import type { ProviderRegistry } from "../providers/ProviderRegistry.js";
import { WidgetDataCache } from "../services/WidgetDataCache.js";
import { SportMonksClient } from "../providers/sportmonks/client.js";
import type { 
  SMSquadResponse, 
  SMSquadPlayer, 
  SMPlayerResponse, 
  SMPlayerStatistic 
} from "../providers/sportmonks/types.js";
import { apiLogger } from "../utils/logger.js";
import { apiRateLimiter, debugRateLimiter, widgetRateLimiter } from "./middleware.js";
import { GFX_REGISTRY, DEFAULT_TOGGLES, type GfxKey, type Toggles } from "@parerineavizate/shared/models";

// Create widget cache singleton
let widgetCache: WidgetDataCache | null = null;

function getWidgetCache(): WidgetDataCache {
  if (!widgetCache) {
    widgetCache = new WidgetDataCache(new SportMonksClient());
  }
  return widgetCache;
}

export function createHttpRoutes(
  app: express.Application,
  store: AppStateStore,
  providerRegistry: ProviderRegistry
): void {
  // Apply rate limiters by route prefix
  app.use("/api/widgets", widgetRateLimiter);
  app.use("/api", apiRateLimiter);
  app.use("/debug", debugRateLimiter);

  // Health check endpoint
  app.get("/health", (_req: Request, res: Response) => {
    const provider = providerRegistry.getActiveProvider();
    const providerInfo = providerRegistry.getProviderInfo();

    res.json({
      status: "ok",
      timestamp: Date.now(),
      provider: {
        name: providerInfo.name,
        status: providerInfo.status,
        ready: provider?.isReady() ?? false,
      },
    });
  });

  // Debug: get current state (should be protected in production)
  app.get("/state", (_req: Request, res: Response) => {
    const state = store.getState();
    res.json(state);
  });

  // Debug: get raw fixture stats from API
  app.get("/debug/fixture/:id/raw", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const client = new SportMonksClient();
      
      // Fetch with all stat includes
      const response = await (client as any).fetch(`/v3/football/fixtures/${id}`, {
        includes: ["statistics.type", "trends.type", "participants"],
      });
      
      if (!response?.data) {
        res.status(404).json({ error: "Fixture not found" });
        return;
      }
      
      const fixture = response.data;
      
      res.json({
        fixtureId: id,
        hasStatistics: !!fixture.statistics,
        statisticsCount: fixture.statistics?.length || 0,
        hasTrends: !!fixture.trends,
        trendsCount: fixture.trends?.length || 0,
        sampleStatistic: fixture.statistics?.[0] || null,
        sampleTrend: fixture.trends?.[0] || null,
        allTrends: fixture.trends || [],
        allStatistics: fixture.statistics || [],
      });
    } catch (err) {
      res.status(500).json({ error: String(err) });
    }
  });

  // ==================== GFX API (Stream Deck) ====================

  /**
   * GET /api/gfx - Get all GFX elements with their current state
   * Returns registry metadata + current toggle values
   */
  app.get("/api/gfx", (_req: Request, res: Response) => {
    const state = store.getState();
    const currentToggles = state.selection.toggles;

    const gfx = GFX_REGISTRY.map((meta) => ({
      ...meta,
      enabled: currentToggles[meta.key] ?? meta.defaultEnabled,
    }));

    res.json({
      gfx,
      categories: {
        master: gfx.filter((g) => g.category === "master"),
        standalone: gfx.filter((g) => g.category === "standalone"),
        effect: gfx.filter((g) => g.category === "effect"),
      },
    });
  });

  /**
   * GET /api/gfx/:key - Get single GFX element state
   */
  app.get("/api/gfx/:key", (req: Request, res: Response) => {
    const { key } = req.params;
    const meta = GFX_REGISTRY.find((g) => g.key === key);

    if (!meta) {
      res.status(404).json({ error: `GFX element '${key}' not found` });
      return;
    }

    const state = store.getState();
    const enabled = state.selection.toggles[key as GfxKey] ?? meta.defaultEnabled;

    res.json({ ...meta, enabled });
  });

  /**
   * POST /api/gfx/:key/enable - Enable a GFX element
   * Stream Deck: single button press to show
   */
  app.post("/api/gfx/:key/enable", (req: Request, res: Response) => {
    const { key } = req.params;
    const meta = GFX_REGISTRY.find((g) => g.key === key);

    if (!meta) {
      res.status(404).json({ error: `GFX element '${key}' not found` });
      return;
    }

    store.setToggles({ [key]: true });
    apiLogger.info({ gfxKey: key }, "GFX enabled via API");

    res.json({ key, enabled: true, message: `${meta.label} enabled` });
  });

  /**
   * POST /api/gfx/:key/disable - Disable a GFX element
   * Stream Deck: single button press to hide
   */
  app.post("/api/gfx/:key/disable", (req: Request, res: Response) => {
    const { key } = req.params;
    const meta = GFX_REGISTRY.find((g) => g.key === key);

    if (!meta) {
      res.status(404).json({ error: `GFX element '${key}' not found` });
      return;
    }

    store.setToggles({ [key]: false });
    apiLogger.info({ gfxKey: key }, "GFX disabled via API");

    res.json({ key, enabled: false, message: `${meta.label} disabled` });
  });

  /**
   * POST /api/gfx/:key/toggle - Toggle a GFX element
   * Stream Deck: single button press to toggle on/off
   */
  app.post("/api/gfx/:key/toggle", (req: Request, res: Response) => {
    const { key } = req.params;
    const meta = GFX_REGISTRY.find((g) => g.key === key);

    if (!meta) {
      res.status(404).json({ error: `GFX element '${key}' not found` });
      return;
    }

    const state = store.getState();
    const currentValue = state.selection.toggles[key as GfxKey] ?? meta.defaultEnabled;
    const newValue = !currentValue;

    store.setToggles({ [key]: newValue });
    apiLogger.info({ gfxKey: key, enabled: newValue }, "GFX toggled via API");

    res.json({ key, enabled: newValue, message: `${meta.label} ${newValue ? "enabled" : "disabled"}` });
  });

  /**
   * PATCH /api/gfx - Update multiple GFX elements at once
   * Body: { toggles: { showMasterScoreboard: true, showMasterTicker: false } }
   */
  app.patch("/api/gfx", (req: Request, res: Response) => {
    const { toggles } = req.body;

    if (!toggles || typeof toggles !== "object") {
      res.status(400).json({ error: "Request body must contain 'toggles' object" });
      return;
    }

    // Validate all keys exist in registry
    const invalidKeys = Object.keys(toggles).filter(
      (key) => !GFX_REGISTRY.find((g) => g.key === key)
    );

    if (invalidKeys.length > 0) {
      res.status(400).json({ error: `Invalid GFX keys: ${invalidKeys.join(", ")}` });
      return;
    }

    // Validate all values are booleans
    const nonBooleans = Object.entries(toggles).filter(
      ([, value]) => typeof value !== "boolean"
    );

    if (nonBooleans.length > 0) {
      res.status(400).json({ error: "All toggle values must be booleans" });
      return;
    }

    store.setToggles(toggles as Partial<Toggles>);
    apiLogger.info({ toggles }, "Multiple GFX updated via API");

    const state = store.getState();
    res.json({
      message: `Updated ${Object.keys(toggles).length} GFX elements`,
      toggles: state.selection.toggles,
    });
  });

  /**
   * POST /api/gfx/reset - Reset all GFX to defaults
   */
  app.post("/api/gfx/reset", (_req: Request, res: Response) => {
    store.setToggles({ ...DEFAULT_TOGGLES });
    apiLogger.info("GFX reset to defaults via API");

    res.json({
      message: "All GFX reset to defaults",
      toggles: DEFAULT_TOGGLES,
    });
  });

  /**
   * POST /api/gfx/trigger/:key - Trigger a one-shot effect (auto-resets after duration)
   * For effects like goalAlert that should auto-disable
   */
  app.post("/api/gfx/trigger/:key", (req: Request, res: Response) => {
    const { key } = req.params;
    const { duration = 5000 } = req.body; // default 5 seconds

    const meta = GFX_REGISTRY.find((g) => g.key === key && g.category === "effect");

    if (!meta) {
      res.status(404).json({ error: `Effect '${key}' not found (must be category: effect)` });
      return;
    }

    // Enable the effect
    store.setToggles({ [key]: true });
    apiLogger.info({ gfxKey: key, duration }, "GFX effect triggered via API");

    // Auto-disable after duration
    setTimeout(() => {
      store.setToggles({ [key]: false });
      apiLogger.info({ gfxKey: key }, "GFX effect auto-disabled");
    }, duration);

    res.json({
      key,
      triggered: true,
      duration,
      message: `${meta.label} triggered for ${duration}ms`,
    });
  });

  // ==================== RESOLUME ZONE API ====================

  /**
   * GET /api/resolume/zones - Get all Resolume zones with their current state
   */
  app.get("/api/resolume/zones", (_req: Request, res: Response) => {
    const config = store.getResolumeConfig();
    res.json({
      zones: config.zones,
      canvasWidth: config.canvasWidth,
      canvasHeight: config.canvasHeight,
    });
  });

  /**
   * POST /api/resolume/zone/:zoneId/enable - Enable a zone (set visible: true)
   */
  app.post("/api/resolume/zone/:zoneId/enable", (req: Request, res: Response) => {
    const { zoneId } = req.params;
    const config = store.getResolumeConfig();
    const zone = config.zones.find((z) => z.id === zoneId);

    if (!zone) {
      res.status(404).json({ error: `Zone '${zoneId}' not found` });
      return;
    }

    store.updateResolumeZone(zoneId, { visible: true });
    apiLogger.info({ zoneId }, "Resolume zone enabled via API");

    res.json({ zoneId, visible: true, message: `Zone ${zone.name} enabled` });
  });

  /**
   * POST /api/resolume/zone/:zoneId/disable - Disable a zone (set visible: false)
   */
  app.post("/api/resolume/zone/:zoneId/disable", (req: Request, res: Response) => {
    const { zoneId } = req.params;
    const config = store.getResolumeConfig();
    const zone = config.zones.find((z) => z.id === zoneId);

    if (!zone) {
      res.status(404).json({ error: `Zone '${zoneId}' not found` });
      return;
    }

    store.updateResolumeZone(zoneId, { visible: false });
    apiLogger.info({ zoneId }, "Resolume zone disabled via API");

    res.json({ zoneId, visible: false, message: `Zone ${zone.name} disabled` });
  });

  /**
   * POST /api/resolume/zone/:zoneId/toggle - Toggle a zone on/off
   */
  app.post("/api/resolume/zone/:zoneId/toggle", (req: Request, res: Response) => {
    const { zoneId } = req.params;
    const config = store.getResolumeConfig();
    const zone = config.zones.find((z) => z.id === zoneId);

    if (!zone) {
      res.status(404).json({ error: `Zone '${zoneId}' not found` });
      return;
    }

    const newVisible = !zone.visible;
    store.updateResolumeZone(zoneId, { visible: newVisible });
    apiLogger.info({ zoneId, visible: newVisible }, "Resolume zone toggled via API");

    res.json({ zoneId, visible: newVisible, message: `Zone ${zone.name} ${newVisible ? "enabled" : "disabled"}` });
  });

  /**
   * POST /api/resolume/standings/enable - Enable both UCL standings zones (zone-4 and zone-5)
   */
  app.post("/api/resolume/standings/enable", (_req: Request, res: Response) => {
    store.updateResolumeZone("zone-4", { visible: true });
    store.updateResolumeZone("zone-5", { visible: true });
    apiLogger.info("Resolume standings zones (4+5) enabled via API");

    res.json({ 
      zones: ["zone-4", "zone-5"], 
      visible: true, 
      message: "UCL Standings zones enabled" 
    });
  });

  /**
   * POST /api/resolume/standings/disable - Disable both UCL standings zones (zone-4 and zone-5)
   */
  app.post("/api/resolume/standings/disable", (_req: Request, res: Response) => {
    store.updateResolumeZone("zone-4", { visible: false });
    store.updateResolumeZone("zone-5", { visible: false });
    apiLogger.info("Resolume standings zones (4+5) disabled via API");

    res.json({ 
      zones: ["zone-4", "zone-5"], 
      visible: false, 
      message: "UCL Standings zones disabled" 
    });
  });

  /**
   * POST /api/resolume/standings/toggle - Toggle both UCL standings zones (zone-4 and zone-5)
   */
  app.post("/api/resolume/standings/toggle", (_req: Request, res: Response) => {
    const config = store.getResolumeConfig();
    const zone4 = config.zones.find((z) => z.id === "zone-4");
    
    // Use zone-4's current state to determine toggle direction
    const newVisible = !(zone4?.visible ?? false);
    
    store.updateResolumeZone("zone-4", { visible: newVisible });
    store.updateResolumeZone("zone-5", { visible: newVisible });
    apiLogger.info({ visible: newVisible }, "Resolume standings zones (4+5) toggled via API");

    res.json({ 
      zones: ["zone-4", "zone-5"], 
      visible: newVisible, 
      message: `UCL Standings zones ${newVisible ? "enabled" : "disabled"}` 
    });
  });

  // Debug: get available matches (for mock provider testing)
  app.get("/debug/matches", async (_req: Request, res: Response) => {
    const provider = providerRegistry.getActiveProvider();
    if (!provider) {
      res.status(503).json({ error: "No provider available" });
      return;
    }

    // Check if mock provider with getAvailableMatches
    if ("getAvailableMatches" in provider && typeof provider.getAvailableMatches === "function") {
      const matches = provider.getAvailableMatches();
      res.json({ matches });
      return;
    }

    // Otherwise search for fixtures
    try {
      const matches = await provider.searchFixtures({ status: "live" });
      res.json({ matches });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch matches" });
    }
  });

  // Debug: provider info
  app.get("/debug/provider", (_req: Request, res: Response) => {
    res.json(providerRegistry.getProviderInfo());
  });

  // API: Search fixtures by date and optionally by league
  // Also triggers prefetch of static data (standings, form, H2H) in background
  app.get("/api/fixtures", async (req: Request, res: Response) => {
    const provider = providerRegistry.getActiveProvider();
    if (!provider) {
      res.status(503).json({ error: "No provider available" });
      return;
    }

    const { date, leagueId, status, prefetch } = req.query;
    const shouldPrefetch = prefetch !== "false"; // Default to true

    try {
      const matches = await provider.searchFixtures({
        date: date as string | undefined,
        competitionId: leagueId as string | undefined,
        status: status as "live" | "upcoming" | "finished" | undefined,
      });

      // Extract unique leagues from matches
      const leaguesMap = new Map<string, { id: string; name: string; country?: string }>();
      for (const match of matches) {
        if (!leaguesMap.has(match.competition.id)) {
          leaguesMap.set(match.competition.id, {
            id: match.competition.id,
            name: match.competition.name,
            country: match.competition.country,
          });
        }
      }
      const leagues = Array.from(leaguesMap.values());

      // Trigger prefetch in background (don't wait for it)
      if (shouldPrefetch && matches.length > 0) {
        const cache = getWidgetCache();
        const prefetchData = matches.map((m) => ({
          id: m.id,
          homeTeamId: m.homeTeam.id,
          awayTeamId: m.awayTeam.id,
          seasonId: m.competition.season?.id,
        }));
        
        // Fire and forget - prefetch runs in background
        cache.prefetchMatchesData(prefetchData).catch((err) => {
          apiLogger.error({ err }, "Background prefetch failed");
        });
        
        apiLogger.info(
          { matchCount: matches.length, date },
          "Triggered background prefetch for fixtures"
        );
      }

      res.json({ matches, leagues });
    } catch (err) {
      apiLogger.error({ err, date, leagueId, status }, "/api/fixtures error");
      res.status(500).json({ error: "Failed to fetch fixtures" });
    }
  });

  // API: Get leagues for a specific date
  app.get("/api/leagues", async (req: Request, res: Response) => {
    const provider = providerRegistry.getActiveProvider();
    if (!provider) {
      res.status(503).json({ error: "No provider available" });
      return;
    }

    const { date } = req.query;
    const searchDate = (date as string) || new Date().toISOString().split("T")[0];

    try {
      const matches = await provider.searchFixtures({ date: searchDate });

      // Extract unique leagues
      const leaguesMap = new Map<
        string,
        { id: string; name: string; country?: string; matchCount: number }
      >();
      for (const match of matches) {
        const existing = leaguesMap.get(match.competition.id);
        if (existing) {
          existing.matchCount++;
        } else {
          leaguesMap.set(match.competition.id, {
            id: match.competition.id,
            name: match.competition.name,
            country: match.competition.country,
            matchCount: 1,
          });
        }
      }

      const leagues = Array.from(leaguesMap.values()).sort((a, b) => a.name.localeCompare(b.name));

      res.json({ leagues, date: searchDate });
    } catch (err) {
      apiLogger.error({ err, date: searchDate }, "/api/leagues error");
      res.status(500).json({ error: "Failed to fetch leagues" });
    }
  });

  // API: Get team squad by team ID
  app.get("/api/squads/teams/:teamId", async (req: Request, res: Response) => {
    const { teamId } = req.params;
    
    if (!teamId) {
      res.status(400).json({ error: "Team ID is required" });
      return;
    }

    try {
      const client = new SportMonksClient();
      const squadData = await client.fetch(`/v3/football/squads/teams/${teamId}`, {
        includes: ["player"],
      }) as SMSquadResponse;

      apiLogger.info({ teamId, hasData: !!squadData?.data, dataType: Array.isArray(squadData?.data) ? 'array' : typeof squadData?.data }, "Squad data received");

      // Handle different response structures
      let squadArray: SMSquadPlayer[] = [];
      if (Array.isArray(squadData?.data)) {
        squadArray = squadData.data;
      } else if (squadData?.data && 'data' in squadData.data) {
        // If data is an object, it might be wrapped
        squadArray = Array.isArray(squadData.data.data) ? squadData.data.data : [];
      }

      // Map squad data to simpler format
      const squad = squadArray.map((item: SMSquadPlayer) => ({
        id: item.player_id,
        name: item.player?.display_name || item.player?.common_name || "Unknown",
        number: item.jersey_number,
        positionId: item.position_id,
        detailedPositionId: item.detailed_position_id,
        photoUrl: item.player?.image_path,
      }));

      apiLogger.info({ teamId, squadCount: squad.length }, "Squad mapped successfully");
      res.json({ squad });
    } catch (err) {
      apiLogger.error({ err, teamId }, "/api/squads/teams/:teamId error");
      res.status(500).json({ error: "Failed to fetch team squad" });
    }
  });

  // API: Get player details with statistics
  app.get("/api/players/:playerId", async (req: Request, res: Response) => {
    const { playerId } = req.params;
    const { seasonId, leagueId } = req.query;
    
    if (!playerId) {
      res.status(400).json({ error: "Player ID is required" });
      return;
    }

    try {
      const client = new SportMonksClient();
      const statTypeIds = [52, 79, 118, 119, 321]; // goals, assists, rating, minutes, appearances
      const filters: Record<string, string | number> = {
        playerStatisticDetailTypes: statTypeIds.join(","),
      };
      if (seasonId) {
        filters.playerStatisticSeasons = seasonId as string;
      }
      const playerData = await client.fetch(`/v3/football/players/${playerId}`, {
        includes: ["statistics", "statistics.details", "position", "detailedPosition", "metadata"],
        filters,
      }) as SMPlayerResponse;

      // Debug log to see what data we're getting
      apiLogger.info({ 
        playerId,
        hasData: !!playerData?.data,
        marketValue: playerData?.data?.market_value,
        marketValueCurrency: playerData?.data?.market_value_currency_code,
        statisticsCount: playerData?.data?.statistics?.length,
        playerName: playerData?.data?.display_name,
      }, "Player data received from SportMonks");

      if (!playerData?.data) {
        res.status(404).json({ error: "Player not found" });
        return;
      }

      const player = playerData.data;
      
      // Filter statistics by season and league if provided
      let stats: SMPlayerStatistic[] = player.statistics || [];
      if (seasonId && Array.isArray(stats)) {
        stats = stats.filter((s: SMPlayerStatistic) => s.season_id === parseInt(seasonId as string));
      }
      if (leagueId && Array.isArray(stats)) {
        stats = stats.filter((s: SMPlayerStatistic) => s.league_id === parseInt(leagueId as string));
      }

      // Aggregate statistics for the season
      const aggregated = {
        goals: 0,
        assists: 0,
        appearances: 0,
        minutes: 0,
        rating: null as number | null,
      };

      let ratingSum = 0;
      let ratingCount = 0;

      const toNumber = (value: unknown): number | null => {
        if (typeof value === "number") return value;
        if (typeof value === "string") {
          const num = parseFloat(value);
          return Number.isNaN(num) ? null : num;
        }
        return null;
      };

      stats.forEach((stat: SMPlayerStatistic) => {
        if (Array.isArray(stat.details)) {
          for (const detail of stat.details) {
            const typeId = detail.type_id ?? detail.type?.id;
            const value = toNumber(detail.value ?? detail.total ?? detail.data?.value);
            if (value === null || typeId === null || typeId === undefined) continue;

            switch (typeId) {
              case 52: // GOALS
                aggregated.goals += value;
                break;
              case 79: // ASSISTS
                aggregated.assists += value;
                break;
              case 321: // APPEARANCES
                aggregated.appearances += value;
                break;
              case 119: // MINUTES_PLAYED
                aggregated.minutes += value;
                break;
              case 118: // RATING
                ratingSum += value;
                ratingCount += 1;
                break;
              default:
                break;
            }
          }
          return;
        }

        if (stat.details) {
          aggregated.goals += stat.details.goals?.total || 0;
          aggregated.assists += stat.details.assists?.total || 0;
          aggregated.appearances += stat.details.lineups?.total || 0;
          aggregated.minutes += stat.details.minutes?.total || 0;

          if (stat.details.rating) {
            const rating = parseFloat(String(stat.details.rating));
            if (!isNaN(rating)) {
              ratingSum += rating;
              ratingCount += 1;
            }
          }
        }
      });

      if (ratingCount > 0) {
        aggregated.rating = ratingSum / ratingCount;
      }

      const hasMarketValue =
        typeof player.market_value === "number" &&
        player.market_value_currency_code;

      const response = {
        id: player.id,
        name: player.display_name || player.common_name || "Unknown",
        firstname: player.firstname || "",
        lastname: player.lastname || "",
        photoUrl: player.image_path,
        height: player.height,
        weight: player.weight,
        dateOfBirth: player.date_of_birth,
        nationality: player.nationality,
        position: player.position?.name || player.detailedPosition?.name || "Unknown",
        marketValue: hasMarketValue
          ? {
              value: player.market_value,
              currency: String(player.market_value_currency_code),
            }
          : null,
        statistics: aggregated,
      };

      res.json(response);
    } catch (err) {
      apiLogger.error({ err, playerId }, "/api/players/:playerId error");
      res.status(500).json({ error: "Failed to fetch player data" });
    }
  });

  // ==================== WIDGET APIS ====================

  // ==================== STANDINGS ROUTES ====================
  // STABLE URLS FOR OBS - these never change, they auto-detect from mainMatch
  
  // Widget: STATIC standings - always uses regular season standings table
  // URL for OBS: http://localhost:3001/api/widgets/standings/static
  app.get("/api/widgets/standings/static", async (_req: Request, res: Response) => {
    const state = store.getState();
    const mainMatch = state.data.mainMatch;
    const seasonId = mainMatch?.competition?.season?.id;

    if (!seasonId) {
      res.status(400).json({ error: "No mainMatch with season selected" });
      return;
    }

    try {
      const cache = getWidgetCache();
      const standings = await cache.getStandings(seasonId);

      if (!standings) {
        res.status(404).json({ error: "Standings not found" });
        return;
      }

      if (mainMatch?.competition) {
        standings.competitionName = mainMatch.competition.name;
        standings.competitionId = mainMatch.competition.id;
      }

      res.json(standings);
    } catch (err) {
      apiLogger.error({ err, seasonId }, "/api/widgets/standings/static error");
      res.status(500).json({ error: "Failed to fetch static standings" });
    }
  });

  // Widget: LIVE standings - recalculated in real-time based on live scores
  // Falls back to static if no live matches in the league
  // URL for OBS: http://localhost:3001/api/widgets/standings/live
  app.get("/api/widgets/standings/live", async (_req: Request, res: Response) => {
    const state = store.getState();
    const mainMatch = state.data.mainMatch;
    const leagueId = mainMatch?.competition?.id;
    const seasonId = mainMatch?.competition?.season?.id;

    if (!leagueId && !seasonId) {
      res.status(400).json({ error: "No mainMatch with competition selected" });
      return;
    }

    try {
      const cache = getWidgetCache();
      let standings = null;

      // First try LIVE standings (recalculated based on live scores)
      if (leagueId) {
        standings = await cache.getLiveStandings(leagueId, seasonId);
        if (standings) {
          apiLogger.debug({ leagueId }, "Returning LIVE standings with position changes");
        }
      }

      // Fall back to static standings if no live data
      if (!standings && seasonId) {
        apiLogger.debug({ seasonId }, "No live standings available, using static");
        standings = await cache.getStandings(seasonId);
      }

      if (!standings) {
        res.status(404).json({ error: "Standings not available" });
        return;
      }

      if (mainMatch?.competition) {
        standings.competitionName = mainMatch.competition.name;
        standings.competitionId = mainMatch.competition.id;
      }

      res.json(standings);
    } catch (err) {
      apiLogger.error({ err, leagueId, seasonId }, "/api/widgets/standings/live error");
      res.status(500).json({ error: "Failed to fetch live standings" });
    }
  });

  // Legacy routes with query params (kept for backwards compatibility)
  app.get("/api/widgets/standings", async (req: Request, res: Response) => {
    const { seasonId } = req.query;

    let effectiveSeasonId = seasonId as string;
    if (!effectiveSeasonId) {
      const state = store.getState();
      effectiveSeasonId = state.data.mainMatch?.competition?.season?.id || "";
    }

    if (!effectiveSeasonId) {
      res.status(400).json({ error: "No seasonId provided and no mainMatch with season selected" });
      return;
    }

    try {
      const cache = getWidgetCache();
      const standings = await cache.getStandings(effectiveSeasonId);

      if (!standings) {
        res.status(404).json({ error: "Standings not found" });
        return;
      }

      const state = store.getState();
      if (state.data.mainMatch?.competition) {
        standings.competitionName = state.data.mainMatch.competition.name;
        standings.competitionId = state.data.mainMatch.competition.id;
      }

      res.json(standings);
    } catch (err) {
      apiLogger.error({ err, seasonId: effectiveSeasonId }, "/api/widgets/standings error");
      res.status(500).json({ error: "Failed to fetch standings" });
    }
  });

  // Legacy livestandings route
  app.get("/api/widgets/livestandings", async (req: Request, res: Response) => {
    const { leagueId, seasonId } = req.query;
    const state = store.getState();
    const mainMatch = state.data.mainMatch;

    let effectiveLeagueId = leagueId as string;
    if (!effectiveLeagueId && mainMatch?.competition?.id) {
      effectiveLeagueId = mainMatch.competition.id;
    }

    let effectiveSeasonId = seasonId as string;
    if (!effectiveSeasonId && mainMatch?.competition?.season?.id) {
      effectiveSeasonId = mainMatch.competition.season.id;
    }

    if (!effectiveLeagueId && !effectiveSeasonId) {
      res.status(400).json({ 
        error: "No leagueId/seasonId provided and no mainMatch with competition selected" 
      });
      return;
    }

    try {
      const cache = getWidgetCache();
      let standings = null;

      if (effectiveLeagueId) {
        // Pass seasonId to calculate position changes compared to regular standings
        standings = await cache.getLiveStandings(effectiveLeagueId, effectiveSeasonId);
        if (standings) {
          apiLogger.debug({ leagueId: effectiveLeagueId }, "Returning LIVE standings with position changes");
        }
      }

      if (!standings && effectiveSeasonId) {
        apiLogger.debug({ seasonId: effectiveSeasonId }, "No live standings, falling back to regular standings");
        standings = await cache.getStandings(effectiveSeasonId);
      }

      if (!standings) {
        res.status(404).json({ error: "Live standings not available" });
        return;
      }

      if (mainMatch?.competition) {
        standings.competitionName = mainMatch.competition.name;
        standings.competitionId = mainMatch.competition.id;
      }

      res.json(standings);
    } catch (err) {
      apiLogger.error({ err, leagueId: effectiveLeagueId, seasonId: effectiveSeasonId }, "/api/widgets/livestandings error");
      res.status(500).json({ error: "Failed to fetch live standings" });
    }
  });

  // Widget: Get H2H stats (from mainMatch teams)
  app.get("/api/widgets/h2h", async (req: Request, res: Response) => {
    let { team1Id, team2Id } = req.query;

    // If no team IDs provided, get from mainMatch
    if (!team1Id || !team2Id) {
      const state = store.getState();
      const mainMatch = state.data.mainMatch;
      if (mainMatch) {
        team1Id = mainMatch.homeTeam.id;
        team2Id = mainMatch.awayTeam.id;
      }
    }

    if (!team1Id || !team2Id) {
      res.status(400).json({ error: "No team IDs provided and no mainMatch selected" });
      return;
    }

    try {
      const cache = getWidgetCache();
      const h2h = await cache.getH2H(team1Id as string, team2Id as string);

      if (!h2h) {
        res.status(404).json({ error: "H2H data not found" });
        return;
      }

      res.json(h2h);
    } catch (err) {
      apiLogger.error({ err, team1Id, team2Id }, "/api/widgets/h2h error");
      res.status(500).json({ error: "Failed to fetch H2H" });
    }
  });

  // Widget: Get team form (for one team)
  app.get("/api/widgets/form", async (req: Request, res: Response) => {
    const { teamId, side } = req.query;

    // If no teamId provided, get from mainMatch based on side
    let effectiveTeamId = teamId as string;
    if (!effectiveTeamId) {
      const state = store.getState();
      const mainMatch = state.data.mainMatch;
      if (mainMatch) {
        effectiveTeamId = side === "away" ? mainMatch.awayTeam.id : mainMatch.homeTeam.id;
      }
    }

    if (!effectiveTeamId) {
      res.status(400).json({ error: "No teamId provided and no mainMatch selected" });
      return;
    }

    try {
      const cache = getWidgetCache();
      const form = await cache.getTeamForm(effectiveTeamId);

      if (!form) {
        res.status(404).json({ error: "Team form not found" });
        return;
      }

      res.json(form);
    } catch (err) {
      apiLogger.error({ err, teamId: effectiveTeamId }, "/api/widgets/form error");
      res.status(500).json({ error: "Failed to fetch team form" });
    }
  });

  // Widget: Get both teams' form (for comparison)
  app.get("/api/widgets/form-compare", async (req: Request, res: Response) => {
    let { homeTeamId, awayTeamId } = req.query;

    // Get from mainMatch if not provided
    if (!homeTeamId || !awayTeamId) {
      const state = store.getState();
      const mainMatch = state.data.mainMatch;
      if (mainMatch) {
        homeTeamId = mainMatch.homeTeam.id;
        awayTeamId = mainMatch.awayTeam.id;
      }
    }

    if (!homeTeamId || !awayTeamId) {
      res.status(400).json({ error: "No team IDs provided and no mainMatch selected" });
      return;
    }

    try {
      const cache = getWidgetCache();
      const [homeForm, awayForm] = await Promise.all([
        cache.getTeamForm(homeTeamId as string),
        cache.getTeamForm(awayTeamId as string),
      ]);

      res.json({ home: homeForm, away: awayForm });
    } catch (err) {
      apiLogger.error({ err, homeTeamId, awayTeamId }, "/api/widgets/form-compare error");
      res.status(500).json({ error: "Failed to fetch team forms" });
    }
  });

  // Widget: Get top scorers for a season
  app.get("/api/widgets/topscorers", async (req: Request, res: Response) => {
    const { seasonId, limit } = req.query;

    // If no seasonId provided, get from mainMatch.competition.season
    let effectiveSeasonId = seasonId as string;
    if (!effectiveSeasonId) {
      const state = store.getState();
      effectiveSeasonId = state.data.mainMatch?.competition?.season?.id || "";
    }

    if (!effectiveSeasonId) {
      res.status(400).json({ error: "No seasonId provided and no mainMatch with season selected" });
      return;
    }

    try {
      const cache = getWidgetCache();
      const topScorers = await cache.getTopScorers(
        effectiveSeasonId,
        parseInt(limit as string) || 10
      );

      if (!topScorers) {
        res.status(404).json({ error: "Top scorers not found" });
        return;
      }

      // Add competition name from mainMatch
      const state = store.getState();
      if (state.data.mainMatch?.competition) {
        topScorers.competitionName = state.data.mainMatch.competition.name;
        topScorers.competitionId = state.data.mainMatch.competition.id;
      }

      res.json(topScorers);
    } catch (err) {
      apiLogger.error({ err, seasonId: effectiveSeasonId }, "/api/widgets/topscorers error");
      res.status(500).json({ error: "Failed to fetch top scorers" });
    }
  });

  // Widget: Get lineups for mainMatch
  app.get("/api/widgets/lineups", async (req: Request, res: Response) => {
    const { fixtureId, refresh } = req.query;
    const forceRefresh = refresh === "true";

    // Get from mainMatch if not provided
    let effectiveFixtureId = fixtureId as string;
    if (!effectiveFixtureId) {
      const state = store.getState();
      effectiveFixtureId = state.data.mainMatch?.id || "";
    }

    if (!effectiveFixtureId) {
      res.status(400).json({ error: "No fixtureId provided and no mainMatch selected" });
      return;
    }

    try {
      // First try to get from AppState (already populated by MainMatchPoller)
      // Skip AppState cache if forceRefresh is requested
      if (!forceRefresh) {
        const state = store.getState();
        if (state.data.lineups) {
          res.json(state.data.lineups);
          return;
        }
      }

      // Fetch fresh from widget cache (or force refresh)
      const cache = getWidgetCache();
      const lineups = await cache.getLineups(effectiveFixtureId, forceRefresh);

      if (!lineups) {
        res.status(404).json({ error: "Lineups not found (match may not have started)" });
        return;
      }

      res.json(lineups);
    } catch (err) {
      apiLogger.error({ err, fixtureId: effectiveFixtureId }, "/api/widgets/lineups error");
      res.status(500).json({ error: "Failed to fetch lineups" });
    }
  });

  // Widget: Get main match context (for overlays to get team/competition info)
  app.get("/api/widgets/context", (_req: Request, res: Response) => {
    const state = store.getState();
    const mainMatch = state.data.mainMatch;

    if (!mainMatch) {
      res.status(404).json({ error: "No mainMatch selected" });
      return;
    }

    res.json({
      matchId: mainMatch.id,
      seasonId: mainMatch.competition?.season?.id,
      competition: mainMatch.competition,
      homeTeam: mainMatch.homeTeam,
      awayTeam: mainMatch.awayTeam,
      status: mainMatch.status,
      minute: mainMatch.clock?.minute,
      score: mainMatch.score,
    });
  });
}
