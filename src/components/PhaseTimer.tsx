import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface PhaseTimerProps {
  duration: number;
  onExpire: () => void;
  active: boolean;
  phaseKey: string;
}

const PhaseTimer = ({ duration, onExpire, active, phaseKey }: PhaseTimerProps) => {
  const [remaining, setRemaining] = useState(duration);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;
  const expiredRef = useRef(false);

  useEffect(() => {
    setRemaining(duration);
    expiredRef.current = false;
  }, [duration, phaseKey]);

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!expiredRef.current) {
            expiredRef.current = true;
            setTimeout(() => onExpireRef.current(), 0);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [active, phaseKey]);

  const percentage = (remaining / duration) * 100;
  const isUrgent = remaining <= 5;

  return (
    <div className="flex items-center gap-2 w-full max-w-xs mx-auto">
      <div className="relative w-full h-2 bg-secondary rounded-full overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${isUrgent ? "bg-destructive" : "bg-accent"}`}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <span
        className={`text-xs font-mono font-bold min-w-[2rem] text-right ${
          isUrgent ? "text-destructive animate-pulse" : "text-muted-foreground"
        }`}
      >
        {remaining}s
      </span>
    </div>
  );
};

export default PhaseTimer;
