/**
 * Particles Component - Spark effects for alert animations
 * Used in Tier 2 and Tier 3 alerts
 */

import { motion } from "framer-motion";

interface ParticlesProps {
  color?: string;
  count?: number;
}

export function Particles({ color = "#FFD700", count = 20 }: ParticlesProps) {
  const particles = Array.from({ length: count }).map((_, i) => ({
    id: i,
    x: Math.random() * 400 - 200,
    y: Math.random() * 200 - 250,
    scale: Math.random() * 0.8 + 0.2,
    duration: Math.random() * 1 + 0.5,
  }));

  return (
    <>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{ x: 0, y: 0, opacity: 1, scale: p.scale }}
          animate={{ x: p.x, y: p.y, opacity: 0 }}
          transition={{ duration: p.duration, ease: "easeOut" }}
          className="absolute z-0 w-2 h-2 rounded-full shadow-[0_0_10px_currentColor]"
          style={{ backgroundColor: color, left: "50%", top: "50%" }}
        />
      ))}
    </>
  );
}
