/**
 * LineupsWidget - Team lineup display with formation and player positions
 * 
 * Features:
 * - Formation-based player positioning
 * - Pink wipe animation on sidebar
 * - Pitch sliding out as drawer
 * - Player tokens with photos and position badges
 * - Team form display
 * - Manager information
 * 
 * @example
 * <LineupsWidget lineups={lineups} team={match.homeTeam} teamSide="HOME" isActive={true} />
 */

import { motion, AnimatePresence } from "framer-motion";
import type { MatchLineups, TeamLineup, LineupPlayer, Team } from "@parerineavizate/shared/models";
import logoImage from "@/assets/logo png-8.png";

// ==================== TYPES ====================

export interface LineupsWidgetProps {
  lineups: MatchLineups;
  team?: Team;
  teamSide: "HOME" | "AWAY";
  isActive: boolean;
}

// ==================== FORMATION POSITIONING ====================

function parseFormationCounts(formation: string | undefined): number[] {
  if (!formation) return [4, 4, 2]; // Default 4-4-2
  
  const parts = formation.split("-").map(n => parseInt(n, 10)).filter(n => !isNaN(n));
  return parts.length > 0 ? parts : [4, 4, 2];
}

/**
 * Parse formation_field like "2:3" into { row, col }
 * Row 1 = GK line, Row 2 = first outfield line (defenders for 4-4-2), etc.
 */
function parseFormationField(field: string | undefined): { row: number; col: number } | null {
  if (!field) return null;
  const parts = field.split(":");
  if (parts.length !== 2) return null;
  const row = parseInt(parts[0], 10);
  const col = parseInt(parts[1], 10);
  if (isNaN(row) || isNaN(col)) return null;
  return { row, col };
}

function getPlayerPositionInFormation(
  player: LineupPlayer,
  allPlayers: LineupPlayer[],
  formation: string | undefined,
  isAway: boolean = false
): { lineIndex: number; indexInLine: number; totalInLine: number } {
  const counts = parseFormationCounts(formation);
  
  // === FIRST: Try using formation_field (most accurate) ===
  const fieldPos = parseFormationField(player.formationField);
  if (fieldPos) {
    const { row, col } = fieldPos;
    
    // Row 1 = GK (lineIndex 0)
    if (row === 1) {
      return { lineIndex: 0, indexInLine: 0, totalInLine: 1 };
    }
    
    // Row 2+ maps to outfield lines
    const lineIndex = row - 1; // row 2 -> lineIndex 1, row 3 -> lineIndex 2, etc.
    const lineCount = counts[lineIndex - 1] || 4; // Get count for this formation line
    
    // Count how many players are in the same row
    const playersInSameRow = allPlayers.filter(p => {
      const pField = parseFormationField(p.formationField);
      return pField && pField.row === row;
    });
    
    const totalInLine = Math.max(playersInSameRow.length, lineCount);
    
    // For away team, mirror the horizontal position (invert column)
    const adjustedCol = isAway ? (totalInLine - col + 1) : col;
    
    return {
      lineIndex,
      indexInLine: adjustedCol - 1, // col is 1-indexed
      totalInLine,
    };
  }
  
  // === FALLBACK: Use formationPosition ===
  // GK always first
  if (player.formationPosition === 1) {
    return { lineIndex: 0, indexInLine: 0, totalInLine: 1 };
  }
  
  // Use formationPosition if available
  if (player.formationPosition !== undefined && player.formationPosition > 0) {
    const pos = player.formationPosition;
    let currentPos = 1; // GK
    
    for (let lineIdx = 0; lineIdx < counts.length; lineIdx++) {
      const lineCount = counts[lineIdx];
      if (pos <= currentPos + lineCount) {
        return {
          lineIndex: lineIdx + 1, // +1 because GK is line 0
          indexInLine: pos - currentPos - 1,
          totalInLine: lineCount,
        };
      }
      currentPos += lineCount;
    }
  }
  
  // === LAST FALLBACK: use array index ===
  const starters = allPlayers.filter(p => p.role === "STARTER" || !p.role).slice(0, 11);
  const playerIndex = starters.findIndex(p => p.id === player.id || p.name === player.name);
  
  if (playerIndex === 0) {
    return { lineIndex: 0, indexInLine: 0, totalInLine: 1 };
  }
  
  let currentPos = 1;
  for (let lineIdx = 0; lineIdx < counts.length; lineIdx++) {
    const lineCount = counts[lineIdx];
    if (playerIndex < currentPos + lineCount) {
      return {
        lineIndex: lineIdx + 1,
        indexInLine: playerIndex - currentPos,
        totalInLine: lineCount,
      };
    }
    currentPos += lineCount;
  }
  
  return { lineIndex: 1, indexInLine: 0, totalInLine: 4 };
}

