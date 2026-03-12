import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface LobbyCountdownProps {
  active: boolean;
  onComplete: () => void;
}

const LobbyCountdown = ({ active, onComplete }: LobbyCountdownProps) => {
  const [count, setCount] = useState<number | string | null>(null);

  useEffect(() => {
    if (!active) {
      setCount(null);
      return;
    }
    setCount(3);
    const t1 = setTimeout(() => setCount(2), 1000);
    const t2 = setTimeout(() => setCount(1), 2000);
    const t3 = setTimeout(() => setCount("GO!"), 3000);
    const t4 = setTimeout(() => onComplete(), 3800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [active, onComplete]);

  if (!active || count === null) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={String(count)}
          className={`font-black ${count === "GO!" ? "text-accent text-8xl sm:text-9xl" : "text-foreground text-9xl sm:text-[12rem]"}`}
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 2, opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {count}
        </motion.span>
      </AnimatePresence>
    </motion.div>
  );
};

export default LobbyCountdown;
