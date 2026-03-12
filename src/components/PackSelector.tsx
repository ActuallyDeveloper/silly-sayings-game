import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { CardPack, cardPacks, type PackId } from "@/data/cards";
import { Layers, Heart, Flame, Clapperboard, Pencil, type LucideIcon } from "lucide-react";

const packIcons: Record<string, LucideIcon> = {
  layers: Layers, heart: Heart, flame: Flame, clapperboard: Clapperboard, pencil: Pencil,
};

interface PackSelectorProps {
  selectedPacks: PackId[];
  onTogglePack: (packId: PackId) => void;
}

const PackSelector = ({ selectedPacks, onTogglePack }: PackSelectorProps) => {
  return (
    <div className="space-y-3 w-full max-w-sm">
      <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Card Packs</p>
      <div className="grid grid-cols-2 gap-2">
        {cardPacks.map((pack) => {
          const isSelected = selectedPacks.includes(pack.id);
          const Icon = packIcons[pack.iconName] || Layers;
          return (
            <motion.button
              key={pack.id}
              onClick={() => onTogglePack(pack.id)}
              className={`relative rounded-lg p-3 text-left transition-all border-2 ${
                isSelected
                  ? "border-accent bg-accent/10"
                  : "border-border bg-secondary/50 opacity-60"
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4 text-accent" />
                <span className="font-bold text-sm text-foreground">{pack.name}</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight">{pack.description}</p>
              <Badge variant="outline" className="mt-2 text-[10px] border-muted-foreground/30">
                {pack.blackCount}B / {pack.whiteCount}W
              </Badge>
            </motion.button>
          );
        })}
      </div>
      {selectedPacks.length === 0 && (
        <p className="text-xs text-destructive text-center">Select at least one pack</p>
      )}
    </div>
  );
};

export default PackSelector;
