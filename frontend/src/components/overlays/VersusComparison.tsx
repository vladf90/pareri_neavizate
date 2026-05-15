/**
 * H2H Comparison Component - Player vs Player Head-to-Head
 * 
 * Full-screen overlay displaying two players side-by-side with stats comparison.
 * Used for pre-match hype, half-time analysis, or key matchup highlights.
 * 
 * Design: UCL theme with Cyan (#33EFFF) and Pink (#F659FD) accents
 */

import { motion } from 'framer-motion';
import logoPareri from '@/assets/logo png-8.png';

interface PlayerData {
  name: string;
  lastname?: string;
  firstname?: string;
  team?: string;
  teamLogo?: string;
  photoUrl?: string;
  img?: string;
}

interface H2HComparisonProps {
  competition?: string;
  player1: PlayerData;
  player2: PlayerData;
}



export function VersusComparison({
  competition = "UEFA CHAMPIONS LEAGUE - ETAPA 8",
  player1,
  player2
}: H2HComparisonProps) {

  // Container variants for staggered animation
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      }
    },
    exit: {
      opacity: 0,
      transition: {
        staggerChildren: 0.1,
        staggerDirection: -1,
        duration: 0.8,
      }
    }
  };

  const headerVariants = {
    hidden: { opacity: 0, y: -30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    },
    exit: {
      opacity: 0,
      y: -80,
      transition: { duration: 0.7, ease: [0.4, 0, 0.2, 1] }
    }
  };

  const playerLeftVariants = {
    hidden: { opacity: 0, x: -100 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.8, ease: "easeOut" }
    },
    exit: {
      opacity: 0,
      x: -150,
      transition: { duration: 0.8, ease: [0.4, 0, 0.2, 1] }
    }
  };

  const playerRightVariants = {
    hidden: { opacity: 0, x: 100 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.8, ease: "easeOut" }
    },
    exit: {
      opacity: 0,
      x: 150,
      transition: { duration: 0.8, ease: [0.4, 0, 0.2, 1] }
    }
  };

  const vsVariants = {
    hidden: { opacity: 0, scale: 0.5 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.5, ease: "backOut" }
    },
    exit: {
      opacity: 0,
      y: -40,
      scale: 0.8,
      transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] }
    }
  };

  return (
    // CANVAS 1920x1080 - Alpha Ready (Transparent for OBS overlay)
    <motion.div
      className="relative w-full h-full overflow-hidden bg-transparent select-none font-montserrat text-[#F5F5F5]"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
    >

      {/* BACKGROUND DECORATIV - Removed for transparent overlay */}
      {/* Uncomment below if you want the decorative background back:
      <div className="absolute inset-0 opacity-40 pointer-events-none">
        <div className="absolute top-[-30%] left-1/2 -translate-x-1/2 w-[1200px] h-[800px] bg-[#0A1B51] blur-[150px] rounded-full opacity-50" />
      </div>
      */}

      {/* --- CONTENT CONTAINER (Top 60% of Screen) --- */}
      {/* Am redus width la 1400px pentru a comprima elementele */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1400px] h-[700px] pt-12 flex flex-col items-center">

        {/* 1. HEADER (Competition Info) */}
        <motion.div
          className="flex flex-col items-center mb-6 z-20"
          variants={headerVariants}
        >
          {/* Logo Pareri Neavizate */}
          <motion.div
            className="w-28 h-28 rounded-full flex items-center justify-center mb-3"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.2, duration: 0.6, ease: "backOut" }}
          >
            <img
              src={logoPareri}
              alt="Pareri Neavizate"
              className="w-full h-full object-contain drop-shadow-[0_0_30px_rgba(246,89,253,0.5)]"
            />
          </motion.div>

          {/* TITLU COMPETIȚIE - Competition + Round */}
          <motion.h1
            className="text-7xl font-bebas text-white tracking-wide drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            {competition}
          </motion.h1>
        </motion.div>

        {/* 2. PLAYERS DUEL (Compressed Layout) */}
        <div className="flex items-end justify-center w-full relative mt-2">

          {/* --- PLAYER 1 (LEFT) --- */}
          <motion.div
            className="flex items-end mr-4 relative"
            variants={playerLeftVariants}
          >
            {/* Imagine Jucător */}
            <div className="relative w-[320px] h-[420px] z-10 flex flex-col items-center">
              {/* Glow Spate - Cyan */}
              <div className="absolute top-10 left-10 right-10 bottom-0 bg-[#33EFFF] blur-[80px] opacity-20 rounded-full" />

              <motion.img
                initial={{ opacity: 0, x: -80, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ delay: 0.8, duration: 0.7, ease: "easeOut" }}
                src={player1.img || player1.photoUrl || '/placeholder-player.png'}
                alt={player1.name}
                className="w-full h-full object-cover object-top drop-shadow-2xl relative z-10"
                style={{ maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)' }}
              />

              {/* Name Plate - Below Image, Stacked Vertically */}
              <motion.div
                className="absolute bottom-[-100px] left-1/2 -translate-x-1/2 flex flex-col items-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2, duration: 0.5 }}
              >
                <span className="text-5xl font-bebas text-[#33EFFF] leading-none drop-shadow-[0_4px_4px_rgba(0,0,0,1)]">
                  {player1.firstname || player1.name?.split(' ')[0]}
                </span>
                <span className="text-5xl font-bebas text-white leading-none drop-shadow-[0_4px_4px_rgba(0,0,0,1)]">
                  {player1.lastname || player1.name?.split(' ').slice(1).join(' ')}
                </span>
              </motion.div>
            </div>

          </motion.div>


          {/* --- SPACER / VS (CENTER) --- */}
          <motion.div
            className="h-[420px] flex flex-col justify-center items-center z-20 mx-8"
            variants={vsVariants}
          >
            {/* Electric Glow Behind VS */}
            <motion.div
              className="absolute w-[200px] h-[200px] rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(246,89,253,0.4) 0%, rgba(51,239,255,0.3) 50%, transparent 70%)',
                filter: 'blur(40px)',
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: [1, 1.3, 1],
                opacity: [0.6, 0.9, 0.6],
              }}
              transition={{ 
                delay: 1.0,
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            
            {/* VS Text - Electric Style */}
            <motion.div
              className="relative"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.1, duration: 0.5, ease: "backOut" }}
            >
              {/* Outer Glow Layer */}
              <motion.span
                className="absolute inset-0 text-[180px] font-bebas font-bold italic"
                style={{
                  WebkitTextStroke: '4px rgba(246,89,253,0.5)',
                  color: 'transparent',
                  filter: 'blur(8px)',
                }}
                animate={{
                  filter: ['blur(8px)', 'blur(12px)', 'blur(8px)'],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                VS
              </motion.span>
              
              {/* Main VS Text */}
              <motion.span
                className="relative text-[180px] font-bebas font-bold italic bg-gradient-to-b from-white via-[#33EFFF] to-[#F659FD] bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(51,239,255,0.8)]"
                style={{
                  WebkitTextStroke: '2px rgba(255,255,255,0.3)',
                }}
                animate={{
                  textShadow: [
                    '0 0 20px rgba(51,239,255,0.8), 0 0 40px rgba(246,89,253,0.6)',
                    '0 0 40px rgba(246,89,253,0.8), 0 0 60px rgba(51,239,255,0.6)',
                    '0 0 20px rgba(51,239,255,0.8), 0 0 40px rgba(246,89,253,0.6)',
                  ]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                VS
              </motion.span>
            </motion.div>

            {/* Lightning/Spark Effects */}
            <motion.div
              className="absolute w-2 h-16 bg-gradient-to-b from-[#33EFFF] via-white to-transparent rounded-full"
              style={{ left: '30%', top: '35%', rotate: '-20deg' }}
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ 
                opacity: [0, 1, 0],
                scaleY: [0, 1, 0],
              }}
              transition={{
                delay: 1.3,
                duration: 0.8,
                repeat: Infinity,
                repeatDelay: 2,
              }}
            />
            <motion.div
              className="absolute w-2 h-12 bg-gradient-to-b from-[#F659FD] via-white to-transparent rounded-full"
              style={{ right: '30%', bottom: '35%', rotate: '25deg' }}
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ 
                opacity: [0, 1, 0],
                scaleY: [0, 1, 0],
              }}
              transition={{
                delay: 1.8,
                duration: 0.6,
                repeat: Infinity,
                repeatDelay: 2.5,
              }}
            />
          </motion.div>


          {/* --- PLAYER 2 (RIGHT) --- */}
          {/* Margine stânga redusă la 4 */}
          <motion.div
            className="flex items-end ml-4 relative"
            variants={playerRightVariants}
          >

            {/* Imagine Jucător */}
            <div className="relative w-[320px] h-[420px] z-10 flex flex-col items-center">
              {/* Glow Spate - Pink */}
              <div className="absolute top-10 left-10 right-10 bottom-0 bg-[#F659FD] blur-[80px] opacity-20 rounded-full" />

              <motion.img
                initial={{ opacity: 0, x: 80, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ delay: 0.8, duration: 0.7, ease: "easeOut" }}
                src={player2.img || player2.photoUrl || '/placeholder-player.png'}
                alt={player2.name}
                className="w-full h-full object-cover object-top drop-shadow-2xl relative z-10"
                style={{ maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)' }}
              />

              {/* Name Plate - Below Image, Stacked Vertically */}
              <motion.div
                className="absolute bottom-[-100px] left-1/2 -translate-x-1/2 flex flex-col items-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2, duration: 0.5 }}
              >
                <span className="text-5xl font-bebas text-[#F659FD] leading-none drop-shadow-[0_4px_4px_rgba(0,0,0,1)]">
                  {player2.firstname || player2.name?.split(' ')[0]}
                </span>
                <span className="text-5xl font-bebas text-white leading-none drop-shadow-[0_4px_4px_rgba(0,0,0,1)]">
                  {player2.lastname || player2.name?.split(' ').slice(1).join(' ')}
                </span>
              </motion.div>
            </div>

          </motion.div>

        </div>

      </div>

    </motion.div>
  );
}

export default VersusComparison;
