import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Users, Target, Sparkles } from "lucide-react";

interface GameConfigProps {
  aiPlayerCount: number;
  onAiPlayerCountChange: (v: number) => void;
  pointsToWin: number;
  onPointsToWinChange: (v: number) => void;
  minAi?: number;
  maxAi?: number;
  aiRequired?: boolean;
  useAiGeneratedCards?: boolean;
  onUseAiGeneratedCardsChange?: (v: boolean) => void;
  // Keep rounds for backward compat but optional
  rounds?: number;
  onRoundsChange?: (v: number) => void;
}

const GameConfig = ({
  aiPlayerCount,
  onAiPlayerCountChange,
  pointsToWin,
  onPointsToWinChange,
  minAi = 2,
  maxAi = 7,
  useAiGeneratedCards = false,
  onUseAiGeneratedCardsChange,
}: GameConfigProps) => {
  return (
    <div className="space-y-4 w-full max-w-sm">
      <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Game Config</p>

      {/* AI Players */}
      <div className="bg-secondary rounded-lg p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-accent" />
          <Label className="text-foreground font-bold text-sm">AI Players</Label>
          <span className="ml-auto text-xl font-black text-accent">{aiPlayerCount}</span>
        </div>
        <Slider
          value={[aiPlayerCount]}
          onValueChange={([v]) => onAiPlayerCountChange(v)}
          min={minAi}
          max={maxAi}
          step={1}
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{minAi}</span>
          <span>{maxAi}</span>
        </div>
      </div>

      {/* Points to Win */}
      <div className="bg-secondary rounded-lg p-3 space-y-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-accent" />
          <Label className="text-foreground font-bold text-sm">Points to Win</Label>
          <span className="ml-auto text-xl font-black text-accent">{pointsToWin}</span>
        </div>
        <Slider
          value={[pointsToWin]}
          onValueChange={([v]) => onPointsToWinChange(v)}
          min={1}
          max={20}
          step={1}
        />
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>1</span>
          <span>20</span>
        </div>
      </div>

      {/* AI Generated Cards Toggle */}
      {onUseAiGeneratedCardsChange && (
        <div className="flex items-center justify-between bg-secondary rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            <div>
              <Label className="text-foreground font-bold text-sm">AI Generated Cards</Label>
              <p className="text-[10px] text-muted-foreground">Use AI to create unique cards each game</p>
            </div>
          </div>
          <Switch checked={useAiGeneratedCards} onCheckedChange={onUseAiGeneratedCardsChange} />
        </div>
      )}
    </div>
  );
};

export default GameConfig;
