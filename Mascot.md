# Aru Video Developer Handoff

Source reviewed: `D:\Browser Downloads\Sep 12 - 16_17 (1).zip`

All reviewed videos are vertical `720x1280`, about `10s`, `24fps`, with AAC audio. Use these first as removable-background app character clips. Prefer muted playback in-app unless the audio is intentionally part of the ritual.

## Recommended App Structure

| App moment                            | Use this clip                                          | Developer filename suggestion        | Status                                           |
| ------------------------------------- | ------------------------------------------------------ | ------------------------------------ | ------------------------------------------------ |
| Alarm screen - sleepy idle before tap | `Mascot_blinking_sleepily_on_green_20260912170903.mp4` | `aru_alarm_sleepy_idle.mp4`          | Good                                             |
| After user taps Start My Day          | `Animate_mascot_waking_up_20260912170903.mp4`          | `aru_start_my_day_wake.mp4`          | Good                                             |
| Breathing screen                      | `Aru_meditating_in_breathing_loop_20260912170904.mp4`  | `aru_breathing_loop.mp4`             | Good, but glow may need cleanup                  |
| Gita reading screen                   | `Character_reading_book_on_green_20260912170903.mp4`   | `aru_gita_reading_open_book.mp4`     | Good if book opens clearly in motion             |
| Today tasks screen                    | `Character_animation_pointing_and…_20260912170903.mp4` | `aru_tasks_pointing.mp4`             | Good                                             |
| Task complete                         | `Character_animation_for_task_com…_20260912170903.mp4` | `aru_task_completed_namaste.mp4`     | Good                                             |
| Morning ritual complete / streak      | `Mascot_celebrating_completion_an…_20260912170903.mp4` | `aru_streak_celebration.mp4`         | Good                                             |
| Night reflection                      | `Character_animation_for_night_re…_20260912170903.mp4` | `aru_night_reflection_lamp.mp4`      | Good                                             |
| Alternate wake transition             | `Character_waking_up_transition_a…_20260912170904.mp4` | `aru_wake_transition_forest_alt.mp4` | Regenerate or use only if background is accepted |
| Alternate welcome / start state       | `Character_animation_video_genera…_20260912170904.mp4` | `aru_welcome_alt.mp4`                | Optional                                         |

## Implementation Flow

1. Alarm rings: loop `aru_alarm_sleepy_idle.mp4`.
2. User taps Start My Day: play `aru_start_my_day_wake.mp4` once.
3. Move to Gita screen: play `aru_gita_reading_open_book.mp4` once or loop the final open-book section.
4. Breathing screen: loop `aru_breathing_loop.mp4` during the guided breath timer.
5. Today tasks: show `aru_tasks_pointing.mp4` when the task list first appears.
6. Task checked: play `aru_task_completed_namaste.mp4` once.
7. Morning complete or streak: play `aru_streak_celebration.mp4` once.
8. Night reflection: loop or play `aru_night_reflection_lamp.mp4`.

## Quality Notes

- Most clips keep the green-screen background and consistent Aru identity.
- `Character_waking_up_transition_a…` includes a forest/dawn background. Do not use it as a removable-background app asset unless the developer can mask it cleanly. For the app, regenerate this one with pure chroma green.
- Some clips include bright aura petals, sparkles, and a small sparkle mark near the bottom-right. These may be removed by chroma keying or masked out, but for the cleanest app assets, regenerate with: no particles, no corner sparkles, no glow touching the background.
- Breathing and celebration clips are good emotionally, but the glow behind Aru can make background removal less clean. Test chroma key before final integration.
- The seated clips now look much better than the earlier hanging-leg issue. Keep the same seated pose rule for future generations.

## MVP Coverage Check

Covered for MVP:

- Sleepy alarm idle
- Wake/start day transition
- Gita reading
- Breathing reset
- Today tasks encouragement
- Task completion
- Night reflection
- Streak or ritual completion

Still useful to create:

- App splash/loading loop: Aru blinks gently with no big gesture.
- Empty task state: Aru calmly points downward or holds open palms.
- Error/offline state: Aru looks gently concerned but still calm.
- Tomorrow plan complete: Aru closes eyes briefly in peaceful namaste.

## Developer Asset Guidance

Store final app assets like this:

```text
assets/aru/
  source/
    original_reference.png
  video/
    aru_alarm_sleepy_idle.mp4
    aru_start_my_day_wake.mp4
    aru_gita_reading_open_book.mp4
    aru_breathing_loop.mp4
    aru_tasks_pointing.mp4
    aru_task_completed_namaste.mp4
    aru_streak_celebration.mp4
    aru_night_reflection_lamp.mp4
  transparent/
    same files after background removal, preferably WebM alpha or transparent PNG/WebP sequences
  thumbnails/
    static fallbacks for low-power devices
```

Recommended app playback:

- Use MP4 only for prototype screens.
- For production, convert green-screen clips into transparent WebM, Lottie/Rive-style animation, or optimized WebP/APNG sequences.
- Always keep static PNG/WebP fallback images for Android performance and accessibility.
