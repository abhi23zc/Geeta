# Genuine screenshot coverage

Android 13 Xiaomi has complete page coverage; other checklist variants remain incomplete. This is an explicit delivery dependency, not automated-test success. Each missing page remains visible with written guidance. No cross-manufacturer or generated settings screens are displayed.

Android 14+ checklist (older Android versions omit exact before API 31, channel before API 26, and fullscreen before API 34):

| Manufacturer | Available captured examples | Captures required |
| --- | --- | --- |
| Android / Pixel | None | notifications, exact, channel, fullscreen, battery |
| Samsung | exact, battery | notifications, channel, fullscreen |
| Xiaomi / Redmi / POCO | notifications, exact, channel, lockscreen, background-popup, startup, battery | fullscreen (Android 14+) |
| OPPO | startup, battery | notifications, exact, channel, fullscreen |
| realme | startup, battery | notifications, exact, channel, fullscreen |
| OnePlus | startup | notifications, exact, channel, fullscreen, battery |
| Vivo / iQOO | battery | notifications, exact, channel, fullscreen, startup |
| Huawei | startup | notifications, exact, channel, fullscreen, battery |
| Honor | None | notifications, exact, channel, fullscreen, startup, battery |
| Unknown manufacturer | None | notifications, exact, channel, fullscreen, battery |

All screenshots must be captured from the matching manufacturer/brand, with ROM/version and model documented, written redistribution permission or documented license, source/attribution, native dimensions, UI variant and inspected normalized highlight coordinates. An unknown phone requires its own matching captures. Matching old software examples are labeled; no claim covers all ROM variants. Redmi/POCO and iQOO need additional brand/ROM captures for variant acceptance.

Audit: the notification dialog assets are rendered mockups and are quarantined. Generic channel/fullscreen assets lack manufacturer provenance. Samsung exact access is used only for Samsung. Huawei is never used for Honor. OnePlus auto-launch is used for startup only; Vivo background-power imagery is used for battery, not autostart. Existing source files are retained for provenance. sources.json records dimensions of bundled files (the old notification dimensions were incorrect), setting, manufacturer, brand, software version, UI variant, source, attribution, rights, eligibility and highlights.

Additional permission-cleared captures remain required for incomplete manufacturers and versions. Current examples are offline WebP conversions attributed to Urbandroid Team / dontkillmyapp.com. Original-source hashes refer to source downloads, not converted WebP files.

## 2026-10-10 device capture update

The connected Xiaomi M2101K7BI (MIUI 14, Android 13, English dark theme) supplied genuine, unmodified PNG captures for notifications, precise alarms, alarm channel, Show on Lock screen, background windows, and a filtered Geeta autostart row. Permission switches were not changed. Each image has a separately inspected highlight. The existing licensed Xiaomi battery example completes all seven applicable pages for Android 13; this does not validate every Xiaomi software variant. Android 14 full-screen access still needs a matching capture, as do missing entries for other manufacturers. `coverage.json` now includes the complete API 33 Xiaomi checklist separately from incomplete API 34 coverage.

The visible “Screenshot unavailable” placeholder was removed at the user's request. Missing assets remain delivery dependencies in this checklist; their pages retain written instructions. No cross-manufacturer fallback was enabled without user approval. The separate Image credits page identifies project device captures and retains third-party license information.
