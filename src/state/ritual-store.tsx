import AsyncStorage from "@react-native-async-storage/async-storage";
import { toneLabel } from "../../shared/content";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  configTime,
  migrateLegacyAlarm,
  type AlarmDayId,
} from "@/services/alarm";

type RitualState = {
  alarmTime: string;
  setAlarmTime: (value: string) => void;
  alarmTone: string;
  setAlarmTone: (value: string) => void;
  alarmDays: AlarmDayId[];
  setAlarmDays: (value: AlarmDayId[]) => void;
  alarmEnabled: boolean;
  setAlarmEnabled: (value: boolean) => void;
  alarmReady: boolean;
  reflection: string;
  setReflection: (value: string) => void;
};

type PersistedAlarm = Pick<
  RitualState,
  "alarmTime" | "alarmTone" | "alarmDays" | "alarmEnabled"
>;

const ALARM_SETTINGS_KEY = "morning-ritual:alarm-settings";
const DEFAULT_DAYS: AlarmDayId[] = ["mon", "tue", "wed", "thu", "fri", "sat"];
const Context = createContext<RitualState | null>(null);

export function RitualProvider({ children }: PropsWithChildren) {
  const [alarmTime, setAlarmTime] = useState("06:30");
  const [alarmTone, setAlarmTone] = useState("Raag Bhairav & Sacred Flute");
  const [alarmDays, setAlarmDays] = useState<AlarmDayId[]>(DEFAULT_DAYS);
  const [alarmEnabled, setAlarmEnabled] = useState(false);
  const [alarmReady, setAlarmReady] = useState(false);
  const [reflection, setReflection] = useState(
    "Warm sunlight on my balcony while reciting morning Gayatri mantra; peaceful, unhurried conversation with mother over ginger tea.",
  );

  useEffect(() => {
    AsyncStorage.getItem(ALARM_SETTINGS_KEY)
      .then(async (value) => {
        const saved = value
          ? (JSON.parse(value) as Partial<PersistedAlarm>)
          : {};
        const native = await migrateLegacyAlarm(saved);
        if (native) {
          setAlarmTime(configTime(native));
          setAlarmTone(toneLabel(native.tone.key ?? "gita"));
          setAlarmDays(native.weekdays);
          setAlarmEnabled(native.enabled);
          return;
        }
        if (typeof saved.alarmTime === "string") setAlarmTime(saved.alarmTime);
        if (typeof saved.alarmTone === "string") setAlarmTone(saved.alarmTone);
        if (Array.isArray(saved.alarmDays)) setAlarmDays(saved.alarmDays);
        if (typeof saved.alarmEnabled === "boolean") setAlarmEnabled(saved.alarmEnabled);
      })
      .catch(() => undefined)
      .finally(() => setAlarmReady(true));
  }, []);

  useEffect(() => {
    if (!alarmReady) return;
    const settings: PersistedAlarm = {
      alarmTime,
      alarmTone,
      alarmDays,
      alarmEnabled,
    };
    AsyncStorage.setItem(ALARM_SETTINGS_KEY, JSON.stringify(settings)).catch(
      () => undefined,
    );
  }, [alarmDays, alarmEnabled, alarmReady, alarmTime, alarmTone]);

  const value = useMemo(
    () => ({
      alarmTime,
      setAlarmTime,
      alarmTone,
      setAlarmTone,
      alarmDays,
      setAlarmDays,
      alarmEnabled,
      setAlarmEnabled,
      alarmReady,
      reflection,
      setReflection,
    }),
    [alarmDays, alarmEnabled, alarmReady, alarmTime, alarmTone, reflection],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useRitual() {
  const context = useContext(Context);
  if (!context) throw new Error("Missing RitualProvider");
  return context;
}
