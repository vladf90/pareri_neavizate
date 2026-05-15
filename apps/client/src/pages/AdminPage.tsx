import React, { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/store";
import { Panel, Badge } from "@/components/primitives";
import type { ResolumeZone, ResolumeConfig, ResolumeWidgetType, Match } from "@parerineavizate/shared/models";
import { DEFAULT_RESOLUME_CONFIG } from "@parerineavizate/shared/models";

type Section = "matches" | "ticker" | "overlays" | "resolume" | "versus" | "test";

export function AdminPage() {
  const [activeSection, setActiveSection] = useState<Section>("matches");

  const appState = useAppStore((s) => s.appState);
  const connectionStatus = useAppStore((s) => s.connectionStatus);
  const availableMatches = useAppStore((s) => s.availableMatches);
  const isLoadingMatches = useAppStore((s) => s.isLoadingMatches);
  const selectedDate = useAppStore((s) => s.selectedDate);
  const selectedLeagueId = useAppStore((s) => s.selectedLeagueId);
  const availableLeagues = useAppStore((s) => s.availableLeagues);
  const isLoadingLeagues = useAppStore((s) => s.isLoadingLeagues);

  const setMainMatch = useAppStore((s) => s.setMainMatch);
  const setTickerMatches = useAppStore((s) => s.setTickerMatches);
  const setSelectedDate = useAppStore((s) => s.setSelectedDate);
  const setSelectedLeagueId = useAppStore((s) => s.setSelectedLeagueId);
  const fetchLeaguesForDate = useAppStore((s) => s.fetchLeaguesForDate);
  const fetchFixtures = useAppStore((s) => s.fetchFixtures);
  const clearMainMatch = useAppStore((s) => s.clearMainMatch);
  const clearTicker = useAppStore((s) => s.clearTicker);
  const resetSession = useAppStore((s) => s.resetSession);

  const match = appState?.data.mainMatch;
  const selectedMatchId = appState?.selection.mainMatchId;
  const tickerMatches = appState?.data.tickerMatches || [];
  const tickerMatchIds = appState?.selection.tickerMatchIds || [];

  const initialFetchDone = useRef(false);

  useEffect(() => {
    if (connectionStatus === "connected" && selectedDate && !initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchLeaguesForDate(selectedDate);
    }
  }, [connectionStatus, selectedDate]);

  useEffect(() => {
    if (connectionStatus === "connected" && selectedDate && selectedLeagueId) {
      fetchFixtures(selectedDate, selectedLeagueId);
    }
  }, [selectedLeagueId, selectedDate, connectionStatus, fetchFixtures]);

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setSelectedLeagueId(null);
    fetchLeaguesForDate(date);
  };

  const handleLeagueChange = (leagueId: string | null) => {
    setSelectedLeagueId(leagueId);
  };
  const handleAddToTicker = (matchId: string) => {
    if (!tickerMatchIds.includes(matchId)) {
      setTickerMatches([...tickerMatchIds, matchId]);
    }
  };

  const handleRemoveFromTicker = (matchId: string) => {
    setTickerMatches(tickerMatchIds.filter((id) => id !== matchId));
  };

  const menuItems: { id: Section; label: string; icon: string }[] = [
    { id: "matches", label: "Matches", icon: "⚽" },
    { id: "ticker", label: "Ticker", icon: "📊" },
    { id: "overlays", label: "Overlays", icon: "🖥️" },
    { id: "resolume", label: "Resolume", icon: "📺" },
    { id: "versus", label: "Versus", icon: "⚔️" },
    { id: "test", label: "Test Events", icon: "🧪" },
  ];

  return (
    <div className="h-screen flex bg-[var(--color-bg0)]">
      {/* Sidebar */}
      <aside className="w-64 bg-[var(--color-bg1)] border-r border-[var(--color-muted)]/20 flex flex-col">
        {/* Logo/Header */}
        <div className="p-4 border-b border-[var(--color-muted)]/20">
          <h1 className="text-xl font-bold text-[var(--color-text)]">Watchalong</h1>
          <p className="text-xs text-[var(--color-muted)]">Admin Panel</p>
        </div>

        {/* Connection Status */}
        <div className="px-4 py-3 border-b border-[var(--color-muted)]/20">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus === "connected"
                  ? "bg-green-500"
                  : connectionStatus === "reconnecting"
                    ? "bg-yellow-500 animate-pulse"
                    : "bg-red-500"
              }`}
            />
            <span className="text-sm text-[var(--color-muted)]">
              {connectionStatus === "connected"
                ? "Connected"
                : connectionStatus === "reconnecting"
                  ? "Reconnecting..."
                  : "Disconnected"}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-all text-left
                ${
                  activeSection === item.id
                    ? "bg-[var(--color-accent)] text-white"
                    : "text-[var(--color-text)] hover:bg-[var(--color-bg2)]"
                }
              `}
            >
              <span className="text-lg">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
              {item.id === "ticker" && tickerMatches.length > 0 && (
                <span
                  className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                    activeSection === item.id
                      ? "bg-white/20"
                      : "bg-[var(--color-accent)]/20 text-[var(--color-accent)]"
                  }`}
                >
                  {tickerMatches.length}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Current Match Mini */}
        {match && (
          <div className="p-4 border-t border-[var(--color-muted)]/20">
            <p className="text-xs text-[var(--color-muted)] mb-1">Main Match</p>
            <p className="text-sm font-medium text-[var(--color-text)] truncate">
              {match.homeTeam.shortName} vs {match.awayTeam.shortName}
            </p>
            <p className="text-lg font-bold text-[var(--color-accent)]">
              {match.score.home} - {match.score.away}
            </p>
          </div>
        )}

        {/* Session Reset */}
        <div className="p-4 border-t border-[var(--color-muted)]/20">
          <button
            onClick={() => {
              if (confirm("Reset session? This clears main match and ticker.")) {
                resetSession();
              }
            }}
            disabled={!match && tickerMatches.length === 0}
            className="w-full px-4 py-2 bg-[var(--color-danger)]/10 text-[var(--color-danger)] rounded-lg font-medium hover:bg-[var(--color-danger)]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            🔄 Reset Session
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6">
        {activeSection === "matches" && (
          <MatchesSection
            selectedDate={selectedDate}
            selectedLeagueId={selectedLeagueId}
            availableLeagues={availableLeagues}
            availableMatches={availableMatches}
            isLoadingLeagues={isLoadingLeagues}
            isLoadingMatches={isLoadingMatches}
            selectedMatchId={selectedMatchId}
            tickerMatchIds={tickerMatchIds}
            match={match}
            onDateChange={handleDateChange}
            onLeagueChange={handleLeagueChange}
            onSelectMatch={setMainMatch}
            onAddToTicker={handleAddToTicker}
            onRemoveFromTicker={handleRemoveFromTicker}
            onClearMainMatch={clearMainMatch}
          />
        )}

        {activeSection === "ticker" && (
          <TickerSection
            tickerMatches={tickerMatches}
            onRemoveFromTicker={handleRemoveFromTicker}
            onClearTicker={clearTicker}
          />
        )}

        {activeSection === "overlays" && <OverlaysSection />}
        
        {activeSection === "resolume" && <ResolumeSection />}
        
        {activeSection === "versus" && <VersusSection />}
        
        {activeSection === "test" && <TestEventsSection />}
      </main>
    </div>
  );
}

// ============ SECTIONS ============

function MatchesSection({
  selectedDate,
  selectedLeagueId,
  availableLeagues,
  availableMatches,
  isLoadingLeagues,
  isLoadingMatches,
  selectedMatchId,
  tickerMatchIds,
  match,
  onDateChange,
  onLeagueChange,
  onSelectMatch,
  onAddToTicker,
  onRemoveFromTicker,
  onClearMainMatch,
}: {
  selectedDate: string;
  selectedLeagueId: string | null;
  availableLeagues: { id: string; name: string; matchCount?: number }[];
  availableMatches: Match[];
  isLoadingLeagues: boolean;
  isLoadingMatches: boolean;
  selectedMatchId: string | null | undefined;
  tickerMatchIds: string[];
  match: Match | null;
  onDateChange: (date: string) => void;
  onLeagueChange: (leagueId: string | null) => void;
  onSelectMatch: (matchId: string) => void;
  onAddToTicker: (matchId: string) => void;
  onRemoveFromTicker: (matchId: string) => void;
  onClearMainMatch: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[var(--color-text)]">Matches</h2>
      </div>

      {/* Current Match Card */}
      {match && (
        <Panel className="p-4 border-l-4 border-l-[var(--color-accent)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--color-muted)] mb-1">{match.competition.name}</p>
              <p className="text-lg font-bold text-[var(--color-text)]">
                {match.homeTeam.name} vs {match.awayTeam.name}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-2xl font-bold text-[var(--color-accent)]">
                  {match.score.home} - {match.score.away}
                </span>
                <Badge variant={match.status === "LIVE" ? "live" : "default"}>
                  {match.status === "LIVE" ? `${match.clock.display}'` : match.status}
                </Badge>
              </div>
            </div>
            <button
              onClick={() => {
                if (confirm("Clear main match?")) onClearMainMatch();
              }}
              className="px-3 py-1.5 text-sm bg-[var(--color-danger)]/10 text-[var(--color-danger)] rounded-lg hover:bg-[var(--color-danger)]/20"
            >
              Clear
            </button>
          </div>
        </Panel>
      )}

      {/* Filters */}
      <Panel className="p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-[var(--color-muted)] mb-2">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="w-full px-4 py-2.5 bg-[var(--color-bg0)] text-[var(--color-text)] rounded-lg border border-[var(--color-muted)]/30 focus:outline-none focus:border-[var(--color-accent)]"
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--color-muted)] mb-2">
              League {isLoadingLeagues && <span className="text-xs opacity-50">(loading...)</span>}
            </label>
            <select
              value={selectedLeagueId || ""}
              onChange={(e) => onLeagueChange(e.target.value || null)}
              disabled={availableLeagues.length === 0}
              className="w-full px-4 py-2.5 bg-[var(--color-bg0)] text-[var(--color-text)] rounded-lg border border-[var(--color-muted)]/30 focus:outline-none focus:border-[var(--color-accent)] disabled:opacity-50"
            >
              <option value="">Select league...</option>
              {availableLeagues.map((league) => (
                <option key={league.id} value={league.id}>
                  {league.name} {league.matchCount && `(${league.matchCount})`}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Panel>

      {/* Match List */}
      {selectedLeagueId && (
        <Panel className="p-4">
          <h3 className="text-sm font-medium text-[var(--color-muted)] mb-3">
            {isLoadingMatches ? "Loading matches..." : `${availableMatches.length} matches`}
          </h3>
          {availableMatches.length === 0 && !isLoadingMatches ? (
            <p className="text-[var(--color-muted)] text-sm py-8 text-center">
              No matches found for this date/league
            </p>
          ) : (
            <div className="space-y-2">
              {availableMatches.map((m) => {
                const isSelected = selectedMatchId === m.id;
                const isInTicker = tickerMatchIds.includes(m.id);
                return (
                  <div
                    key={m.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                      isSelected
                        ? "bg-[var(--color-accent)]/10 border-[var(--color-accent)]"
                        : "bg-[var(--color-bg0)] border-transparent hover:border-[var(--color-muted)]/30"
                    }`}
                  >
                    <button onClick={() => onSelectMatch(m.id)} className="flex-1 text-left">
                      <div className="flex items-center gap-3">
                        <span className="text-[var(--color-text)] font-medium">
                          {m.homeTeam.name} vs {m.awayTeam.name}
                        </span>
                        {m.status === "LIVE" || m.status === "HT" ? (
                          <Badge variant="live">{m.clock.display}'</Badge>
                        ) : m.status !== "NS" ? (
                          <Badge variant="default">{m.status}</Badge>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm text-[var(--color-muted)]">
                          {new Date(m.startTime).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {m.status !== "NS" && (
                          <span className="text-sm font-bold text-[var(--color-accent)]">
                            {m.score.home} - {m.score.away}
                          </span>
                        )}
                      </div>
                    </button>
                    <button
                      onClick={() => (isInTicker ? onRemoveFromTicker(m.id) : onAddToTicker(m.id))}
                      className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all ${
                        isInTicker
                          ? "bg-[var(--color-success)] text-white"
                          : "bg-[var(--color-bg1)] text-[var(--color-muted)] hover:bg-[var(--color-accent)] hover:text-white"
                      }`}
                    >
                      {isInTicker ? "✓ Ticker" : "+ Ticker"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}

const TickerSection = React.memo(
  function TickerSection({
    tickerMatches,
    onRemoveFromTicker,
    onClearTicker,
  }: {
    tickerMatches: Match[];
    onRemoveFromTicker: (matchId: string) => void;
    onClearTicker: () => void;
  }) {
    return (
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-[var(--color-text)]">
          Ticker ({tickerMatches.length})
        </h2>
        {tickerMatches.length > 0 && (
          <button
            onClick={() => {
              if (confirm("Clear all ticker matches?")) onClearTicker();
            }}
            className="px-4 py-2 bg-[var(--color-danger)] text-white rounded-lg font-medium hover:opacity-90"
          >
            Clear All
          </button>
        )}
      </div>

      {tickerMatches.length === 0 ? (
        <Panel className="p-8 text-center">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-[var(--color-muted)]">No ticker matches selected.</p>
          <p className="text-sm text-[var(--color-muted)] mt-1">
            Go to Matches and click "+ Ticker" to add matches.
          </p>
        </Panel>
      ) : (
        <div className="grid gap-3">
          {tickerMatches
            .filter((m) => m !== null)
            .map((m, index) => (
              <Panel key={m.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-[var(--color-muted)] font-mono">
                      #{index + 1}
                    </span>
                    <div>
                      <p className="text-[var(--color-text)] font-medium">
                        {m.homeTeam.name} vs {m.awayTeam.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {m.status === "LIVE" && <Badge variant="live">{m.clock.display}'</Badge>}
                        {m.status !== "NS" && (
                          <span className="text-lg font-bold text-[var(--color-accent)]">
                            {m.score.home} - {m.score.away}
                          </span>
                        )}
                        {m.status === "NS" && (
                          <span className="text-sm text-[var(--color-muted)]">
                            {new Date(m.startTime).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onRemoveFromTicker(m.id)}
                    className="px-3 py-1.5 text-sm bg-[var(--color-danger)]/10 text-[var(--color-danger)] rounded-lg hover:bg-[var(--color-danger)]/20"
                  >
                    Remove
                  </button>
                </div>
              </Panel>
            ))}
        </div>
      )}
    </div>
  );
  },
  // Custom comparator: only re-render if tickerMatches content has changed
  (prevProps, nextProps) => {
    if (prevProps.tickerMatches.length !== nextProps.tickerMatches.length) {
      return false;
    }
    // Compare by IDs and scores (the most likely things to change)
    for (let i = 0; i < prevProps.tickerMatches.length; i++) {
      const prev = prevProps.tickerMatches[i];
      const next = nextProps.tickerMatches[i];
      if (
        prev.id !== next.id ||
        prev.score.home !== next.score.home ||
        prev.score.away !== next.score.away ||
        prev.status !== next.status ||
        prev.clock?.display !== next.clock?.display
      ) {
        return false;
      }
    }
    return true;
  }
);

function MasterOverlayControls() {
  const appState = useAppStore((s) => s.appState);
  const setOverlayToggles = useAppStore((s) => s.setOverlayToggles);
  
  const toggles = appState?.selection?.toggles || {};
  
  // Match GFX_REGISTRY keys
  const showScoreboard = toggles.showMasterScoreboard !== false; // Default true
  const showLineupsHome = toggles.showMasterLineupsHome === true; // Default false
  const showLineupsAway = toggles.showMasterLineupsAway === true; // Default false
  const showTicker = toggles.showMasterTicker !== false; // Default true
  const showSocials = toggles.showMasterSocials !== false; // Default true
  const showBranding = toggles.showMasterBranding !== false; // Default true
  const showLiveStandings = toggles.showMasterLiveStandings === true; // Default false
  const showStats = toggles.showMasterStats === true; // Default false

  const handleToggle = (key: string, value: boolean) => {
    setOverlayToggles({ [key]: value });
  };

  return (
    <Panel className="p-4 border-l-4 border-l-[#F659FD]">
      <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4 flex items-center gap-2">
        <span className="text-2xl">🎬</span>
        Master Overlay Controls
      </h3>
      <p className="text-sm text-[var(--color-muted)] mb-4">
        Control which components are visible in the Master Overlay. Changes apply in real-time.
      </p>
      
      <div className="grid grid-cols-8 gap-3 mb-6">
        {/* Scoreboard Toggle */}
        <button
          onClick={() => handleToggle('showMasterScoreboard', !showScoreboard)}
          className={`
            p-3 rounded-xl font-semibold transition-all duration-300 flex flex-col items-center gap-2
            ${showScoreboard 
              ? 'bg-gradient-to-br from-[#F659FD] to-[#A855F7] text-white shadow-lg shadow-[#F659FD]/30' 
              : 'bg-[var(--color-bg0)] text-[var(--color-muted)] hover:bg-[var(--color-bg0)]/80'
            }
          `}
        >
          <span className="text-2xl">📊</span>
          <span className="text-xs">Scoreboard</span>
          <span className="text-[10px] opacity-70">{showScoreboard ? 'LIVE' : 'OFF'}</span>
        </button>

        {/* Home Lineups Toggle */}
        <button
          onClick={() => handleToggle('showMasterLineupsHome', !showLineupsHome)}
          className={`
            p-3 rounded-xl font-semibold transition-all duration-300 flex flex-col items-center gap-2
            ${showLineupsHome 
              ? 'bg-gradient-to-br from-[#F659FD] to-[#A855F7] text-white shadow-lg shadow-[#F659FD]/30' 
              : 'bg-[var(--color-bg0)] text-[var(--color-muted)] hover:bg-[var(--color-bg0)]/80'
            }
          `}
        >
          <span className="text-2xl">🏠</span>
          <span className="text-xs">Lineups H</span>
          <span className="text-[10px] opacity-70">{showLineupsHome ? 'LIVE' : 'OFF'}</span>
        </button>

        {/* Away Lineups Toggle */}
        <button
          onClick={() => handleToggle('showMasterLineupsAway', !showLineupsAway)}
          className={`
            p-3 rounded-xl font-semibold transition-all duration-300 flex flex-col items-center gap-2
            ${showLineupsAway 
              ? 'bg-gradient-to-br from-[#F659FD] to-[#A855F7] text-white shadow-lg shadow-[#F659FD]/30' 
              : 'bg-[var(--color-bg0)] text-[var(--color-muted)] hover:bg-[var(--color-bg0)]/80'
            }
          `}
        >
          <span className="text-2xl">✈️</span>
          <span className="text-xs">Lineups A</span>
          <span className="text-[10px] opacity-70">{showLineupsAway ? 'LIVE' : 'OFF'}</span>
        </button>

        {/* Live Ticker Toggle */}
        <button
          onClick={() => handleToggle('showMasterTicker', !showTicker)}
          className={`
            p-3 rounded-xl font-semibold transition-all duration-300 flex flex-col items-center gap-2
            ${showTicker 
              ? 'bg-gradient-to-br from-[#33EFFF] to-[#0549AC] text-white shadow-lg shadow-[#33EFFF]/30' 
              : 'bg-[var(--color-bg0)] text-[var(--color-muted)] hover:bg-[var(--color-bg0)]/80'
            }
          `}
        >
          <span className="text-2xl">📺</span>
          <span className="text-xs">Ticker</span>
          <span className="text-[10px] opacity-70">{showTicker ? 'LIVE' : 'OFF'}</span>
        </button>

        {/* Socials Toggle */}
        <button
          onClick={() => handleToggle('showMasterSocials', !showSocials)}
          className={`
            p-3 rounded-xl font-semibold transition-all duration-300 flex flex-col items-center gap-2
            ${showSocials 
              ? 'bg-gradient-to-br from-[#E1306C] to-[#F77737] text-white shadow-lg shadow-[#E1306C]/30' 
              : 'bg-[var(--color-bg0)] text-[var(--color-muted)] hover:bg-[var(--color-bg0)]/80'
            }
          `}
        >
          <span className="text-2xl">📷</span>
          <span className="text-xs">Socials</span>
          <span className="text-[10px] opacity-70">{showSocials ? 'LIVE' : 'OFF'}</span>
        </button>

        {/* Branding Toggle */}
        <button
          onClick={() => handleToggle('showMasterBranding', !showBranding)}
          className={`
            p-3 rounded-xl font-semibold transition-all duration-300 flex flex-col items-center gap-2
            ${showBranding 
              ? 'bg-gradient-to-br from-[#FFD700] to-[#FFA500] text-white shadow-lg shadow-[#FFD700]/30' 
              : 'bg-[var(--color-bg0)] text-[var(--color-muted)] hover:bg-[var(--color-bg0)]/80'
            }
          `}
        >
          <span className="text-2xl">🎯</span>
          <span className="text-xs">Branding</span>
          <span className="text-[10px] opacity-70">{showBranding ? 'LIVE' : 'OFF'}</span>
        </button>

        {/* Live Standings Toggle */}
        <button
          onClick={() => handleToggle('showMasterLiveStandings', !showLiveStandings)}
          className={`
            p-3 rounded-xl font-semibold transition-all duration-300 flex flex-col items-center gap-2
            ${showLiveStandings 
              ? 'bg-gradient-to-br from-[#00FF9D] to-[#00C853] text-white shadow-lg shadow-[#00FF9D]/30' 
              : 'bg-[var(--color-bg0)] text-[var(--color-muted)] hover:bg-[var(--color-bg0)]/80'
            }
          `}
        >
          <span className="text-2xl">🏆</span>
          <span className="text-xs">Standings</span>
          <span className="text-[10px] opacity-70">{showLiveStandings ? 'LIVE' : 'OFF'}</span>
        </button>

        {/* Match Stats Toggle */}
        <button
          onClick={() => handleToggle('showMasterStats', !showStats)}
          className={`
            p-3 rounded-xl font-semibold transition-all duration-300 flex flex-col items-center gap-2
            ${showStats 
              ? 'bg-gradient-to-br from-[#FF6B6B] to-[#EE5A24] text-white shadow-lg shadow-[#FF6B6B]/30' 
              : 'bg-[var(--color-bg0)] text-[var(--color-muted)] hover:bg-[var(--color-bg0)]/80'
            }
          `}
        >
          <span className="text-2xl">📈</span>
          <span className="text-xs">Stats</span>
          <span className="text-[10px] opacity-70">{showStats ? 'LIVE' : 'OFF'}</span>
        </button>
      </div>
    </Panel>
  );
}

function OverlaysSection() {
  const baseUrl = window.location.origin;

  const overlays = [
    // 16:9 Overlays - Master first
    {
      category: "🎬 Master (Use in OBS)",
      name: "Master Overlay",
      url: `${baseUrl}/overlay/master`,
      description: "All-in-one overlay with Scoreboard + Lineups + Ticker + Socials. Control via toggles below.",
    },
    // 16:9 Individual Overlays
    {
      category: "16:9 Horizontal",
      name: "Starting Soon",
      url: `${baseUrl}/overlay/startingsoon`,
      description: "Pre-match countdown with venue, weather, and other matches ticker",
    },
    // 9:16 Overlays
    {
      category: "9:16 Vertical",
      name: "Live Standings",
      url: `${baseUrl}/overlay/livestandings`,
      description: "Real-time league standings for vertical displays (UCL format)",
    },
    {
      category: "9:16 Vertical",
      name: "Live Standings UCL (1-16)",
      url: `${baseUrl}/overlay/livestandings-ucl1`,
      description: "UCL standings positions 1-16 (top half of 32 teams)",
    },
    {
      category: "9:16 Vertical",
      name: "Live Standings UCL (17-32)",
      url: `${baseUrl}/overlay/livestandings-ucl2`,
      description: "UCL standings positions 17-32 (bottom half of 32 teams)",
    },
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const categories = [...new Set(overlays.map((o) => o.category))];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-[var(--color-text)]">Overlay URLs</h2>
      <p className="text-[var(--color-muted)]">Use these URLs as Browser Sources in OBS Studio.</p>

      {categories.map((category) => (
        <div key={category} className="space-y-3">
          <h3 className="text-lg font-semibold text-[var(--color-accent)] border-b border-[var(--color-bg1)] pb-2">
            {category}
          </h3>
          <div className="grid gap-3">
            {overlays
              .filter((o) => o.category === category)
              .map((overlay) => (
                <Panel key={overlay.url} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-[var(--color-text)]">
                        {overlay.name}
                      </h3>
                      <p className="text-sm text-[var(--color-muted)] mb-2">
                        {overlay.description}
                      </p>
                      <a
                        href={overlay.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-mono text-[var(--color-accent)] hover:underline break-all"
                      >
                        {overlay.url}
                      </a>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <a
                        href={overlay.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 bg-[var(--color-bg0)] text-[var(--color-text)] rounded-lg hover:bg-[var(--color-accent)] hover:text-white transition-all"
                        title="Open in new tab"
                      >
                        🔗
                      </a>
                      <button
                        onClick={() => copyToClipboard(overlay.url)}
                        className="px-3 py-2 bg-[var(--color-bg0)] text-[var(--color-text)] rounded-lg hover:bg-[var(--color-accent)] hover:text-white transition-all"
                        title="Copy URL"
                      >
                        📋
                      </button>
                    </div>
                  </div>
                </Panel>
              ))}
              
              {/* Master Overlay Controls - shown right after Master category */}
              {category === "🎬 Master (Use in OBS)" && <MasterOverlayControls />}
          </div>
        </div>
      ))}

      {/* OBS Instructions */}
      <Panel className="p-4 border-l-4 border-l-[var(--color-accent)]">
        <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">How to use in OBS</h3>
        <ol className="text-sm text-[var(--color-muted)] space-y-2 list-decimal list-inside">
          <li>
            In OBS, click <strong>+</strong> under Sources
          </li>
          <li>
            Select <strong>Browser</strong>
          </li>
          <li>Paste the overlay URL</li>
          <li>
            Set dimensions: <strong>1920x1080</strong> for 16:9 or <strong>1080x1920</strong> for
            9:16
          </li>
          <li>
            Check <strong>"Shutdown source when not visible"</strong>
          </li>
        </ol>
      </Panel>
    </div>
  );
}

// ============ RESOLUME SECTION ============

function ResolumeSection() {
  const appState = useAppStore((s) => s.appState);
  const updateResolumeZone = useAppStore((s) => s.updateResolumeZone);
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const config: ResolumeConfig = (appState as any)?.resolume || DEFAULT_RESOLUME_CONFIG;
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  
  const selectedZone = config.zones.find(z => z.id === selectedZoneId);
  const baseUrl = window.location.origin;
  
  const widgetTypes: { value: ResolumeWidgetType; label: string }[] = [
    { value: "none", label: "Empty" },
    { value: "livestandings", label: "Live Standings" },
    { value: "livestandings-ucl1", label: "Live Standings UCL (1-16)" },
    { value: "livestandings-ucl2", label: "Live Standings UCL (17-32)" },
    { value: "versus", label: "Versus (H2H Comparison)" },
    { value: "scoreboard", label: "Scoreboard (coming soon)" },
    { value: "ticker", label: "Ticker (coming soon)" },
  ];
  
  const handleZoneUpdate = (updates: Partial<ResolumeZone>) => {
    if (!selectedZoneId) return;
    updateResolumeZone(selectedZoneId, updates);
  };
  
  // Preview scale (fit 5400x1800 into ~600px wide preview)
  const previewScale = 600 / config.canvasWidth;
  const previewWidth = config.canvasWidth * previewScale;
  const previewHeight = config.canvasHeight * previewScale;
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[var(--color-text)]">Resolume Multi-Display</h2>
          <p className="text-sm text-[var(--color-muted)]">
            Configure widgets for {config.canvasWidth}x{config.canvasHeight} canvas
          </p>
        </div>
        <a
          href={`${baseUrl}/overlay/resolume`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 bg-[var(--color-accent)] text-white rounded-lg hover:opacity-90 transition-all flex items-center gap-2"
        >
          🔗 Open Overlay
        </a>
      </div>
      
      {/* Preview Canvas */}
      <Panel className="p-4">
        <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Canvas Preview</h3>
        <div 
          className="relative mx-auto bg-black/50 border-2 border-[var(--color-muted)]/30 rounded-lg overflow-hidden"
          style={{ width: previewWidth, height: previewHeight }}
        >
          {/* Render span overlays first */}
          {config.zones
            .filter(zone => zone.spanZones && zone.spanZones.length > 0)
            .map((zone) => {
              // Calculate bounding box for spanned zones
              const spannedZones = [zone, ...config.zones.filter(z => zone.spanZones?.includes(z.id))];
              const minX = Math.min(...spannedZones.map(z => z.x));
              const minY = Math.min(...spannedZones.map(z => z.y));
              const maxX = Math.max(...spannedZones.map(z => z.x + z.width));
              const maxY = Math.max(...spannedZones.map(z => z.y + z.height));
              
              return (
                <div
                  key={`span-${zone.id}`}
                  className="absolute border-2 border-dashed border-[#FF33EF]/60 bg-[#FF33EF]/10 rounded pointer-events-none z-5"
                  style={{
                    left: minX * previewScale,
                    top: minY * previewScale,
                    width: (maxX - minX) * previewScale,
                    height: (maxY - minY) * previewScale,
                  }}
                >
                  <div className="absolute top-1 left-1 text-[8px] text-[#FF33EF] font-medium">
                    SPAN: {zone.name} + {zone.spanZones?.join(", ")}
                  </div>
                </div>
              );
            })}
          
          {/* Render individual zones */}
          {config.zones.map((zone) => {
            // Check if this zone is consumed by another zone's span
            const isConsumed = config.zones.some(z => 
              z.id !== zone.id && z.spanZones?.includes(zone.id)
            );
            
            return (
              <div
                key={zone.id}
                onClick={() => setSelectedZoneId(zone.id)}
                className={`absolute cursor-pointer transition-all ${
                  selectedZoneId === zone.id 
                    ? "ring-2 ring-[var(--color-accent)] z-10" 
                    : "hover:ring-1 hover:ring-white/30"
                } ${zone.visible ? "opacity-100" : "opacity-30"} ${isConsumed ? "opacity-40" : ""}`}
                style={{
                  left: zone.x * previewScale,
                  top: zone.y * previewScale,
                  width: zone.width * previewScale,
                  height: zone.height * previewScale,
                }}
              >
                <div className={`w-full h-full rounded border-2 flex items-center justify-center text-xs font-medium ${
                  zone.widgetType === "none" 
                    ? "border-dashed border-white/30 bg-black/30 text-white/50"
                    : "border-solid border-[#33EFFF]/50 bg-[#33EFFF]/10 text-[#33EFFF]"
                } ${isConsumed ? "border-[#FF33EF]/50" : ""}`}>
                  <div className="text-center">
                    <div className="font-bold">{zone.name}</div>
                    <div className="text-[10px] opacity-70">
                      {isConsumed ? "(spanned)" : zone.widgetType}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-center text-[var(--color-muted)] mt-2">
          Click a zone to edit • Scale: {(previewScale * 100).toFixed(1)}%
        </p>
      </Panel>
      
      {/* Zone Editor */}
      {selectedZone && (
        <Panel className="p-4 border-l-4 border-l-[#33EFFF]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[var(--color-text)]">
              Editing: {selectedZone.name}
            </h3>
            <button
              onClick={() => setSelectedZoneId(null)}
              className="text-[var(--color-muted)] hover:text-white"
            >
              ✕
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Widget Type */}
            <div className="col-span-2">
              <label className="block text-sm text-[var(--color-muted)] mb-2">Widget Type</label>
              <select
                value={selectedZone.widgetType}
                onChange={(e) => handleZoneUpdate({ widgetType: e.target.value as ResolumeWidgetType })}
                className="w-full px-4 py-2 bg-[var(--color-bg0)] text-[var(--color-text)] rounded-lg border border-[var(--color-muted)]/30"
              >
                {widgetTypes.map((wt) => (
                  <option key={wt.value} value={wt.value}>{wt.label}</option>
                ))}
              </select>
            </div>
            
            {/* Position X */}
            <div>
              <label className="block text-sm text-[var(--color-muted)] mb-2">Position X</label>
              <input
                type="number"
                value={selectedZone.x}
                onChange={(e) => handleZoneUpdate({ x: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 bg-[var(--color-bg0)] text-[var(--color-text)] rounded-lg border border-[var(--color-muted)]/30"
              />
            </div>
            
            {/* Position Y */}
            <div>
              <label className="block text-sm text-[var(--color-muted)] mb-2">Position Y</label>
              <input
                type="number"
                value={selectedZone.y}
                onChange={(e) => handleZoneUpdate({ y: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-2 bg-[var(--color-bg0)] text-[var(--color-text)] rounded-lg border border-[var(--color-muted)]/30"
              />
            </div>
            
            {/* Width */}
            <div>
              <label className="block text-sm text-[var(--color-muted)] mb-2">Width</label>
              <input
                type="number"
                value={selectedZone.width}
                onChange={(e) => handleZoneUpdate({ width: parseInt(e.target.value) || 100 })}
                className="w-full px-4 py-2 bg-[var(--color-bg0)] text-[var(--color-text)] rounded-lg border border-[var(--color-muted)]/30"
              />
            </div>
            
            {/* Height */}
            <div>
              <label className="block text-sm text-[var(--color-muted)] mb-2">Height</label>
              <input
                type="number"
                value={selectedZone.height}
                onChange={(e) => handleZoneUpdate({ height: parseInt(e.target.value) || 100 })}
                className="w-full px-4 py-2 bg-[var(--color-bg0)] text-[var(--color-text)] rounded-lg border border-[var(--color-muted)]/30"
              />
            </div>
            
            {/* Scale */}
            <div>
              <label className="block text-sm text-[var(--color-muted)] mb-2">Zone Scale ({(selectedZone.scale * 100).toFixed(0)}%)</label>
              <input
                type="range"
                min="0.1"
                max="2"
                step="0.05"
                value={selectedZone.scale}
                onChange={(e) => handleZoneUpdate({ scale: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
            
            {/* Widget Size Section - vizibil mereu */}
            <div className="col-span-2 border-t border-[var(--color-muted)]/20 pt-4 mt-2">
              <h4 className="text-sm font-semibold text-[#33EFFF] mb-3">Widget Size</h4>
            </div>
            <div>
              <label className="block text-sm text-[var(--color-muted)] mb-2">Widget Width (px)</label>
              <input
                type="number"
                value={selectedZone.config?.widgetWidth ?? selectedZone.width}
                onChange={(e) => handleZoneUpdate({ config: { ...selectedZone.config, widgetWidth: parseInt(e.target.value) || 100 } })}
                className="w-full px-4 py-2 bg-[var(--color-bg0)] text-[var(--color-text)] rounded-lg border border-[var(--color-muted)]/30"
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--color-muted)] mb-2">Widget Height (px)</label>
              <input
                type="number"
                value={selectedZone.config?.widgetHeight ?? selectedZone.height}
                onChange={(e) => handleZoneUpdate({ config: { ...selectedZone.config, widgetHeight: parseInt(e.target.value) || 100 } })}
                className="w-full px-4 py-2 bg-[var(--color-bg0)] text-[var(--color-text)] rounded-lg border border-[var(--color-muted)]/30"
              />
            </div>

            {/* Widget Transform Section - only show when widget type is not "none" */}
            {selectedZone.widgetType !== "none" && (
              <>
                {/* Widget Scale */}
                <div className="col-span-2 border-t border-[var(--color-muted)]/20 pt-4 mt-2">
                  <h4 className="text-sm font-semibold text-[#33EFFF] mb-3">Widget Transform</h4>
                </div>
                
                <div>
                  <label className="block text-sm text-[var(--color-muted)] mb-2">
                    Widget Scale ({((selectedZone.widgetScale ?? 1) * 100).toFixed(0)}%)
                  </label>
                  <input
                    type="range"
                    min="0.3"
                    max="1.5"
                    step="0.05"
                    value={selectedZone.widgetScale ?? 1}
                    onChange={(e) => handleZoneUpdate({ widgetScale: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>
                
                {/* Widget Alignment */}
                <div>
                  <label className="block text-sm text-[var(--color-muted)] mb-2">Alignment</label>
                  <select
                    value={selectedZone.widgetAlignment ?? "center"}
                    onChange={(e) => handleZoneUpdate({ widgetAlignment: e.target.value as any })}
                    className="w-full px-3 py-2 bg-[var(--color-bg0)] text-[var(--color-text)] rounded-lg border border-[var(--color-muted)]/30 text-sm"
                  >
                    <option value="center">Center</option>
                    <option value="top-left">Top Left</option>
                    <option value="top-center">Top Center</option>
                    <option value="top-right">Top Right</option>
                    <option value="bottom-left">Bottom Left</option>
                    <option value="bottom-center">Bottom Center</option>
                    <option value="bottom-right">Bottom Right</option>
                  </select>
                </div>
                
                {/* Widget Offset X */}
                <div>
                  <label className="block text-sm text-[var(--color-muted)] mb-2">
                    Offset X ({selectedZone.widgetOffsetX ?? 0}px)
                  </label>
                  <input
                    type="range"
                    min="-500"
                    max="500"
                    step="10"
                    value={selectedZone.widgetOffsetX ?? 0}
                    onChange={(e) => handleZoneUpdate({ widgetOffsetX: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>
                
                {/* Widget Offset Y */}
                <div>
                  <label className="block text-sm text-[var(--color-muted)] mb-2">
                    Offset Y ({selectedZone.widgetOffsetY ?? 0}px)
                  </label>
                  <input
                    type="range"
                    min="-500"
                    max="500"
                    step="10"
                    value={selectedZone.widgetOffsetY ?? 0}
                    onChange={(e) => handleZoneUpdate({ widgetOffsetY: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>
                
                {/* Reset Widget Transform Button */}
                <div className="col-span-2">
                  <button
                    onClick={() => handleZoneUpdate({ 
                      widgetScale: 1, 
                      widgetOffsetX: 0, 
                      widgetOffsetY: 0, 
                      widgetAlignment: "center" 
                    })}
                    className="px-4 py-2 bg-[var(--color-muted)]/20 text-[var(--color-muted)] rounded-lg hover:bg-[var(--color-muted)]/30 text-sm"
                  >
                    Reset Widget Transform
                  </button>
                </div>
              </>
            )}
            
            {/* Span Zones - only show when widget type is not "none" */}
            {selectedZone.widgetType !== "none" && (
              <div className="col-span-2">
                <label className="block text-sm text-[var(--color-muted)] mb-2">
                  Span Across Zones
                  <span className="text-xs text-[var(--color-muted)]/70 ml-2">
                    (Widget will cover selected zones)
                  </span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {config.zones
                    .filter(z => z.id !== selectedZoneId)
                    .map((zone) => {
                      const isSpanned = selectedZone.spanZones?.includes(zone.id) || false;
                      return (
                        <button
                          key={zone.id}
                          onClick={() => {
                            const currentSpan = selectedZone.spanZones || [];
                            const newSpan = isSpanned
                              ? currentSpan.filter(id => id !== zone.id)
                              : [...currentSpan, zone.id];
                            
                            // Send null (not undefined) when clearing spanZones - undefined doesn't serialize in JSON
                            handleZoneUpdate({ spanZones: newSpan.length > 0 ? newSpan : null as any });
                          }}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            isSpanned
                              ? "bg-[#33EFFF]/20 text-[#33EFFF] border border-[#33EFFF]"
                              : "bg-[var(--color-bg0)] text-[var(--color-muted)] border border-[var(--color-muted)]/30 hover:border-[var(--color-muted)]"
                          }`}
                        >
                          {isSpanned ? "✓ " : ""}{zone.name}
                        </button>
                      );
                    })}
                </div>
                {selectedZone.spanZones && selectedZone.spanZones.length > 0 && (
                  <p className="text-xs text-[#33EFFF] mt-2">
                    Widget spans: {selectedZone.name} + {selectedZone.spanZones.map(id => 
                      config.zones.find(z => z.id === id)?.name || id
                    ).join(" + ")}
                  </p>
                )}
              </div>
            )}
            
            {/* Visible Toggle */}
            <div className="flex items-center gap-3">
              <label className="text-sm text-[var(--color-muted)]">Visible</label>
              <button
                onClick={() => handleZoneUpdate({ visible: !selectedZone.visible })}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedZone.visible
                    ? "bg-green-500/20 text-green-400"
                    : "bg-red-500/20 text-red-400"
                }`}
              >
                {selectedZone.visible ? "ON" : "OFF"}
              </button>
            </div>
          </div>
        </Panel>
      )}
      
      {/* All Zones List */}
      <Panel className="p-4">
        <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">All Zones</h3>
        <div className="space-y-2">
          {config.zones.map((zone) => (
            <div 
              key={zone.id}
              onClick={() => setSelectedZoneId(zone.id)}
              className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                selectedZoneId === zone.id
                  ? "bg-[var(--color-accent)]/20 border border-[var(--color-accent)]"
                  : "bg-[var(--color-bg0)] hover:bg-[var(--color-bg0)]/80"
              }`}
            >
              <div>
                <span className="font-medium text-[var(--color-text)]">{zone.name}</span>
                <span className="ml-2 text-sm text-[var(--color-muted)]">
                  ({zone.width}x{zone.height} @ {zone.x},{zone.y})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  zone.widgetType === "none" 
                    ? "bg-gray-500/20 text-gray-400"
                    : "bg-[#33EFFF]/20 text-[#33EFFF]"
                }`}>
                  {zone.widgetType}
                </span>
                <span className={`w-2 h-2 rounded-full ${
                  zone.visible ? "bg-green-500" : "bg-red-500"
                }`} />
              </div>
            </div>
          ))}
        </div>
      </Panel>
      
      {/* Resolume Instructions */}
      <Panel className="p-4 border-l-4 border-l-[#F659FD]">
        <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">How to use in Resolume</h3>
        <ol className="text-sm text-[var(--color-muted)] space-y-2 list-decimal list-inside">
          <li>Open Resolume Arena/Avenue</li>
          <li>Add a new <strong>Web Browser</strong> source</li>
          <li>Set URL: <code className="bg-black/30 px-2 py-1 rounded">{baseUrl}/overlay/resolume</code></li>
          <li>Set resolution: <strong>{config.canvasWidth}x{config.canvasHeight}</strong></li>
          <li>Map the output to your TV wall configuration</li>
        </ol>
      </Panel>
    </div>
  );
}

// ==================== VERSUS SECTION ====================

function VersusSection() {
  const appState = useAppStore((s) => s.appState);
  const mainMatch = appState?.data?.mainMatch;
  const homeSquad = useAppStore((s) => s.homeSquad);
  const awaySquad = useAppStore((s) => s.awaySquad);
  const isLoadingHomeSquad = useAppStore((s) => s.isLoadingHomeSquad);
  const isLoadingAwaySquad = useAppStore((s) => s.isLoadingAwaySquad);
  const versusData = useAppStore((s) => s.versusData);
  const isLoadingPlayer1 = useAppStore((s) => s.isLoadingVersusPlayer1);
  const isLoadingPlayer2 = useAppStore((s) => s.isLoadingVersusPlayer2);
  
  const fetchSquad = useAppStore((s) => s.fetchSquad);
  const showVersusAction = useAppStore((s) => s.showVersus);
  const hideVersusAction = useAppStore((s) => s.hideVersus);
  
  const [selectedPlayer1Id, setSelectedPlayer1Id] = useState<number | null>(null);
  const [selectedPlayer2Id, setSelectedPlayer2Id] = useState<number | null>(null);
  
  const hasMainMatch = !!mainMatch;
  const seasonId = mainMatch?.competition?.season?.id;
  const leagueId = mainMatch?.competition?.id;
  
  // Fetch squads when main match changes
  useEffect(() => {
    if (mainMatch?.homeTeam?.id) {
      fetchSquad(mainMatch.homeTeam.id, "home");
    }
    if (mainMatch?.awayTeam?.id) {
      fetchSquad(mainMatch.awayTeam.id, "away");
    }
  }, [mainMatch?.homeTeam?.id, mainMatch?.awayTeam?.id, fetchSquad]);
  
  const handleShowVersus = async () => {
    if (selectedPlayer1Id && selectedPlayer2Id) {
      await showVersusAction(selectedPlayer1Id, selectedPlayer2Id, seasonId, leagueId);
    }
  };
  
  const handleHideVersus = () => {
    hideVersusAction();
  };
  
  const isLoading = isLoadingPlayer1 || isLoadingPlayer2;
  const canShow = selectedPlayer1Id && selectedPlayer2Id && !isLoading;
  
  return (
    <div className="space-y-4">
      <Panel>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-[var(--color-text)]">⚔️ Versus Comparison</h2>
            <p className="text-sm text-[var(--color-muted)] mt-1">
              Select two players to compare head-to-head
            </p>
          </div>
          <Badge variant={hasMainMatch ? "success" : "danger"}>
            {hasMainMatch ? "Match Selected" : "No Match"}
          </Badge>
        </div>
        
        {!hasMainMatch && (
          <div className="p-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-center">
            <p className="text-yellow-400 font-medium">⚠️ Please select a main match first</p>
            <p className="text-yellow-400/60 text-sm mt-1">Go to Matches section to select a match</p>
          </div>
        )}
        
        {hasMainMatch && (
          <div className="space-y-6">
            {/* Match Info */}
            <div className="p-4 bg-[var(--color-bg1)] rounded-lg border border-[var(--color-muted)]/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {mainMatch.homeTeam?.crestUrl && (
                    <img src={mainMatch.homeTeam.crestUrl} className="w-8 h-8 object-contain" alt="Home" />
                  )}
                  <span className="font-bold text-[var(--color-text)]">{mainMatch.homeTeam?.name}</span>
                </div>
                <span className="text-[var(--color-muted)] font-mono">VS</span>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-[var(--color-text)]">{mainMatch.awayTeam?.name}</span>
                  {mainMatch.awayTeam?.crestUrl && (
                    <img src={mainMatch.awayTeam.crestUrl} className="w-8 h-8 object-contain" alt="Away" />
                  )}
                </div>
              </div>
            </div>
            
            {/* Player Selection */}
            <div className="grid grid-cols-2 gap-6">
              {/* Player 1 - Home Team */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {mainMatch.homeTeam?.crestUrl && (
                    <img src={mainMatch.homeTeam.crestUrl} className="w-5 h-5 object-contain" alt="Home" />
                  )}
                  <h3 className="font-bold text-[var(--color-text)]">Player 1 (Home)</h3>
                </div>
                <select
                  value={selectedPlayer1Id?.toString() || ""}
                  onChange={(e) => setSelectedPlayer1Id(e.target.value ? parseInt(e.target.value) : null)}
                  disabled={isLoadingHomeSquad}
                  className="w-full px-4 py-3 bg-[var(--color-bg1)] border border-[var(--color-muted)]/30 rounded-lg text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] disabled:opacity-50"
                >
                  <option value="">
                    {isLoadingHomeSquad ? "Loading squad..." : "Select player..."}
                  </option>
                  {homeSquad?.map((player) => (
                    <option key={player.id} value={player.id}>
                      #{player.number || '?'} {player.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Player 2 - Away Team */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {mainMatch.awayTeam?.crestUrl && (
                    <img src={mainMatch.awayTeam.crestUrl} className="w-5 h-5 object-contain" alt="Away" />
                  )}
                  <h3 className="font-bold text-[var(--color-text)]">Player 2 (Away)</h3>
                </div>
                <select
                  value={selectedPlayer2Id?.toString() || ""}
                  onChange={(e) => setSelectedPlayer2Id(e.target.value ? parseInt(e.target.value) : null)}
                  disabled={isLoadingAwaySquad}
                  className="w-full px-4 py-3 bg-[var(--color-bg1)] border border-[var(--color-muted)]/30 rounded-lg text-[var(--color-text)] focus:outline-none focus:border-[var(--color-accent)] disabled:opacity-50"
                >
                  <option value="">
                    {isLoadingAwaySquad ? "Loading squad..." : "Select player..."}
                  </option>
                  {awaySquad?.map((player) => (
                    <option key={player.id} value={player.id}>
                      #{player.number || '?'} {player.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleShowVersus}
                disabled={!canShow}
                className="flex-1 px-6 py-3 bg-[var(--color-accent)] text-white rounded-lg font-bold hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "⏳ Loading..." : "⚔️ Show Versus Overlay"}
              </button>
              
              {versusData.visible && (
                <button
                  onClick={handleHideVersus}
                  className="px-6 py-3 bg-red-500/20 text-red-400 border border-red-500/50 rounded-lg font-bold hover:bg-red-500/30 transition-all"
                >
                  ✕ Hide
                </button>
              )}
            </div>
            
            {/* Preview */}
            {versusData.visible && versusData.player1 && versusData.player2 && (
              <div className="p-4 bg-[var(--color-bg1)] rounded-lg border border-[var(--color-accent)]/30">
                <h4 className="text-sm font-bold text-[var(--color-accent)] mb-3">Currently Showing:</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-bold text-[var(--color-text)]">{versusData.player1.name}</p>
                    <p className="text-[var(--color-muted)]">{versusData.player1.position}</p>
                    <p className="text-[var(--color-accent)] mt-1">
                      ⚽ {versusData.player1.statistics.goals} goals · 
                      🎯 {versusData.player1.statistics.assists} assists
                    </p>
                  </div>
                  <div>
                    <p className="font-bold text-[var(--color-text)]">{versusData.player2.name}</p>
                    <p className="text-[var(--color-muted)]">{versusData.player2.position}</p>
                    <p className="text-[var(--color-accent)] mt-1">
                      ⚽ {versusData.player2.statistics.goals} goals · 
                      🎯 {versusData.player2.statistics.assists} assists
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Overlay Link */}
            <div className="p-4 bg-[var(--color-bg1)] rounded-lg border border-[var(--color-muted)]/20">
              <h4 className="text-sm font-bold text-[var(--color-muted)] mb-2">Overlay URL</h4>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/overlay/versus`}
                  className="flex-1 px-3 py-2 bg-[var(--color-bg0)] border border-[var(--color-muted)]/30 rounded text-sm text-[var(--color-text)] font-mono"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/overlay/versus`);
                  }}
                  className="px-3 py-2 bg-[var(--color-accent)] text-white rounded hover:opacity-90 transition-all text-sm"
                >
                  📋 Copy
                </button>
                <a
                  href="/overlay/versus"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/50 rounded hover:bg-blue-500/30 transition-all text-sm"
                >
                  🔗 Open
                </a>
              </div>
            </div>
            
            {/* Info */}
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-blue-400 text-sm">
                <strong>ℹ️ Note:</strong> Player statistics will be fetched from SportMonks API when available.
                Currently showing mock data for design purposes.
              </p>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}

// ==================== TEST EVENTS SECTION ====================

function TestEventsSection() {
  const testEvent = useAppStore((s) => s.testEvent);
  const appState = useAppStore((s) => s.appState);
  const [lastTriggered, setLastTriggered] = useState<string | null>(null);
  
  const mainMatch = appState?.data?.mainMatch;
  const hasMainMatch = !!mainMatch;
  
  const handleTestEvent = (kind: "GOAL" | "YELLOW" | "RED" | "SUB" | "VAR" | "INFO", team: "HOME" | "AWAY", player?: string, minute?: number) => {
    testEvent({ kind, team, player, minute });
    setLastTriggered(`${kind} - ${team}${player ? ` (${player})` : ""}`);
    
    // Clear after 3 seconds
    setTimeout(() => setLastTriggered(null), 3000);
  };
  
  const testButtons: { kind: "GOAL" | "YELLOW" | "RED" | "SUB" | "VAR" | "INFO"; label: string; icon: string; color: string }[] = [
    { kind: "GOAL", label: "Goal", icon: "⚽", color: "bg-green-500/20 text-green-400 border-green-500/50" },
    { kind: "YELLOW", label: "Yellow Card", icon: "🟨", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50" },
    { kind: "RED", label: "Red Card", icon: "🟥", color: "bg-red-500/20 text-red-400 border-red-500/50" },
    { kind: "SUB", label: "Substitution", icon: "🔄", color: "bg-blue-500/20 text-blue-400 border-blue-500/50" },
    { kind: "VAR", label: "VAR Review", icon: "📺", color: "bg-purple-500/20 text-purple-400 border-purple-500/50" },
    { kind: "INFO", label: "Info", icon: "ℹ️", color: "bg-gray-500/20 text-gray-400 border-gray-500/50" },
  ];
  
  const testPlayers = {
    HOME: ["Haaland", "De Bruyne", "Foden", "Rodri"],
    AWAY: ["Mbappé", "Vinicius Jr.", "Bellingham", "Modric"],
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--color-text)]">Test Events</h2>
        <p className="text-sm text-[var(--color-muted)]">
          Trigger test events to preview overlay animations
        </p>
      </div>
      
      {!hasMainMatch && (
        <Panel className="p-4 border-l-4 border-l-yellow-500">
          <p className="text-yellow-400">
            ⚠️ No main match selected. Select a match first to test events.
          </p>
        </Panel>
      )}
      
      {hasMainMatch && (
        <>
          {/* Current Match Info */}
          <Panel className="p-4">
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">Current Match</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {mainMatch.homeTeam.crestUrl && (
                  <img src={mainMatch.homeTeam.crestUrl} alt="" className="w-8 h-8 object-contain" />
                )}
                <span className="font-medium text-[var(--color-text)]">{mainMatch.homeTeam.name}</span>
              </div>
              <span className="text-2xl font-bold text-[var(--color-accent)]">
                {mainMatch.score.home} - {mainMatch.score.away}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-[var(--color-text)]">{mainMatch.awayTeam.name}</span>
                {mainMatch.awayTeam.crestUrl && (
                  <img src={mainMatch.awayTeam.crestUrl} alt="" className="w-8 h-8 object-contain" />
                )}
              </div>
            </div>
          </Panel>
          
          {/* Quick Test Buttons */}
          <Panel className="p-4">
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Quick Test - HOME Team</h3>
            <div className="grid grid-cols-3 gap-3">
              {testButtons.map((btn) => (
                <button
                  key={`home-${btn.kind}`}
                  onClick={() => handleTestEvent(btn.kind, "HOME", testPlayers.HOME[0], 45)}
                  className={`p-4 rounded-lg border font-medium transition-all hover:scale-105 active:scale-95 ${btn.color}`}
                >
                  <span className="text-2xl block mb-1">{btn.icon}</span>
                  {btn.label}
                </button>
              ))}
            </div>
          </Panel>
          
          <Panel className="p-4">
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Quick Test - AWAY Team</h3>
            <div className="grid grid-cols-3 gap-3">
              {testButtons.map((btn) => (
                <button
                  key={`away-${btn.kind}`}
                  onClick={() => handleTestEvent(btn.kind, "AWAY", testPlayers.AWAY[0], 67)}
                  className={`p-4 rounded-lg border font-medium transition-all hover:scale-105 active:scale-95 ${btn.color}`}
                >
                  <span className="text-2xl block mb-1">{btn.icon}</span>
                  {btn.label}
                </button>
              ))}
            </div>
          </Panel>
          
          {/* Last Triggered */}
          {lastTriggered && (
            <Panel className="p-4 border-l-4 border-l-[var(--color-accent)] animate-pulse">
              <p className="text-[var(--color-accent)] font-medium">
                ✅ Triggered: {lastTriggered}
              </p>
            </Panel>
          )}
          
          {/* Custom Event Form */}
          <Panel className="p-4">
            <h3 className="text-lg font-semibold text-[var(--color-text)] mb-4">Custom Event</h3>
            <CustomEventForm onSubmit={handleTestEvent} homeTeam={mainMatch.homeTeam.name} awayTeam={mainMatch.awayTeam.name} />
          </Panel>
        </>
      )}
    </div>
  );
}

function CustomEventForm({ 
  onSubmit, 
  homeTeam, 
  awayTeam 
}: { 
  onSubmit: (kind: "GOAL" | "YELLOW" | "RED" | "SUB" | "VAR" | "INFO", team: "HOME" | "AWAY", player?: string, minute?: number) => void;
  homeTeam: string;
  awayTeam: string;
}) {
  const [kind, setKind] = useState<"GOAL" | "YELLOW" | "RED" | "SUB" | "VAR" | "INFO">("GOAL");
  const [team, setTeam] = useState<"HOME" | "AWAY">("HOME");
  const [player, setPlayer] = useState("");
  const [minute, setMinute] = useState(45);
  
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <label className="block text-sm text-[var(--color-muted)] mb-2">Event Type</label>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as typeof kind)}
          className="w-full px-4 py-2 bg-[var(--color-bg0)] text-[var(--color-text)] rounded-lg border border-[var(--color-muted)]/30"
        >
          <option value="GOAL">⚽ Goal</option>
          <option value="YELLOW">🟨 Yellow Card</option>
          <option value="RED">🟥 Red Card</option>
          <option value="SUB">🔄 Substitution</option>
          <option value="VAR">📺 VAR Review</option>
          <option value="INFO">ℹ️ Info</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm text-[var(--color-muted)] mb-2">Team</label>
        <select
          value={team}
          onChange={(e) => setTeam(e.target.value as typeof team)}
          className="w-full px-4 py-2 bg-[var(--color-bg0)] text-[var(--color-text)] rounded-lg border border-[var(--color-muted)]/30"
        >
          <option value="HOME">{homeTeam} (HOME)</option>
          <option value="AWAY">{awayTeam} (AWAY)</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm text-[var(--color-muted)] mb-2">Player Name (optional)</label>
        <input
          type="text"
          value={player}
          onChange={(e) => setPlayer(e.target.value)}
          placeholder="e.g. Haaland"
          className="w-full px-4 py-2 bg-[var(--color-bg0)] text-[var(--color-text)] rounded-lg border border-[var(--color-muted)]/30"
        />
      </div>
      
      <div>
        <label className="block text-sm text-[var(--color-muted)] mb-2">Minute</label>
        <input
          type="number"
          value={minute}
          onChange={(e) => setMinute(parseInt(e.target.value) || 0)}
          min={0}
          max={120}
          className="w-full px-4 py-2 bg-[var(--color-bg0)] text-[var(--color-text)] rounded-lg border border-[var(--color-muted)]/30"
        />
      </div>
      
      <div className="col-span-2">
        <button
          onClick={() => onSubmit(kind, team, player || undefined, minute)}
          className="w-full px-6 py-3 bg-[var(--color-accent)] text-white rounded-lg font-bold hover:opacity-90 transition-all"
        >
          🎯 Trigger Event
        </button>
      </div>
    </div>
  );
}
