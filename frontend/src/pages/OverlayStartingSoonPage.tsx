import { useEffect, useState, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { Cloud, Wind, MapPin, Tv, Droplets, Trophy } from "lucide-react";
import { getWsClient } from "@/ws";
import { useAppStore } from "@/store";
import { env } from "@parerineavizate/shared/wsEvents";
import type { Match } from "@parerineavizate/shared";
import backgroundImage from "@/assets/background_startingsoon.png";
import logoImage from "@/assets/logo png-8.png";

// Competitions that should keep original logo colors (not inverted to white)
const KEEP_ORIGINAL_LOGO_COMPETITIONS = [
  "Bundesliga",
  "Ligue 1", 
  "Superliga",
  "Serie A",
];

function shouldKeepOriginalLogo(competitionName?: string): boolean {
  if (!competitionName) return false;
  return KEEP_ORIGINAL_LOGO_COMPETITIONS.some(name => 
    competitionName.toLowerCase().includes(name.toLowerCase())
  );
}

// Default stadium image for thumbnail fallback
const DEFAULT_STADIUM_THUMBNAIL =
  "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&h=400&fit=crop";

// Font styles component
const FontStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Montserrat:wght@300;400;500;600;700;800&display=swap');
    
    .font-bebas { font-family: 'Bebas Neue', sans-serif; }
    .font-montserrat { font-family: 'Montserrat', sans-serif; }
    
    .ticker-wrap {
      width: 100%;
      overflow: hidden;
      white-space: nowrap;
      mask-image: linear-gradient(to right, transparent, black 2%, black 98%, transparent);
    }
    .ticker {
      display: inline-flex;
      will-change: transform;
    }
    .ticker-animate {
      animation: ticker var(--ticker-duration, 60s) linear infinite;
      animation-play-state: running;
    }
    @keyframes ticker {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
  `}</style>
);

// Countdown Timer Component - Always shows 3:10 countdown
const CountdownTimer = () => {
  const [timeLeft, setTimeLeft] = useState(3 * 60 + 10); // Always start at 3:10

  useEffect(() => {
    // Countdown from 3:10, stop at 0
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) return 0; // Stay at 0
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const formatTime = (value: number) => value.toString().padStart(2, "0");

  return (
    <div className="flex items-center gap-4 font-bebas text-[#F5F5F5] drop-shadow-[0_20px_60px_rgba(0,0,0,1)] select-none">
      <div className="flex flex-col items-center">
        <span className="text-[340px] leading-tight tracking-tight tabular-nums block py-2">
          {formatTime(minutes)}
        </span>
      </div>
      
      <div className="flex flex-col justify-center h-[280px]">
         {/* Pink accent colon */}
         <span className="text-[180px] text-[#F659FD] animate-pulse leading-none pb-8">:</span>
      </div>
      
      <div className="flex flex-col items-center">
        <span className="text-[340px] leading-tight tracking-tight tabular-nums text-transparent bg-clip-text bg-gradient-to-b from-[#F5F5F5] via-[#F5F5F5] to-[#F5F5F5]/50 block py-2">
          {formatTime(seconds)}
        </span>
      </div>
    </div>
  );
};

export function OverlayStartingSoonPage() {
  const appState = useAppStore((s) => s.appState);
  const handleServerMessage = useAppStore((s) => s.handleServerMessage);
  const setConnectionStatus = useAppStore((s) => s.setConnectionStatus);
  const wsInitialized = useRef(false);

  // Connect to WebSocket on mount
  useEffect(() => {
    if (wsInitialized.current) return;
    wsInitialized.current = true;

    const ws = getWsClient();
    
    ws.setHelloMessage(
      env("overlay:hello", {
        role: "overlay" as const,
        clientId: `overlay_startingsoon_${Date.now()}`,
        overlay: "startingsoon" as any,
        format: "16x9" as const,
      })
    );

    ws.onMessage(handleServerMessage);
    ws.onStatusChange(setConnectionStatus);
    ws.connect();
  }, [handleServerMessage, setConnectionStatus]);

  // Get main match data
  const mainMatch: Match | null = appState?.data.mainMatch ?? null;
  const tickerMatches: Match[] = appState?.data.tickerMatches ?? [];
  
  // Keep reference to last valid ticker matches to prevent flash
  const lastTickerMatchesRef = useRef<Match[]>([]);
  if (tickerMatches.length > 0) {
    lastTickerMatchesRef.current = tickerMatches;
  }
  const stableTickerMatches = tickerMatches.length > 0 ? tickerMatches : lastTickerMatchesRef.current;
  
  // Memoize ticker key to prevent animation restart on unrelated re-renders
  const tickerKey = useMemo(() => {
    return stableTickerMatches.map(m => m.id).join('-');
  }, [stableTickerMatches]);

  // Extract data from main match
  const venue = mainMatch?.venue;

  // Format ticker matches for display - use stable matches to prevent flash
  const otherMatches = useMemo(() => stableTickerMatches.map((m: Match) => {
    const homeShort = m.homeTeam?.shortName ?? m.homeTeam?.name ?? "TBD";
    const awayShort = m.awayTeam?.shortName ?? m.awayTeam?.name ?? "TBD";
    const homeLogo = m.homeTeam?.crestUrl;
    const awayLogo = m.awayTeam?.crestUrl;
    const time = m.startTime
      ? new Date(m.startTime).toLocaleTimeString("ro-RO", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "--:--";
    return { homeShort, awayShort, homeLogo, awayLogo, time };
  }), [stableTickerMatches]);

  // Weather data from main match (fallback to placeholder if not available)
  const weatherData = mainMatch?.weather;
  const weather = {
    temp: weatherData?.temperature ?? 18,
    condition: weatherData?.condition ?? "Cer Senin",
    humidity: weatherData?.humidity !== undefined ? `${weatherData.humidity}%` : "45%",
    windSpeed: weatherData?.wind?.speed ?? 12,
    icon: weatherData?.icon,
  };

  // Stadium image for thumbnail with fallback
  const stadiumThumbnail = venue?.imageUrl || DEFAULT_STADIUM_THUMBNAIL;

  // No match selected state
  if (!mainMatch) {
    return (
      <div className="w-[1920px] h-[1080px] bg-black flex items-center justify-center font-montserrat">
        <FontStyles />
        <div className="text-center text-[#F5F5F5]/60">
          <div className="text-6xl mb-4">⚽</div>
          <div className="text-2xl">No match selected</div>
          <div className="text-sm mt-2">
            Select a main match from the admin panel
          </div>
        </div>
      </div>
    );
  }

  return (
    // CONTAINER PRINCIPAL: 1920x1080
    <div className="relative w-[1920px] h-[1080px] overflow-hidden bg-black text-[#F5F5F5] select-none font-montserrat">
      <FontStyles />

      {/* 1. BACKGROUND */}
      <div className="absolute inset-0 z-0">
        <img 
          src={backgroundImage} 
          className="w-full h-full object-cover grayscale-[0.3]" 
          alt="Background" 
        />
        {/* Gradient overlay: Matte Black -> UCL Blue */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0f0f0f] to-[#0549AC]/80 mix-blend-multiply" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,transparent_0%,black_90%)] opacity-90" />
      </div>

      {/* 2. ZONA STÂNGA (WIDGET) */}
      <motion.div 
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="absolute left-[100px] top-[54px] bottom-[54px] w-[480px] z-50 flex flex-col"
      >
        {/* Glassmorphism panel with reduced opacity */}
        <div className="h-full w-full bg-[#0A1B51]/10 backdrop-blur-2xl border border-[#F5F5F5]/10 rounded-[40px] flex flex-col shadow-[0_30px_80px_rgba(0,0,0,0.7)] overflow-hidden relative">

            {/* TOP SECTION */}
            <div className="pt-10 px-8 flex flex-col gap-4 relative z-10">
               <div>
                 {/* Pink accent icon */}
                 <div className="flex items-center gap-2 text-[#F659FD] mb-2">
                    <MapPin size={16} />
                    <span className="text-xs font-bold uppercase tracking-widest text-[#F5F5F5]/60 font-montserrat">Stadionul</span>
                 </div>
                 <h1 className="text-6xl font-bebas leading-[0.85] text-[#F5F5F5] mb-2">
                   {venue?.name ?? "Stadium"}
                 </h1>
                 <span className="text-lg font-medium text-[#F5F5F5]/60 ml-1 block mb-4 font-montserrat">
                   {venue?.city ? `${venue.city}${venue.country ? `, ${venue.country}` : ""}` : "Location"}
                 </span>
               </div>

               {/* Stadium Image */}
               <div className="w-full h-48 rounded-2xl overflow-hidden relative border border-[#F5F5F5]/10 shadow-xl group">
                  <img 
                    src={stadiumThumbnail} 
                    className="w-full h-full object-cover transition-transform duration-[30s] ease-linear group-hover:scale-110" 
                    alt="Stadium" 
                  />
                  {/* UCL Blue gradient on image */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0A1B51]/80 to-transparent pointer-events-none" />
               </div>

               {/* Local Time */}
               <div className="mt-2 flex items-center justify-between px-2">
                  <span className="text-base font-bold uppercase tracking-widest text-[#F5F5F5]/50 font-montserrat">Ora la stadion</span>
                  <span className="text-4xl font-bebas tracking-wide text-[#F5F5F5] leading-none">
                    {mainMatch?.startTime 
                      ? new Date(mainMatch.startTime).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })
                      : '--:--'}
                  </span>
               </div>
               <div className="h-[1px] w-full bg-[#F5F5F5]/10 mt-2"></div>
            </div>

            {/* MIDDLE: Weather */}
            <div className="flex-1 px-8 flex flex-col justify-center items-center relative z-10">
               <div className="flex flex-col items-center justify-center transform scale-90">
                  <Cloud size={80} className="text-[#F5F5F5]/90 drop-shadow-[0_0_25px_rgba(255,255,255,0.1)] mb-2" />
                  
                  <div className="flex items-start leading-none ml-6">
                     <span className="text-[130px] font-bebas text-[#F5F5F5] tracking-tighter drop-shadow-xl">
                       {weather.temp}
                     </span>
                     {/* Cyan accent */}
                     <span className="text-5xl text-[#33EFFF] font-bebas mt-4 ml-4">°C</span>
                  </div>
                  
                  <span className="text-2xl font-medium text-[#F5F5F5]/80 uppercase tracking-widest mb-6 font-montserrat">
                    {weather.condition}
                  </span>
                  
                  <div className="flex gap-4 w-full justify-center">
                     <div className="flex items-center gap-2 bg-[#F5F5F5]/5 px-4 py-2 rounded-xl border border-[#F5F5F5]/5 backdrop-blur-sm">
                        {/* Pink accent icon */}
                        <Wind size={20} className="text-[#F659FD]" />
                        <span className="font-bebas text-2xl text-[#F5F5F5]/90">{weather.windSpeed} KM/H</span>
                     </div>
                     <div className="flex items-center gap-2 bg-[#F5F5F5]/5 px-4 py-2 rounded-xl border border-[#F5F5F5]/5 backdrop-blur-sm">
                        {/* Pink accent icon */}
                        <Droplets size={20} className="text-[#F659FD]" />
                        <span className="font-bebas text-2xl text-[#F5F5F5]/90">{weather.humidity}</span>
                     </div>
                  </div>
               </div>
            </div>

            {/* BOTTOM: Competition */}
            <div className="pb-10 px-8 pt-4 bg-gradient-to-t from-[#0A1B51]/80 to-transparent z-10 flex items-center justify-center">
               {/* Competition Logo + Round - Centered row layout */}
               <div className="flex items-center gap-4 scale-[0.85]">
                  {mainMatch?.competition?.logoUrl ? (
                    <img 
                      src={mainMatch.competition.logoUrl} 
                      className={`h-24 w-24 object-contain drop-shadow-lg ${shouldKeepOriginalLogo(mainMatch.competition.name) ? '' : 'brightness-0 invert'}`}
                      alt={mainMatch.competition.name ?? "Competition"} 
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-full bg-[#F5F5F5]/10 flex items-center justify-center">
                      <Trophy size={48} className="text-[#F5F5F5]" />
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-2xl font-bebas tracking-wide text-[#F5F5F5] leading-tight">
                      {mainMatch?.competition?.name ?? "Competiție"}
                    </span>
                    {mainMatch?.round && (
                      <span className="text-base font-montserrat font-medium text-[#33EFFF]">
                        Etapa {mainMatch.round.name}
                      </span>
                    )}
                  </div>
               </div>
            </div>
        </div>
      </motion.div>

      {/* 3. ZONA DREAPTA (CONȚINUT) */}
      <div className="absolute left-[620px] top-[54px] right-[100px] bottom-[54px]">
        
        {/* A. TOP RIGHT: LOGO + MATCHUP */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-0 right-0 z-50 flex flex-col items-center gap-4"
        >
          {/* Logo Pareri Neavizate */}
          <img 
            src={logoImage} 
            className="h-20 object-contain drop-shadow-lg" 
            alt="Pareri Neavizate" 
          />
          
          {/* Match Badge */}
          <div className="flex items-center gap-6 bg-[#F5F5F5]/5 backdrop-blur-xl border border-[#F5F5F5]/5 px-8 py-3 rounded-2xl shadow-2xl">
              <img 
                src={mainMatch.homeTeam?.crestUrl} 
                className="h-10 w-10 object-contain" 
                alt={mainMatch.homeTeam?.name ?? "Home"} 
              />
              
              <div className="flex items-center gap-3 pt-1">
                 <span className="text-4xl font-bebas text-[#F5F5F5] tracking-wide leading-none">
                   {mainMatch.homeTeam?.shortName ?? "HOME"}
                 </span>
                 {/* Cyan VS accent */}
                 <span className="text-2xl font-bebas text-[#33EFFF] mx-1 leading-none">VS</span>
                 <span className="text-4xl font-bebas text-[#F5F5F5] tracking-wide leading-none">
                   {mainMatch.awayTeam?.shortName ?? "AWAY"}
                 </span>
              </div>

              <img 
                src={mainMatch.awayTeam?.crestUrl} 
                className="h-10 w-10 object-contain" 
                alt={mainMatch.awayTeam?.name ?? "Away"} 
              />
          </div>
        </motion.div>

        {/* B. CENTER: COUNTDOWN */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
             <CountdownTimer />
          </motion.div>
        </div>

        {/* C. BOTTOM: MATCHES TICKER */}
        {otherMatches.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="absolute bottom-0 right-0 w-[94%] h-14 bg-[#0A1B51]/10 backdrop-blur-xl border border-[#F5F5F5]/10 rounded-2xl flex items-center overflow-hidden shadow-2xl z-40"
          >
            {/* Pink ticker title box */}
            <div className="bg-[#F659FD] h-full px-6 flex flex-col justify-center items-center z-20 shadow-lg min-w-[120px]">
              <Tv size={20} className="text-[#F5F5F5] mb-0.5" />
              <span className="font-bebas text-lg tracking-wider text-[#F5F5F5] leading-none">ALTE MECIURI</span>
            </div>
            
            <div className="ticker-wrap flex-1 flex items-center h-full relative z-10">
              <div 
                key={tickerKey}
                className="ticker ticker-animate flex items-center"
                style={{ '--ticker-duration': `${Math.max(30, otherMatches.length * 8)}s` } as React.CSSProperties}
              >
                {[...otherMatches, ...otherMatches].map((match, idx) => {
                  return (
                    <div key={idx} className="flex items-center gap-4 text-[#F5F5F5]/90 whitespace-nowrap shrink-0">
                      {/* Home team logo + name */}
                      <div className="flex items-center gap-1.5 shrink-0 ml-4">
                        {match.homeLogo && (
                          <img 
                            src={match.homeLogo} 
                            alt="" 
                            className="w-5 h-5 object-contain"
                          />
                        )}
                        <span className="font-bebas text-xl tracking-wide">{match.homeShort}</span>
                      </div>
                      
                      <span className="font-bebas text-lg text-[#F5F5F5]/40 shrink-0">vs</span>
                      
                      {/* Away team logo + name */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="font-bebas text-xl tracking-wide">{match.awayShort}</span>
                        {match.awayLogo && (
                          <img 
                            src={match.awayLogo} 
                            alt="" 
                            className="w-5 h-5 object-contain"
                          />
                        )}
                      </div>
                      
                      {match.time && (
                        <span className="bg-[#33EFFF]/10 px-2 py-0.5 rounded text-xs font-mono font-bold text-[#33EFFF] border border-[#33EFFF]/30 shrink-0 ml-1">
                          {match.time}
                        </span>
                      )}
                      {/* Separator line */}
                      <div className="w-[1px] h-4 bg-[#F5F5F5]/20 ml-4 shrink-0" />
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// Also export as default for backwards compatibility
export default OverlayStartingSoonPage;