// ==================== PLAYER TOKEN ====================

interface PlayerTokenProps {
  player: LineupPlayer;
  index: number;
  totalInLine: number;
  lineIndex: number;
  totalLines: number;
}

function PlayerToken({ player, index, totalInLine, lineIndex, totalLines }: PlayerTokenProps) {
  let left = '50%';
  
  if (lineIndex === 0) {
    left = '6%';
  } else {
    const startX = 22;
    const endX = 82;
    const availableX = endX - startX;
    
    if (totalLines === 1) {
      left = '52%';
    } else {
      const step = availableX / (totalLines - 1);
      const xPos = startX + ((lineIndex - 1) * step);
      left = `${xPos}%`;
    }
  }
  
  const offsetY = -5;
  let top = '50%';
  const invertedIndex = totalInLine - 1 - index;
  
  if (totalInLine === 1) {
    top = `${50 + offsetY}%`;
  } else if (totalInLine === 2) {
    const positions = [35 + offsetY, 65 + offsetY];
    top = `${positions[invertedIndex]}%`;
  } else if (totalInLine === 3) {
    const positions = [25 + offsetY, 50 + offsetY, 75 + offsetY];
    top = `${positions[invertedIndex]}%`;
  } else if (totalInLine === 4) {
    const positions = [15 + offsetY, 38 + offsetY, 62 + offsetY, 85 + offsetY];
    top = `${positions[invertedIndex]}%`;
  } else if (totalInLine === 5) {
    const positions = [10 + offsetY, 30 + offsetY, 50 + offsetY, 70 + offsetY, 90 + offsetY];
    top = `${positions[invertedIndex]}%`;
  } else {
    const padding = 8;
    const availableSpace = 100 - (padding * 2);
    const step = availableSpace / (totalInLine - 1);
    top = `${padding + (invertedIndex * step) + offsetY}%`;
  }
  
  const delay = 1.2 + (lineIndex * 0.15) + (index * 0.1);

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ delay, type: "spring", stiffness: 200, damping: 12 }}
      className="absolute flex flex-col items-center justify-center w-24"
      style={{ left, top, transform: 'translate(-50%, -50%)' }}
    >
      <div className="relative w-12 h-12 z-10">
        <div className="absolute inset-0 rounded-full bg-[#1E2C49] border-2 border-[#33EFFF] flex items-center justify-center shadow-[0_0_15px_rgba(51,239,255,0.3)] overflow-hidden">
          {player.photoUrl ? (
            <img 
              src={player.photoUrl} 
              alt={player.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                if (fallback) fallback.classList.remove('hidden');
              }}
            />
          ) : null}
          <span className={`font-bebas text-xl text-[#F5F5F5] ${player.photoUrl ? 'hidden' : ''}`}>
            {player.number || "?"}
          </span>
        </div>
        
        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#F659FD] rounded-full flex items-center justify-center border border-[#1E2C49] z-20">
          <span className="text-[8px] font-bold text-white">
            {player.position || "?"}
          </span>
        </div>
      </div>
      
      <div className="mt-1 bg-black/60 backdrop-blur-md px-3 py-0.5 rounded-full border border-white/10 shadow-lg">
        <span className="font-montserrat font-bold text-xs text-[#F5F5F5] whitespace-nowrap uppercase tracking-wider">
          {player.name.split(" ").pop()}
        </span>
      </div>
    </motion.div>
  );
}

