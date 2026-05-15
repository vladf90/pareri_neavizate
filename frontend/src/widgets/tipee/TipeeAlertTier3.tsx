/**
 * TipeeAlertTier3 Component - Huge centered widget for large donations (30€+)
 * Duration: 8 seconds
 * 
 * Design: "NE-AI OMENIT" label, centered on screen
 * Message limit: 130 characters
 * Strong exit animation
 */

import { useEffect } from "react";
import { motion } from "framer-motion";
import { DollarSign } from "lucide-react";
import { Particles } from "./Particles";

export interface TipeeAlertTier3Props {
  user: string;
  amount: string;
  message?: string;
  onComplete?: () => void;
}

export function TipeeAlertTier3({ user, amount, message, onComplete }: TipeeAlertTier3Props) {
  
  useEffect(() => {
    // 8 seconds display
    const timer = setTimeout(() => {
      onComplete?.();
    }, 8000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  const containerVariants = {
    hidden: { 
        x: -800, // Approximate position of SocialCapsule (bottom-left) relative to center
        y: 450, 
        scale: 0, 
        opacity: 0 
    },
    visible: { 
        x: 0, 
        y: 0, 
        scale: 1, // Redus de la 1.5 la 1 pentru rendering curat (mărimea e în CSS)
        opacity: 1, 
        transition: { 
            duration: 1.2, 
            ease: [0.16, 1, 0.3, 1] 
        }
    },
    exit: { 
        x: -800, 
        y: 450, 
        scale: 0, 
        opacity: 0,
        transition: { 
            duration: 0.8, 
            ease: "easeIn"
        }
    }
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
        {/* Backdrop */}
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
        />

        {/* Main Widget - dimensiuni mărite (compensare pentru scale: 1 în loc de 1.5) */}
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative flex flex-col items-center justify-center min-w-[600px] transform-gpu will-change-transform"
            style={{ backfaceVisibility: 'hidden', WebkitFontSmoothing: 'antialiased' }}
        >
                {/* Particles */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <Particles color="#F659FD" count={30} />
                    <Particles color="#33EFFF" count={30} />
                    <Particles color="#FFFFFF" count={20} />
                </div>
                
                {/* MASCĂ PENTRU FUNDAL ȘI BORDURĂ (CU Overflow Hidden) */}
                <div 
                    className="absolute inset-0 bg-[#0A1B51]/60 backdrop-blur-2xl border-2 border-[#33EFFF] rounded-[40px] shadow-[0_0_100px_rgba(51,239,255,0.5)] overflow-hidden transform-gpu"
                    style={{ backfaceVisibility: 'hidden' }}
                >
                    {/* Gradient Intern */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-80 pointer-events-none" />
                </div>
                
                {/* ICONIȚA (În afara măștii, deasupra) - mărit pentru vizibilitate */}
                <div className="absolute -top-14 left-0 right-0 mx-auto w-32 h-32 bg-gradient-to-br from-[#33EFFF] to-[#F659FD] rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.6)] border-4 border-[#0A1B51] animate-bounce z-20 transform-gpu">
                    <DollarSign size={64} className="text-white" />
                </div>

                {/* CONTENT (Peste mască) - padding mărit */}
                <div className="relative z-10 flex flex-col items-center px-16 py-12 pt-20">
                    <span className="text-[#33EFFF] font-montserrat font-black tracking-[0.4em] text-base mb-3 uppercase drop-shadow-md">
                        NE-AI OMENIT!
                    </span>
                    
                    <h1 className="text-9xl font-bebas text-white drop-shadow-[0_4px_0_rgba(0,0,0,1)] mb-5 leading-none">
                        {amount}
                    </h1>
                    
                    <div className="bg-white/10 px-10 py-3 rounded-full border border-white/20 backdrop-blur-md transform-gpu">
                        <span className="text-4xl font-bebas text-[#F659FD] tracking-wide">
                            {user}
                        </span>
                    </div>

                    {message && (
                        <div className="mt-8 max-w-[85%] text-center">
                             <p className="text-2xl text-white font-montserrat font-bold leading-tight drop-shadow-md break-words">
                                "{message}"
                            </p>
                        </div>
                    )}
                </div>
        </motion.div>
    </div>
  );
}
