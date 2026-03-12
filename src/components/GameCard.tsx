import { motion } from "framer-motion";

interface GameCardProps {
  text: string;
  type: "black" | "white";
  selected?: boolean;
  onClick?: () => void;
  small?: boolean;
  logo?: boolean;
}

const GameCard = ({ text, type, selected, onClick, small, logo }: GameCardProps) => {
  return (
    <motion.div
      className={`${type === "black" ? "game-card-black" : "game-card-white"} ${
        selected ? "ring-2 ring-accent ring-offset-2 ring-offset-background" : ""
      } ${small ? "!min-w-[120px] !max-w-[140px] sm:!min-w-[140px] sm:!max-w-[160px] !p-2.5 sm:!p-3" : ""} flex flex-col justify-between`}
      onClick={onClick}
      whileHover={onClick ? { y: -6, scale: 1.02 } : {}}
      whileTap={onClick ? { scale: 0.97 } : {}}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
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
  );
};

export default GameCard;
