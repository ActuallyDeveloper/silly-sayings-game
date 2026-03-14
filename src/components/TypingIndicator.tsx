import { motion, AnimatePresence } from "framer-motion";

interface TypingIndicatorProps {
  names?: string[];
  color?: string;
  size?: "sm" | "md" | "lg";
  variant?: "dots" | "wave" | "pulse";
  showNames?: boolean;
}

const TypingIndicator = ({ 
  names = [], 
  color, 
  size = "sm", 
  variant = "wave",
  showNames = true 
}: TypingIndicatorProps) => {
  const sizeConfig = {
    sm: { dot: "w-1.5 h-1.5", text: "text-[10px]", gap: "gap-0.5", px: "px-2.5", py: "py-1.5" },
    md: { dot: "w-2 h-2", text: "text-xs", gap: "gap-1", px: "px-3", py: "py-2" },
    lg: { dot: "w-2.5 h-2.5", text: "text-sm", gap: "gap-1.5", px: "px-4", py: "py-2.5" },
  };
  
  const config = sizeConfig[size];
  
  const label = names.length === 0 
    ? "Someone is typing" 
    : names.length === 1 
      ? `${names[0]} is typing`
      : names.length === 2
        ? `${names[0]} and ${names[1]} are typing`
        : `${names[0]} and ${names.length - 1} others are typing`;

  const dotColor = color || "hsl(var(--muted-foreground))";

  // Wave animation - dots move up and down in sequence
  const waveAnimation = {
    animate: (i: number) => ({
      y: [0, -6, 0],
      scale: [1, 1.2, 1],
    }),
    transition: (i: number) => ({
      duration: 0.6,
      repeat: Infinity,
      delay: i * 0.1,
      ease: "easeInOut",
    }),
  };

  // Pulse animation - dots scale up and down together
  const pulseAnimation = {
    animate: {
      scale: [1, 1.3, 1],
      opacity: [0.5, 1, 0.5],
    },
    transition: (i: number) => ({
      duration: 0.8,
      repeat: Infinity,
      delay: i * 0.15,
      ease: "easeInOut",
    }),
  };

  // Dots animation - classic bouncing dots
  const dotsAnimation = {
    animate: (i: number) => ({
      y: [0, -4, 0],
      opacity: [0.4, 1, 0.4],
      scale: [0.8, 1.1, 0.8],
    }),
    transition: (i: number) => ({
      duration: 0.8,
      repeat: Infinity,
      delay: i * 0.15,
      ease: "easeInOut",
    }),
  };

  const animations = {
    wave: waveAnimation,
    pulse: pulseAnimation,
    dots: dotsAnimation,
  };

  const currentAnimation = animations[variant];

  return (
    <AnimatePresence>
      <motion.div 
        className="flex items-center gap-2"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        transition={{ duration: 0.2 }}
      >
        <div className={`flex items-center ${config.gap} bg-muted/60 rounded-full ${config.px} ${config.py}`}>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className={`${config.dot} rounded-full`}
              style={{ backgroundColor: dotColor }}
              custom={i}
              animate={typeof currentAnimation.animate === "function" 
                ? currentAnimation.animate(i) 
                : currentAnimation.animate}
              transition={currentAnimation.transition(i)}
            />
          ))}
        </div>
        {showNames && (
          <motion.span
            className={`${config.text} text-muted-foreground font-medium`}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            {label}...
          </motion.span>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

// Compact version for inline use
export const InlineTypingIndicator = ({ color }: { color?: string }) => (
  <span className="inline-flex items-center gap-0.5 align-middle">
    {[0, 1, 2].map((i) => (
      <motion.span
        key={i}
        className="w-1 h-1 rounded-full bg-current"
        style={{ color: color || "hsl(var(--muted-foreground))" }}
        animate={{
          y: [0, -2, 0],
          opacity: [0.3, 1, 0.3],
        }}
        transition={{
          duration: 0.5,
          repeat: Infinity,
          delay: i * 0.1,
          ease: "easeInOut",
        }}
      />
    ))}
  </span>
);

export default TypingIndicator;
