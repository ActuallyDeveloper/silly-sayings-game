import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import type { PackId } from "@/data/cards";

type Theme = "dark" | "light";

interface Settings {
  soundEnabled: boolean;
  maxRounds: number;
  theme: Theme;
  selectedPacks: PackId[];
}

interface SettingsContextType extends Settings {
  setSoundEnabled: (v: boolean) => void;
  setMaxRounds: (v: number) => void;
  setTheme: (v: Theme) => void;
  setSelectedPacks: (v: PackId[]) => void;
  togglePack: (pack: PackId) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const STORAGE_KEY = "exotic-settings";

const defaultSettings: Settings = {
  soundEnabled: true,
  maxRounds: 10,
  theme: "dark",
  selectedPacks: ["classic"],
};

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {}
  return defaultSettings;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === "light") {
      root.classList.add("light");
    } else {
      root.classList.remove("light");
    }
  }, [settings.theme]);

  const togglePack = (pack: PackId) => {
    setSettings((s) => {
      const current = s.selectedPacks;
      if (current.includes(pack)) {
        if (current.length <= 1) return s; // Must have at least 1
        return { ...s, selectedPacks: current.filter((p) => p !== pack) };
      }
      return { ...s, selectedPacks: [...current, pack] };
    });
  };

  return (
    <SettingsContext.Provider
      value={{
        ...settings,
        setSoundEnabled: (v) => setSettings((s) => ({ ...s, soundEnabled: v })),
        setMaxRounds: (v) => setSettings((s) => ({ ...s, maxRounds: v })),
        setTheme: (v) => setSettings((s) => ({ ...s, theme: v })),
        setSelectedPacks: (v) => setSettings((s) => ({ ...s, selectedPacks: v })),
        togglePack,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
