import { motion } from "framer-motion";
import { useState } from "react";

interface GameCardProps {
  text: string;
  type: "black" | "white";
  selected?: boolean;
  onClick?: () => void;
  small?: boolean;
  logo?: boolean;
  flipped?: boolean;
  flipDelay?: number;
  dealDelay?: number;
  shuffle?: boolean;
}

const GameCard = ({ text, type, selected, onClick, small, logo, flipped, flipDelay = 0, dealDelay, shuffle }: GameCardProps) => {
  const [hasFlipped, setHasFlipped] = useState(false);

  const showFlip = flipped !== undefined;

  // Shuffle: slide in from random offset with rotation
  const shuffleInitial = shuffle
    ? { opacity: 0, x: (Math.random() - 0.5) * 120, y: -60, rotateZ: (Math.random() - 0.5) * 30, scale: 0.8 }
    : undefined;
  const shuffleAnimate = shuffle
    ? { opacity: 1, x: 0, y: 0, rotateZ: 0, scale: 1 }
    : undefined;

  // Deal: fan in from bottom
  const dealInitial = dealDelay !== undefined && !shuffle
    ? { opacity: 0, y: 40, scale: 0.9 }
    : undefined;
  const dealAnimate = dealDelay !== undefined && !shuffle
    ? { opacity: 1, y: 0, scale: 1 }
    : undefined;

  const customInitial = shuffleInitial || dealInitial;
  const customAnimate = shuffleAnimate || dealAnimate;
  const customDelay = dealDelay !== undefined ? dealDelay * 0.07 : 0;

  return (
    <div className={`perspective-1000 shrink-0 ${small ? "w-[130px] h-[160px] sm:w-[150px] sm:h-[180px]" : "w-[180px] h-[230px] sm:w-[220px] sm:h-[270px]"}`}>
      <motion.div
        className={`${type === "black" ? "game-card-black" : "game-card-white"} ${
          selected ? "ring-2 ring-accent ring-offset-2 ring-offset-background" : ""
        } ${small ? "p-2.5 sm:p-3" : "p-3 sm:p-5"} flex flex-col justify-between rounded-xl`}
        onClick={onClick}
        whileHover={onClick ? { y: -6, scale: 1.02 } : {}}
        whileTap={onClick ? { scale: 0.97 } : {}}
        initial={
          showFlip
            ? { rotateY: 180, opacity: 0 }
            : customInitial || { opacity: 0, y: 20 }
        }
        animate={
          showFlip
            ? { rotateY: hasFlipped || !flipped ? 0 : 180, opacity: 1 }
            : customAnimate || { opacity: 1, y: 0 }
        }
        transition={
          showFlip
            ? { duration: 0.6, delay: flipDelay, type: "spring", stiffness: 200, damping: 20 }
            : customInitial
              ? { duration: 0.4, delay: customDelay, type: "spring", stiffness: 200, damping: 22 }
              : { duration: 0.3 }
        }
        onAnimationComplete={() => {
          if (showFlip && flipped) setHasFlipped(true);
        }}
        style={{
          ...(showFlip ? { transformStyle: "preserve-3d" as const, backfaceVisibility: "hidden" as const } : {}),
          visibility: "visible" as const,
        }}
      >
        <p className={`font-extrabold leading-tight ${small ? "text-xs sm:text-sm" : "text-base sm:text-lg"}`}>
          {text}
        </p>
        {logo && (
          <div className="mt-auto pt-3 sm:pt-4">
            <p className={`font-black tracking-wider ${small ? "text-[10px] sm:text-xs" : "text-xs sm:text-sm"} ${
              type === "black" ? "text-muted-foreground" : "opacity-40"
            }`}>
              EXOTIC
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default GameCard;
