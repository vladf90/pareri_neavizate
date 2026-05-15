/**
 * BrandPopup Component - Smooth mitosis animation extending from SocialCapsule
 * Displays every 45 seconds for 10 seconds duration
 * 
 * Design: Extension that slides out to the RIGHT from SocialCapsule
 * Uses scaleX animation from origin-left for "mitosis" effect
 * 
 * UCL blue theme identical to LiveTicker for visual unity
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Instagram, Youtube } from "lucide-react";
import { TikTokIcon } from "./TikTokIcon";

const smoothTransition = { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] };

export function BrandPopup() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show immediately on mount
    setIsVisible(true);
    const showTimer = setTimeout(() => setIsVisible(false), 10000); // 10s display

    // Repeat every 45 seconds (offset from other cycles)
    const interval = setInterval(() => {
      setIsVisible(true);
      setTimeout(() => setIsVisible(false), 10000);
    }, 45000);

    return () => {
      clearTimeout(showTimer);
      clearInterval(interval);
    };
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ x: 0, opacity: 0, scaleX: 0.5 }}
          animate={{ x: '95%', opacity: 1, scaleX: 1 }}
          exit={{ x: 0, opacity: 0, scaleX: 0.5 }}
          transition={smoothTransition}
          className="absolute bottom-0 left-0 h-16 origin-left z-10 pl-6 pr-6 flex items-center bg-[#0A1B51]/60 backdrop-blur-xl border border-[#33EFFF]/30 rounded-r-full shadow-[0_4px_30px_rgba(0,0,0,0.8)] overflow-hidden min-w-[280px]"
        >
          {/* Gradient Contrast - identical to LiveTicker */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

          <div className="relative z-10 flex items-center justify-between w-full ml-4">
            
            <div className="flex flex-col mr-4">
              <span className="text-[10px] font-bold text-[#33EFFF] uppercase tracking-widest leading-none mb-0.5">
                MAI MULT CONTENT
              </span>
              <span className="text-2xl font-bebas text-[#F5F5F5] tracking-wide leading-none">
                @PARERINEAVIZATE
              </span>
            </div>

            {/* Social Icons - Clean & Minimalist */}
            <div className="flex gap-2">
              {/* TikTok Custom SVG */}
              <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center border border-white/10 shadow hover:scale-110 transition-transform">
                <TikTokIcon className="w-4 h-4 text-white" />
              </div>
              {/* Instagram Minimalist */}
              <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center border border-white/10 shadow hover:scale-110 transition-transform">
                <Instagram size={16} className="text-white" />
              </div>
              {/* Youtube */}
              <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center border border-white/10 shadow hover:scale-110 transition-transform">
                <Youtube size={16} className="text-white" />
              </div>
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
