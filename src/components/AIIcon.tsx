import { motion } from "framer-motion";
import {
  Cpu, FlaskConical, Mountain, Gamepad2, Sparkles, Shield, Brain, BarChart3,
  User, Bot, type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  cpu: Cpu,
  "flask-conical": FlaskConical,
  mountain: Mountain,
  "gamepad-2": Gamepad2,
  sparkles: Sparkles,
  shield: Shield,
  brain: Brain,
  "bar-chart-3": BarChart3,
  user: User,
  bot: Bot,
};

interface AIIconProps {
  icon: string;
  size?: number;
  color?: string;
  className?: string;
  animated?: boolean;
}

const AIIcon = ({ icon, size = 16, color, className = "", animated = true }: AIIconProps) => {
  const IconComponent = iconMap[icon] || Bot;

  if (!animated) {
    return <IconComponent size={size} color={color} className={className} />;
  }

  return (
    <motion.div
      className={`inline-flex items-center justify-center ${className}`}
      whileHover={{ scale: 1.2, rotate: 10 }}
      transition={{ type: "spring", stiffness: 400, damping: 15 }}
    >
      <IconComponent size={size} color={color} />
    </motion.div>
  );
};

export default AIIcon;
