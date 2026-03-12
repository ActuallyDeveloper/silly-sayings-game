import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
  delay: number;
}

const COLORS = [
  "hsl(43, 100%, 50%)", // gold
  "hsl(0, 84%, 60%)",   // red
  "hsl(200, 80%, 60%)", // blue
  "hsl(120, 60%, 50%)", // green
  "hsl(280, 70%, 60%)", // purple
  "hsl(30, 90%, 55%)",  // orange
];

export default function Confetti({ active, big = false }: { active: boolean; big?: boolean }) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!active) { setParticles([]); return; }
    const count = big ? 60 : 30;
    const p: Particle[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -10 - Math.random() * 20,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 4 + Math.random() * 8,
      rotation: Math.random() * 360,
      delay: Math.random() * 0.5,
    }));
    setParticles(p);
    const t = setTimeout(() => setParticles([]), big ? 3000 : 2000);
    return () => clearTimeout(t);
  }, [active, big]);

  return (
    <AnimatePresence>
      {particles.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute rounded-sm"
              style={{
                left: `${p.x}%`,
                width: p.size,
                height: p.size * 0.6,
                backgroundColor: p.color,
              }}
              initial={{ y: `${p.y}vh`, rotate: 0, opacity: 1 }}
              animate={{
                y: "110vh",
                rotate: p.rotation + 720,
                opacity: [1, 1, 0.8, 0],
              }}
              transition={{
                duration: 1.5 + Math.random(),
                delay: p.delay,
                ease: "easeIn",
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}
