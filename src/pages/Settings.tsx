import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useSettings } from "@/contexts/SettingsContext";
import ExoticLogo from "@/components/ExoticLogo";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Volume2, VolumeX, Hash } from "lucide-react";

const Settings = () => {
  const navigate = useNavigate();
  const { soundEnabled, setSoundEnabled, maxRounds, setMaxRounds } = useSettings();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-border">
        <ExoticLogo size="sm" />
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-muted-foreground">
          <ArrowLeft className="w-4 h-4 mr-1" /> Home
        </Button>
      </header>

      <div className="flex-1 max-w-md mx-auto w-full px-4 py-8">
        <motion.h1
          className="text-4xl font-black text-foreground mb-8"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Settings
        </motion.h1>

        <motion.div
          className="space-y-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Sound toggle */}
          <div className="flex items-center justify-between bg-secondary rounded-lg p-4">
            <div className="flex items-center gap-3">
              {soundEnabled ? (
                <Volume2 className="w-5 h-5 text-accent" />
              ) : (
                <VolumeX className="w-5 h-5 text-muted-foreground" />
              )}
              <div>
                <Label className="text-foreground font-bold text-base">Sound Effects</Label>
                <p className="text-xs text-muted-foreground">Play sounds during gameplay</p>
              </div>
            </div>
            <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} />
          </div>

          {/* Rounds slider */}
          <div className="bg-secondary rounded-lg p-4 space-y-4">
            <div className="flex items-center gap-3">
              <Hash className="w-5 h-5 text-accent" />
              <div>
                <Label className="text-foreground font-bold text-base">Game Rounds</Label>
                <p className="text-xs text-muted-foreground">Number of rounds per game</p>
              </div>
              <span className="ml-auto text-2xl font-black text-accent">{maxRounds}</span>
            </div>
            <Slider
              value={[maxRounds]}
              onValueChange={([v]) => setMaxRounds(v)}
              min={3}
              max={20}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>3</span>
              <span>20</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Settings;
