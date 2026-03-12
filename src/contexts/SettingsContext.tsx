import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Theme = "dark" | "light";

interface Settings {
  soundEnabled: boolean;
  maxRounds: number;
  theme: Theme;
}

interface SettingsContextType extends Settings {
  setSoundEnabled: (v: boolean) => void;
  setMaxRounds: (v: number) => void;
  setTheme: (v: Theme) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const STORAGE_KEY = "exotic-settings";

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...{ soundEnabled: true, maxRounds: 10, theme: "dark" as Theme }, ...JSON.parse(raw) };
  } catch {}
  return { soundEnabled: true, maxRounds: 10, theme: "dark" };
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  // Apply theme class to document
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === "light") {
      root.classList.add("light");
    } else {
      root.classList.remove("light");
    }
  }, [settings.theme]);

  return (
    <SettingsContext.Provider
      value={{
        ...settings,
        setSoundEnabled: (v) => setSettings((s) => ({ ...s, soundEnabled: v })),
        setMaxRounds: (v) => setSettings((s) => ({ ...s, maxRounds: v })),
        setTheme: (v) => setSettings((s) => ({ ...s, theme: v })),
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
