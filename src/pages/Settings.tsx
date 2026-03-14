import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useSettings } from "@/contexts/SettingsContext";
import ExoticLogo from "@/components/ExoticLogo";
import PackSelector from "@/components/PackSelector";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ArrowLeft, Volume2, VolumeX, Hash, Sun, Moon } from "lucide-react";

const Settings = () => {
  const navigate = useNavigate();
  const { soundEnabled, setSoundEnabled, maxRounds, setMaxRounds, theme, setTheme, selectedPacks, togglePack } = useSettings();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-border">
        <ExoticLogo size="sm" />
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="text-muted-foreground min-h-[44px]">
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
          {/* Theme toggle */}
          <div className="bg-secondary rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              {theme === "dark" ? (
                <Moon className="w-5 h-5 text-accent" />
              ) : (
                <Sun className="w-5 h-5 text-accent" />
              )}
              <div>
                <Label className="text-foreground font-bold text-base">Theme</Label>
                <p className="text-xs text-muted-foreground">Choose your preferred appearance</p>
              </div>
            </div>
            <ToggleGroup 
              type="single" 
              value={theme} 
              onValueChange={(value) => value && setTheme(value as "dark" | "light")}
              className="w-full"
            >
              <ToggleGroupItem 
                value="dark" 
                aria-label="Dark mode"
                className="flex-1 h-11 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground font-bold"
              >
                <Moon className="w-4 h-4 mr-2" />
                Dark
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="light" 
                aria-label="Light mode"
                className="flex-1 h-11 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground font-bold"
              >
                <Sun className="w-4 h-4 mr-2" />
                Light
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Sound toggle */}
          <div className="bg-secondary rounded-lg p-4 space-y-3">
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
            <ToggleGroup 
              type="single" 
              value={soundEnabled ? "on" : "off"} 
              onValueChange={(value) => value && setSoundEnabled(value === "on")}
              className="w-full"
            >
              <ToggleGroupItem 
                value="on" 
                aria-label="Sound on"
                className="flex-1 h-11 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground font-bold"
              >
                <Volume2 className="w-4 h-4 mr-2" />
                On
              </ToggleGroupItem>
              <ToggleGroupItem 
                value="off" 
                aria-label="Sound off"
                className="flex-1 h-11 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground font-bold"
              >
                <VolumeX className="w-4 h-4 mr-2" />
                Off
              </ToggleGroupItem>
            </ToggleGroup>
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

          {/* Card Packs */}
          <PackSelector selectedPacks={selectedPacks} onTogglePack={togglePack} />
        </motion.div>
      </div>
    </div>
  );
};

export default Settings;
