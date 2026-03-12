import { motion } from "framer-motion";

const ExoticLogo = ({ size = "lg" }: { size?: "sm" | "lg" }) => {
  const isLg = size === "lg";
  return (
    <motion.h1
      className={`font-black tracking-tighter exotic-glow ${
        isLg ? "text-7xl md:text-9xl" : "text-2xl"
      } text-accent`}
      initial={isLg ? { opacity: 0, y: 30 } : {}}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      EXOTIC
    </motion.h1>
  );
};

export default ExoticLogo;
