import { motion } from "framer-motion";
import { Crown, Trophy } from "lucide-react";

interface WinnerRevealProps {
  winnerName: string;
  isPlayer?: boolean;
}

const WinnerReveal = ({ winnerName, isPlayer }: WinnerRevealProps) => {
  return (
    <motion.div
      className="flex flex-col items-center gap-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        initial={{ rotateY: 180, scale: 0.5, opacity: 0 }}
        animate={{ rotateY: 0, scale: 1, opacity: 1 }}
        transition={{
          duration: 0.8,
          type: "spring",
          stiffness: 200,
          damping: 15,
          delay: 0.2,
        }}
        style={{ perspective: 1000 }}
      >
        <div className="flex items-center gap-3 bg-accent/10 border-2 border-accent/30 rounded-2xl px-6 py-4">
          <motion.div
            animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            {isPlayer ? (
              <Crown className="w-8 h-8 text-accent" />
            ) : (
              <Trophy className="w-8 h-8 text-accent" />
            )}
          </motion.div>
          <div>
            <motion.p
              className="text-[10px] font-bold uppercase tracking-widest text-accent/70"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              Round Winner
            </motion.p>
            <motion.p
              className="text-2xl sm:text-3xl font-black text-accent"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, type: "spring" }}
            >
              {winnerName}
            </motion.p>
          </div>
        </div>
      </motion.div>

      {/* Sparkle particles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-accent"
          initial={{
            opacity: 0,
            x: 0,
            y: 0,
            scale: 0,
          }}
          animate={{
            opacity: [0, 1, 0],
            x: Math.cos((i / 6) * Math.PI * 2) * 80,
            y: Math.sin((i / 6) * Math.PI * 2) * 80,
            scale: [0, 1.5, 0],
          }}
          transition={{
            duration: 1,
            delay: 0.5 + i * 0.08,
            ease: "easeOut",
          }}
        />
      ))}
    </motion.div>
  );
};

export default WinnerReveal;
