import { useEffect, useState } from "react";
import { AppState } from "react-native";

import { localDateKey } from "@/data/gita-verses";

function millisecondsUntilTomorrow() {
  const now = new Date();
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return Math.max(1_000, tomorrow.getTime() - now.getTime() + 250);
}

export function useLocalDateKey() {
  const [dateKey, setDateKey] = useState(localDateKey);

  useEffect(() => {
    const refresh = () => setDateKey(localDateKey());
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    const midnight = setTimeout(refresh, millisecondsUntilTomorrow());
    return () => {
      appState.remove();
      clearTimeout(midnight);
    };
  }, [dateKey]);

  return dateKey;
}
