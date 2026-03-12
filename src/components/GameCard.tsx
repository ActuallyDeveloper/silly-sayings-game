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
}

const GameCard = ({ text, type, selected, onClick, small, logo, flipped, flipDelay = 0 }: GameCardProps) => {
  const [hasFlipped, setHasFlipped] = useState(false);

  // If flipped prop is used, show card back initially then flip to reveal
  const showFlip = flipped !== undefined;

  return (
    <div className={`perspective-1000 ${small ? "min-w-[120px] max-w-[140px] sm:min-w-[140px] sm:max-w-[160px]" : ""}`}>
      <motion.div
        className={`${type === "black" ? "game-card-black" : "game-card-white"} ${
          selected ? "ring-2 ring-accent ring-offset-2 ring-offset-background" : ""
        } ${small ? "!min-w-[120px] !max-w-[140px] sm:!min-w-[140px] sm:!max-w-[160px] !p-2.5 sm:!p-3" : ""} flex flex-col justify-between card-flip-inner`}
        onClick={onClick}
        whileHover={onClick ? { y: -6, scale: 1.02 } : {}}
        whileTap={onClick ? { scale: 0.97 } : {}}
        layout
        initial={showFlip ? { rotateY: 180, opacity: 0 } : { opacity: 0, y: 20 }}
        animate={showFlip
          ? { rotateY: hasFlipped || !flipped ? 0 : 180, opacity: 1 }
          : { opacity: 1, y: 0 }
        }
        transition={showFlip
          ? { duration: 0.6, delay: flipDelay, type: "spring", stiffness: 200, damping: 20 }
          : { duration: 0.3 }
        }
        onAnimationComplete={() => {
          if (showFlip && flipped) setHasFlipped(true);
        }}
        style={{ transformStyle: "preserve-3d", backfaceVisibility: "hidden" }}
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
