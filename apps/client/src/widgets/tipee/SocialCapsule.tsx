/**
 * SocialCapsule Component - Instagram rotation with loading bar
 * Cycles through personal Instagram handles every 7 seconds (offset from ticker 5s)
 * 
 * Uses UCL blue theme identical to LiveTicker for visual unity
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Instagram } from "lucide-react";

const personalInstas = [
  { handle: "@anduu.98", name: "ANDU" },
  { handle: "@tibi.cretu", name: "TIBI" },
  { handle: "@liviuvulpescu", name: "LIVIU" },
];

const CYCLE_DURATION = 7000; // 7 seconds - offset from ticker's 5s

const smoothTransition = { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] };

export function SocialCapsule() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % personalInstas.length);
    }, CYCLE_DURATION);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative z-20 h-16 bg-black/60 backdrop-blur-md border border-[#33EFFF]/30 rounded-full flex items-center pl-2 pr-6 shadow-[0_4px_30px_rgba(0,0,0,0.8)] overflow-hidden min-w-[240px]">
      {/* Gradient Contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

      {/* Minimalist Instagram Icon (White on Black) */}
      <div className="relative z-10 w-12 h-12 rounded-full bg-black flex items-center justify-center shadow-lg border border-white/10 mr-4">
        <Instagram size={24} className="text-white" />
      </div>

      {/* Text Rotativ */}
      <div className="relative z-10 flex flex-col justify-center h-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ ...smoothTransition, stiffness: 100 }}
            className="flex flex-col"
          >
            <span className="text-[10px] font-bold text-[#33EFFF] uppercase tracking-widest leading-none mb-0.5">
              DA ȘI TU UN FOLLOW
            </span>
            <span className="text-2xl font-bebas text-[#F5F5F5] tracking-wide leading-none">
              {personalInstas[currentIndex].handle}
            </span>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Loading Bar */}
      <motion.div
        key={currentIndex}
        initial={{ width: "0%" }}
        animate={{ width: "100%" }}
        transition={{ duration: CYCLE_DURATION / 1000, ease: "linear" }}
        className="absolute bottom-0 left-0 h-[2px] bg-[#33EFFF]/50"
      />
    </div>
  );
}
