/**
 * TipeeAlertTier1And2 Component - Local popup alerts for donations and subscriptions
 * Tier 1: 1-10€ donations, no particles
 * Tier 2: 10-30€ donations, with particles
 * Duration: 5 seconds
 * 
 * Design: rounded-full pill style, appears ABOVE SocialCapsule (stânga jos)
 * Colors: member=cyan, sub=pink, dono=gradient pink-cyan
 * Message limit: 130 characters
 */

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Star, UserPlus, DollarSign } from "lucide-react";
import { Particles } from "./Particles";

export interface TipeeAlertTier1And2Props {
  type: "dono" | "member" | "sub";
  user: string;
  amount?: string;
  tier: 1 | 2 | 3;
  platform?: string;
  message?: string;
  onComplete?: () => void;
}

export function TipeeAlertTier1And2({
  type,
  user,
  amount,
  tier,
  message,
  onComplete,
}: TipeeAlertTier1And2Props) {
  
  // Truncate message to 130 characters
  const truncatedMessage = message && message.trim().length > 0 
    ? (message.length > 130 ? message.substring(0, 130) + "..." : message)
    : null;

  const hasMessage = !!truncatedMessage;

  useEffect(() => {
    // Notify parent to unmount after 5 seconds
    // Parent unmounting triggers the exit animation via AnimatePresence
    const timer = setTimeout(() => {
      onComplete?.();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  const isTier2 = tier === 2;
  const isMember = type === "member";
  const isSub = type === "sub";

  // Get background and shadow colors based on type
  const getContainerClasses = () => {
    if (isMember) return "bg-[#33EFFF]/90 border-white/20 shadow-[0_0_30px_rgba(51,239,255,0.4)]";
    if (isSub) return "bg-[#F659FD]/90 border-white/20 shadow-[0_0_30px_rgba(246,89,253,0.4)]";
    return "bg-gradient-to-r from-[#F659FD] to-[#33EFFF] border-white/40 shadow-[0_0_40px_rgba(255,255,255,0.3)]";
  };

  // Get label text based on type
  const getLabel = () => {
    if (isMember) return "NEW YOUTUBE MEMBER";
    if (isSub) return "NEW KICK SUBSCRIBER";
    return "DONATION RECEIVED";
  };

  // Get icon based on type
  const getIcon = () => {
    if (isMember) return <Star size={20} className="text-black" />;
    if (isSub) return <UserPlus size={20} className="text-white" />;
    return <DollarSign size={20} className="text-white" />;
  };

  // Animation Variants
  const variants = {
    hidden: { 
      y: 0, 
      opacity: 0, 
      scale: 0.8 
    },
    visible: { 
      y: hasMessage ? -100 : -72, 
      opacity: 1, 
      scale: isTier2 ? 1.02 : 1, // Redus de la 1.1 la 1.02 pentru rendering curat
      transition: { 
        duration: 0.8, 
        ease: [0.25, 0.1, 0.25, 1] 
      }
    },
    exit: { 
      y: 0, 
      opacity: 0, 
      scale: 0.8,
      transition: { 
        duration: 0.5, 
        ease: "easeIn" // Using easeIn for snappier exit as requested
      }
    }
  };

  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="absolute left-0 bottom-0 z-0 origin-bottom-left transform-gpu will-change-transform"
      style={{ backfaceVisibility: 'hidden', WebkitFontSmoothing: 'antialiased' }}
    >
      {/* PARTICLE EFFECTS FOR TIER 2 */}
      {isTier2 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Particles color="#F659FD" count={20} />
        </div>
      )}

      {/* Main Capsule */}
      <div 
        className={`
          relative flex items-center px-4 rounded-full border backdrop-blur-xl shadow-2xl min-w-[280px] transform-gpu
          ${getContainerClasses()}
          ${tier === 1 ? 'h-14' : 'h-16'}
        `}
        style={{ backfaceVisibility: 'hidden' }}
      >
          
          {/* Icon */}
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-3 animate-bounce shadow-inner">
              {getIcon()}
          </div>

          {/* Text Info */}
          <div className="flex flex-col">
              <span className={`text-[10px] font-black uppercase tracking-widest leading-none mb-0.5 ${isMember ? 'text-black/60' : 'text-black/40'}`}>
                  {getLabel()}
              </span>
              <div className="flex items-baseline gap-2">
                  <span className={`text-2xl font-bebas tracking-wide leading-none pt-1 ${isMember ? 'text-black' : 'text-white'}`}>
                      {user}
                  </span>
                  {amount && (
                      <span className="text-lg font-bebas text-black font-bold leading-none bg-white/40 px-2 py-0.5 rounded shadow-sm">
                          {amount}
                      </span>
                  )}
              </div>
          </div>
      </div>

      {/* Message Bubble (if exists) */}
      {truncatedMessage && (
        <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 -translate-y-full w-full max-w-[320px] px-4">
             <div className="bg-black/80 backdrop-blur-md text-white px-4 py-2 rounded-xl border border-white/20 shadow-lg text-center">
                <span className="text-sm font-montserrat font-medium italic">
                    "{truncatedMessage}"
                </span>
                {/* Sageata jos */}
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-3 h-3 bg-black/80 border-r border-b border-white/20"></div>
             </div>
        </div>
      )}
    </motion.div>
  );
}
