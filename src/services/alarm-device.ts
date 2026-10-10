export type ReliabilityStep = { id: string; label: string; guidance: string; settings: "autostart" | "battery" | "app" };
export const OEM_CONFIRMED_KEY = 'morning-ritual:phone-confirmations-v2';
export function alarmDeviceProfile(manufacturer: string): { id: string; name: string; steps: ReliabilityStep[] } {
  const brand = manufacturer.trim().toLowerCase();
  const battery: ReliabilityStep = { id: "battery", label: "Battery management", guidance: "Allow background activity for geeta in app battery settings.", settings: "battery" };
  const startup = (label: string, guidance: string): ReliabilityStep => ({ id: "startup", label, guidance, settings: "autostart" });
  if (["xiaomi", "redmi", "poco"].includes(brand)) return { id: "xiaomi", name: "Xiaomi / Redmi / POCO", steps: [startup("Auto-start", "Allow this app to start automatically in Security → Auto-start."), { ...battery, guidance: "In app battery saver, choose No restrictions." }, { id: "popup", label: "Lock-screen and background pop-ups", guidance: "In Settings → Apps → Manage apps → geeta → Other permissions, enable Show on Lock screen and Open new windows while running in the background.", settings: "app" }] };
  if (brand === "samsung") return { id: "samsung", name: "Samsung", steps: [{ ...battery, guidance: "In Battery → Background usage limits, remove this app from Sleeping and Deep sleeping apps. Add it to Never sleeping apps if available." }] };
  if (["oppo", "realme", "oneplus"].includes(brand)) return { id: brand, name: brand === "oppo" ? "OPPO" : brand === "realme" ? "Realme" : "OnePlus", steps: [startup("Auto-launch", "In app battery management, allow auto-launch and background activity where available."), battery] };
  if (["vivo", "iqoo"].includes(brand)) return { id: "vivo", name: "Vivo / iQOO", steps: [startup("Autostart", "In iManager → App manager, allow autostart where available."), { ...battery, guidance: "In Background power consumption management, allow this app to run in the background." }] };
  if (["huawei", "honor"].includes(brand)) return { id: brand, name: brand === "honor" ? "Honor" : "Huawei", steps: [startup("App launch", "In App launch, manage this app manually and allow auto-launch, secondary launch, and background activity."), battery] };
  return { id: "android", name: manufacturer || "Android / Pixel", steps: [battery] };
}

/** Some OEMs report a parent manufacturer for a distinct phone brand. */
export function alarmGuideManufacturer(status: { manufacturer: string; brand?: string }) {
  const brand = status.brand?.trim().toLowerCase();
  return brand && ['google', 'pixel', 'xiaomi', 'redmi', 'poco', 'samsung', 'oppo', 'realme', 'oneplus', 'vivo', 'iqoo', 'huawei', 'honor'].includes(brand) ? brand : status.manufacturer;
}
