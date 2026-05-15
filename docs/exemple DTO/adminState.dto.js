export function makeDefaultAdminState() {
  return {
    selectedDate: null,
    selectedLeagueId: null,
    mainFixtureId: null,
    tickerFixtureIds: [],
    seasonId: null,         // For standings - extracted from main fixture's league
    leagueId: null,         // For LIVE standings - the league ID
    highlightTeamId: null,  // For standings - highlight a specific team
    // Master overlay toggles - control visibility of widgets
    overlayToggles: {
      showMasterScoreboard: true,
      showMasterTicker: true,
      showMasterNow: false,
      showLogo: true,
    }
  };
}
