import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface Settings {
  soundEnabled: boolean;
  maxRounds: number;
}

interface SettingsContextType extends Settings {
  setSoundEnabled: (v: boolean) => void;
  setMaxRounds: (v: number) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const STORAGE_KEY = "exotic-settings";

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...{ soundEnabled: true, maxRounds: 10 }, ...JSON.parse(raw) };
  } catch {}
  return { soundEnabled: true, maxRounds: 10 };
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  return (
    <SettingsContext.Provider
      value={{
        ...settings,
        setSoundEnabled: (v) => setSettings((s) => ({ ...s, soundEnabled: v })),
        setMaxRounds: (v) => setSettings((s) => ({ ...s, maxRounds: v })),
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