// ==================== FORM BADGE ====================

function FormBadge({ result }: { result: string }) {
  const bgClass = result === 'W' 
    ? 'bg-green-600 text-white' 
    : result === 'D' 
      ? 'bg-gray-600 text-gray-200' 
      : 'bg-red-600 text-white';
      
  return (
    <div className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs border border-white/5 shadow-inner ${bgClass}`}>
      {result}
    </div>
  );
}

// ==================== TEAM SIDEBAR ====================

interface TeamSidebarProps {
  teamName: string;
  formation?: string;
  crestUrl?: string;
  form?: string[];
  manager?: string;
}

function TeamSidebar({ teamName, formation, crestUrl, form, manager }: TeamSidebarProps) {
  // Dynamic font size based on team name length
  const getTeamNameClass = (name: string) => {
    if (name.length > 18) return "text-3xl";
    if (name.length > 14) return "text-4xl";
    if (name.length > 10) return "text-5xl";
    return "text-6xl";
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { delay: 0.5 } }}
      exit={{ opacity: 0, transition: { delay: 0.9 } }}
      className="h-full w-full bg-[#1E2C49]/80 backdrop-blur-xl border-2 border-[#33EFFF] rounded-3xl flex flex-col items-center justify-between py-6 relative overflow-hidden shadow-[10px_0_50px_rgba(0,0,0,0.8)]"
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
      <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />

      <div className="relative z-10 flex flex-col items-center w-full px-4 flex-shrink-0">
        {crestUrl && (
          <div className="w-36 h-36 drop-shadow-[0_10px_30px_rgba(0,0,0,0.6)] mb-3">
            <img src={crestUrl} className="w-full h-full object-contain" alt={teamName} />
          </div>
        )}
        <h2 className={`${getTeamNameClass(teamName)} font-bebas text-white tracking-normal text-center leading-[0.9] max-w-full break-words`}>
          {teamName}
        </h2>
        
        <div className="mt-3 flex flex-col items-center">
          <span className="text-[9px] uppercase tracking-widest text-[#F5F5F5]/40 mb-0.5">
            Lineups brought to you by
          </span>
          <img src={logoImage} className="h-12 object-contain" alt="Pareri Neavizate" />
        </div>
      </div>

      <div className="relative z-10 w-full px-6 space-y-4 flex-shrink-0">
        <div className="w-full h-[1px] bg-white/10" />
        <div className="flex justify-between items-end">
          <div>
            <span className="block text-[10px] uppercase tracking-widest text-[#F5F5F5]/50 mb-0.5">Manager</span>
            <span className="block text-2xl font-bebas text-white tracking-wide">
              {manager || "TBD"}
            </span>
          </div>
          <div className="text-right">
            <span className="block text-[10px] uppercase tracking-widest text-[#F5F5F5]/50 mb-0.5">System</span>
            <span className="block text-2xl font-bebas text-[#33EFFF] tracking-wide">
              {formation || "4-4-2"}
            </span>
          </div>
        </div>
        <div className="w-full h-[1px] bg-white/10" />
        
        {form && form.length > 0 && (
          <div>
            <span className="block text-[10px] uppercase tracking-widest text-[#F5F5F5]/50 mb-1">
              Forma Recentă
            </span>
            <div className="flex gap-1.5">
              {form.slice(0, 5).map((res, i) => (
                <FormBadge key={i} result={res} />
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ==================== PITCH ====================

interface PitchProps {
  lineup: TeamLineup;
  isAway?: boolean;
}

function Pitch({ lineup, isAway = false }: PitchProps) {
  const players = (lineup.startingXI || []).slice(0, 11);
  const formationCounts = parseFormationCounts(lineup.formation);
  const totalLines = formationCounts.length;
  
  const groupedPlayers: { player: LineupPlayer; index: number; totalInLine: number; lineIndex: number }[] = [];
  
  players.forEach((player) => {
    const pos = getPlayerPositionInFormation(player, players, lineup.formation, isAway);
    groupedPlayers.push({
      player,
      index: pos.indexInLine,
      totalInLine: pos.totalInLine,
      lineIndex: pos.lineIndex,
    });
  });

  return (
    <div className="h-full w-full bg-[#1E2C49]/80 backdrop-blur-xl border-y-2 border-r-2 border-[#33EFFF]/50 rounded-r-3xl overflow-hidden relative shadow-[0_0_40px_rgba(0,0,0,0.5)]">
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-transparent pointer-events-none" />

      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-[#33EFFF]/40" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-[#33EFFF]/40 rounded-full" />
        <div className="absolute top-1/2 left-0 -translate-y-1/2 w-40 h-80 border-r border-y border-[#33EFFF]/40" />
        <div className="absolute top-1/2 right-0 -translate-y-1/2 w-40 h-80 border-l border-y border-[#33EFFF]/40" />
        <div className="absolute top-0 left-0 w-8 h-8 border-b border-r border-[#33EFFF]/40 rounded-br-full" />
        <div className="absolute bottom-0 left-0 w-8 h-8 border-t border-r border-[#33EFFF]/40 rounded-tr-full" />
        <div className="absolute top-0 right-0 w-8 h-8 border-b border-l border-[#33EFFF]/40 rounded-bl-full" />
        <div className="absolute bottom-0 right-0 w-8 h-8 border-t border-l border-[#33EFFF]/40 rounded-tl-full" />
      </div>

      <div className="relative w-full h-full">
        {groupedPlayers.map((item, idx) => (
          <PlayerToken 
            key={item.player.id || idx}
            player={item.player}
            index={item.index}
            totalInLine={item.totalInLine}
            lineIndex={item.lineIndex}
            totalLines={totalLines}
          />
        ))}
      </div>

      <div className="absolute top-0 right-0 h-full w-24 bg-gradient-to-l from-[#1E2C49]/80 to-transparent pointer-events-none" />
    </div>
  );
}

// ==================== MAIN WIDGET ====================

export function LineupsWidget({ lineups, team, teamSide, isActive }: LineupsWidgetProps) {
  const currentLineup = teamSide === "HOME" ? lineups.home : lineups.away;

  return (
    <div className="absolute inset-0 flex items-center justify-center pl-20" style={{ transform: 'translateZ(0)', backfaceVisibility: 'hidden', perspective: '1000px' }}>
      <div className="relative flex h-[600px] w-[1100px]">
        <AnimatePresence>
          {isActive && (
            <>
              {/* SIDEBAR with Pink Wipe */}
              <div className="absolute left-0 top-0 bottom-0 w-[380px] z-30">
                <motion.div
                  initial={{ scaleX: 0, originX: 0 }}
                  animate={{ 
                    scaleX: [0, 1, 1, 0],
                    originX: [0, 0, 1, 1],
                    transition: { duration: 1.2, times: [0, 0.4, 0.6, 1], ease: "easeInOut" }
                  }}
                  exit={{ 
                    scaleX: [0, 1, 1, 0],
                    originX: [1, 1, 0, 0], 
                    transition: { duration: 1.2, times: [0, 0.4, 0.6, 1], ease: "easeInOut", delay: 0.5 }
                  }}
                  className="absolute inset-0 bg-[#F659FD] z-50 rounded-3xl"
                />

                <TeamSidebar 
                  teamName={currentLineup.teamName || team?.name || "Team"}
                  formation={currentLineup.formation}
                  crestUrl={team?.crestUrl}
                  manager={currentLineup.manager}
                  form={currentLineup.form}
                />
              </div>

              {/* PITCH (Drawer sliding out) */}
              <motion.div 
                initial={{ x: 0, opacity: 0 }} 
                animate={{ 
                  x: 370, 
                  opacity: 1, 
                  transition: { delay: 1.0, duration: 0.8, ease: [0.16, 1, 0.3, 1] } 
                }} 
                exit={{ 
                  x: 0, 
                  opacity: 0, 
                  transition: { duration: 0.5, ease: "circIn" }
                }} 
                className="absolute top-0 left-0 h-full w-[700px] z-20"
              >
                <Pitch lineup={currentLineup} isAway={teamSide === "AWAY"} />
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
