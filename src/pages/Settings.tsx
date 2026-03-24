import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useSettings } from "@/contexts/SettingsContext";
import ExoticLogo from "@/components/ExoticLogo";
import PackSelector from "@/components/PackSelector";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Volume2, VolumeX, Sun, Moon, Timer } from "lucide-react";

const ToggleButton = ({
  activeLabel,
  inactiveLabel,
  activeIcon: ActiveIcon,
  inactiveIcon: InactiveIcon,
  isActive,
  onToggle,
}: {
  activeLabel: string;
  inactiveLabel: string;
  activeIcon: React.ElementType;
  inactiveIcon: React.ElementType;
  isActive: boolean;
  onToggle: () => void;
}) => (
  <div className="flex gap-2">
    <button
      onClick={() => isActive && onToggle()}
      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-bold min-h-[48px] transition-all active:scale-95 ${
        !isActive
          ? "bg-accent text-accent-foreground shadow-md"
          : "bg-secondary text-muted-foreground hover:bg-secondary/80"
      }`}
    >
      <InactiveIcon className="w-4 h-4" />
      {inactiveLabel}
    </button>
    <button
      onClick={() => !isActive && onToggle()}
      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-bold min-h-[48px] transition-all active:scale-95 ${
        isActive
          ? "bg-accent text-accent-foreground shadow-md"
          : "bg-secondary text-muted-foreground hover:bg-secondary/80"
      }`}
    >
      <ActiveIcon className="w-4 h-4" />
      {activeLabel}
    </button>
  </div>
);

const TIMER_OPTIONS = [15, 30, 45, 60];

const Settings = () => {
  const navigate = useNavigate();
  const { soundEnabled, setSoundEnabled, theme, setTheme, selectedPacks, selectPack, judgingTimer, setJudgingTimer } = useSettings();

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
          {/* Theme toggle */}
          <div className="space-y-3">
            <Label className="text-foreground font-bold text-base flex items-center gap-2">
              {theme === "dark" ? <Moon className="w-5 h-5 text-accent" /> : <Sun className="w-5 h-5 text-accent" />}
              Theme
            </Label>
            <ToggleButton
              activeLabel="Light"
              inactiveLabel="Dark"
              activeIcon={Sun}
              inactiveIcon={Moon}
              isActive={theme === "light"}
              onToggle={() => setTheme(theme === "dark" ? "light" : "dark")}
            />
          </div>

          {/* Sound toggle */}
          <div className="space-y-3">
            <Label className="text-foreground font-bold text-base flex items-center gap-2">
              {soundEnabled ? <Volume2 className="w-5 h-5 text-accent" /> : <VolumeX className="w-5 h-5 text-muted-foreground" />}
              Sound Effects
            </Label>
            <ToggleButton
              activeLabel="On"
              inactiveLabel="Off"
              activeIcon={Volume2}
              inactiveIcon={VolumeX}
              isActive={soundEnabled}
              onToggle={() => setSoundEnabled(!soundEnabled)}
            />
          </div>

          {/* Judging Timer */}
          <div className="space-y-3">
            <Label className="text-foreground font-bold text-base flex items-center gap-2">
              <Timer className="w-5 h-5 text-accent" />
              Judging Timer
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {TIMER_OPTIONS.map((t) => (
                <button
                  key={t}
                  onClick={() => setJudgingTimer(t)}
                  className={`py-2.5 rounded-lg text-sm font-bold min-h-[44px] transition-all active:scale-95 ${
                    judgingTimer === t
                      ? "bg-accent text-accent-foreground shadow-md"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                  }`}
                >
                  {t}s
                </button>
              ))}
            </div>
          </div>

          {/* Game Mode (single-select pack) */}
          <PackSelector selectedPacks={selectedPacks} onSelectPack={selectPack} singleSelect />
        </motion.div>
      </div>
    </div>
  );
};

export default Settings;
