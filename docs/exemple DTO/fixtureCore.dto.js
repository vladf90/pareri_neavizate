export function mapFixtureCore(f) {
  // SportMonks API returns lineups as flat array of player objects
  // Each player has team_id and type_id (11=starting, 12=substitute)
  // Group by team_id to create lineup objects per team
  const rawLineups = f.lineups ?? [];
  const lineupsByTeam = new Map();
  
  for (const player of rawLineups) {
    const teamId = player.team_id;
    if (!lineupsByTeam.has(teamId)) {
      lineupsByTeam.set(teamId, []);
    }
    lineupsByTeam.get(teamId).push({
      id: player.id,
      playerId: player.player_id,
      teamId: player.team_id,
      positionId: player.position_id,
      formationField: player.formation_field,
      formationPosition: player.formation_position,
      jerseyNumber: player.jersey_number,
      playerName: player.player?.display_name || player.player?.common_name || player.player_name || null,
      player: player.player ?? null,
      typeId: player.type_id, // 11 = starting lineup, 12 = substitute
      type: player.type ?? null,
      position: player.position ?? null
    });
  }

  // Build lineup objects per team
  const lineups = [];
  for (const [teamId, players] of lineupsByTeam) {
    // Try to extract formation from participants meta or use default
    const participant = (f.participants ?? []).find(p => p.id === teamId);
    const formation = participant?.meta?.formation ?? null;
    
    lineups.push({
      teamId,
      formation,
      players
    });
  }

  return {
    id: f.id,
    leagueId: f.league_id,
    seasonId: f.season_id,
    stageId: f.stage_id,
    roundId: f.round_id,
    stateId: f.state_id,
    startingAt: f.starting_at,
    startingAtTimestamp: f.starting_at_timestamp,
    name: f.name,
    resultInfo: f.result_info ?? null,
    round: f.round ? { id: f.round.id, name: f.round.name } : null,
    participants: (f.participants ?? []).map(p => ({
      id: p.id,
      name: p.name,
      shortCode: p.short_code ?? null,
      imagePath: p.image_path ?? null,
      meta: p.meta ?? null
    })),
    scores: f.scores ?? [],
    state: f.state ?? null,
    periods: f.periods ?? [],
    lineups
  };
}
