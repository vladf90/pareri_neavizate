export function mapStandings({ seasonId, stageId = null, leagueId = null, standings = [] }) {
  return { seasonId, stageId, leagueId, standings };
}
