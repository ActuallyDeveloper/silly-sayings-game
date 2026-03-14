import { motion } from "framer-motion";

interface TypingIndicatorProps {
  names?: string[];
  color?: string;
  size?: "sm" | "md";
}

const TypingIndicator = ({ names = [], color, size = "sm" }: TypingIndicatorProps) => {
  const dotSize = size === "sm" ? "w-1.5 h-1.5" : "w-2 h-2";
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";
  
  const label = names.length === 0 
    ? "Someone is typing" 
    : names.length === 1 
      ? `${names[0]} is typing`
      : names.length === 2
        ? `${names[0]} and ${names[1]} are typing`
        : `${names[0]} and ${names.length - 1} others are typing`;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-0.5 bg-muted/60 rounded-full px-2.5 py-1.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className={`${dotSize} rounded-full`}
            style={{ backgroundColor: color || "hsl(var(--muted-foreground))" }}
            animate={{
              y: [0, -4, 0],
              opacity: [0.4, 1, 0.4],
              scale: [0.8, 1.1, 0.8],
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
      <motion.span
        className={`${textSize} text-muted-foreground font-medium`}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        {label}...
      </motion.span>
    </div>
  );
};

export default TypingIndicator;
