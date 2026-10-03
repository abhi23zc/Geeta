export type ReliabilityStep = { id: string; label: string; guidance: string; settings: "autostart" | "battery" | "app" };
export function alarmDeviceProfile(manufacturer: string): { id: string; name: string; steps: ReliabilityStep[] } {
  const brand = manufacturer.toLowerCase();
  const battery: ReliabilityStep = { id: "battery", label: "Battery management", guidance: "Review this app's battery settings. Allow background activity if alarms are delayed.", settings: "battery" };
  const startup = (label: string, guidance: string): ReliabilityStep => ({ id: "startup", label, guidance, settings: "autostart" });
  if (["xiaomi", "redmi", "poco"].includes(brand)) return { id: "xiaomi", name: "Xiaomi / Redmi / POCO", steps: [startup("Auto-start", "Allow this app to start automatically in Security → Auto-start."), { ...battery, guidance: "In app battery saver, choose No restrictions." }, { id: "popup", label: "Lock-screen and background pop-ups", guidance: "In Other permissions, allow lock-screen and background pop-ups where available.", settings: "app" }] };
  if (brand === "samsung") return { id: "samsung", name: "Samsung", steps: [{ ...battery, guidance: "In Battery → Background usage limits, remove this app from Sleeping and Deep sleeping apps. Add it to Never sleeping apps if available." }] };
  if (["oppo", "realme", "oneplus"].includes(brand)) return { id: "oppo", name: "Oppo / Realme / OnePlus", steps: [startup("Auto-launch", "In app battery management, allow auto-launch and background activity where available."), battery] };
  if (["vivo", "iqoo"].includes(brand)) return { id: "vivo", name: "Vivo / iQOO", steps: [startup("Autostart", "In iManager → App manager, allow autostart where available."), { ...battery, guidance: "In Background power consumption management, allow this app to run in the background." }] };
  if (["huawei", "honor"].includes(brand)) return { id: "huawei", name: "Huawei / Honor", steps: [startup("App launch", "In App launch, manage this app manually and allow auto-launch, secondary launch, and background activity."), battery] };
  return { id: "android", name: manufacturer || "Android / Pixel", steps: [battery] };
}
