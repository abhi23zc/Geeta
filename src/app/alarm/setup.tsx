import React, { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import {
  AlarmClockPlus,
  ArrowLeft,
  BellRing,
  Check,
  ChevronDown,
  ChevronUp,
  Flame,
  Leaf,
  Music,
  Pause,
  Play,
  Sun,
  User,
  Vibrate,
  Wind,
} from 'lucide-react-native';

import { MORNING_RITUAL_LOGO, Screen, TextR } from '@/components/ritual-ui';
import { C } from '@/constants/ritual-theme';
import { useRitual } from '@/state/ritual-store';

const PUJA_IMAGE_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBp3Nwdm0p15VSxkX_JCaO4lj2fq6_IyJkZeR82e7JFo6VjuqD_WVtF5LYPj6f2zb0H2WRFEq8_8iGiHTHOZWVoiBRFwy5AuLcoMfCCfTrMhZnfLI3WP982R9FP-F8EuJKCsPf9eD4oiJMZn1Z_LBPHQHZNSppMN8c4rCT4svlc-Wwqx-fMND5xRGnttiW3OlDdinGo0vKF0KLGqfkhZZoTz1sS16DoWW4QVKArxQeTT-0kvdN5wSTfvw';

const DHYAN_IMAGE_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDay_gr8PATPcb_Du4k9MPsdJc4xm28aAmyC9qTKc4WDpGEqY0W2PEotVpjz5J4WSocxeV4k6Us2wAlR8L2dpM2xnW8SFBOjAnK-qnX5rYcrggfGKwxw_VrkvpzdrhxvgHRPykTWDwM0eZR17dnI1KAnwiiCgx7zjc8xUKXDueysLvi353rUMEnURxz3CzVVd1Lnhe4cx1jfITm2C9jXreojDsIg-rxX7-DC13JkMdSimgIYoUnm-pNqA';

type ModeKey = 'gita' | 'shankh' | 'pranayama';

const modes: Array<{
  key: ModeKey;
  title: string;
  description: string;
  Icon: typeof Flame;
  iconColor: string;
  tone: string;
}> = [
  {
    key: 'gita',
    title: 'Gita Awakening',
    description: 'Morning shloka chant seamlessly blended with bamboo bansuri',
    Icon: Flame,
    iconColor: C.saffron,
    tone: 'Raag Bhairav & Sacred Flute',
  },
  {
    key: 'shankh',
    title: 'Gentle Shankh & Chants',
    description: 'Vedic resonance, deep conch overtone, and subtle tanpura drone',
    Icon: BellRing,
    iconColor: C.goldDark,
    tone: 'Gentle Shankh & Chants',
  },
  {
    key: 'pranayama',
    title: 'Pranayama First',
    description: 'Three gentle brass chimes transitioning into guided rhythmic breath',
    Icon: Wind,
    iconColor: C.greenDark,
    tone: 'Pranayama First',
  },
];

const weekSeed = [
  { id: 'mon', label: 'M', selected: true },
  { id: 'tue', label: 'T', selected: true },
  { id: 'wed', label: 'W', selected: true },
  { id: 'thu', label: 'T', selected: true },
  { id: 'fri', label: 'F', selected: true },
  { id: 'sat', label: 'S', selected: true },
  { id: 'sun', label: 'S', selected: false },
];

function parseAlarm(value: string) {
  const [h = '06', m = '30'] = value.split(':');
  const hour24 = Number(h);
  return {
    hour: hour24 > 12 ? hour24 - 12 : hour24 === 0 ? 12 : hour24,
    minute: Number(m),
    meridiem: hour24 >= 12 ? 'PM' : 'AM',
  };
}

function toStoreTime(hour: number, minute: number, meridiem: 'AM' | 'PM') {
  let h = hour % 12;
  if (meridiem === 'PM') {
    h += 12;
  }
  return `${String(h).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export default function Setup() {
  const { alarmTime, setAlarmTime, alarmTone, setAlarmTone } = useRitual();
  const parsed = useMemo(() => parseAlarm(alarmTime), [alarmTime]);
  const [hour, setHour] = useState(parsed.hour);
  const [minute, setMinute] = useState(parsed.minute);
  const [meridiem, setMeridiem] = useState<'AM' | 'PM'>(
    parsed.meridiem as 'AM' | 'PM',
  );
  const [days, setDays] = useState(weekSeed);
  const [mode, setMode] = useState<ModeKey>(
    modes.find((item) => item.tone === alarmTone)?.key ?? 'gita',
  );
  const [previewing, setPreviewing] = useState(false);
  const [gradual, setGradual] = useState(true);
  const [haptics, setHaptics] = useState(true);

  const selectedMode = modes.find((item) => item.key === mode) ?? modes[0];

  const commitTime = (
    nextHour = hour,
    nextMinute = minute,
    nextMeridiem = meridiem,
  ) => {
    setAlarmTime(toStoreTime(nextHour, nextMinute, nextMeridiem));
  };

  const updateHour = (direction: 1 | -1) => {
    const next = direction === 1 ? (hour === 12 ? 1 : hour + 1) : hour === 1 ? 12 : hour - 1;
    setHour(next);
    commitTime(next, minute, meridiem);
  };

  const updateMinute = (direction: 1 | -1) => {
    const next = (minute + direction * 5 + 60) % 60;
    setMinute(next);
    commitTime(hour, next, meridiem);
  };

  const updateMeridiem = (next: 'AM' | 'PM') => {
    setMeridiem(next);
    commitTime(hour, minute, next);
  };

  const save = () => {
    setAlarmTone(selectedMode.tone);
    setAlarmTime(toStoreTime(hour, minute, meridiem));
    router.replace('/alarm/wake');
  };

  const selectedDays = days.filter((day) => day.selected);
  const recurrenceLabel =
    selectedDays.length === 6 && !days[6].selected
      ? 'Mon - Sat'
      : selectedDays.length === 7
        ? 'Every day'
        : `${selectedDays.length} days`;

  return (
    <Screen>
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Pressable
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={({ pressed }) => [s.backButton, pressed && s.pressed]}
          >
            <ArrowLeft size={27} color={C.ink} strokeWidth={2.2} />
          </Pressable>
          <Image source={MORNING_RITUAL_LOGO} style={s.logo} />
          <TextR style={s.headerTitle}>Set Alarm</TextR>
        </View>
        <View style={s.avatar}>
          <User size={18} color={C.white} strokeWidth={2.3} />
        </View>
      </View>

      <View style={s.sectionTop}>
        <View style={s.sectionTitleRow}>
          <View style={s.sectionIcon}>
            <AlarmClockPlus size={22} color={C.saffron} strokeWidth={2.2} />
          </View>
          <TextR style={s.mainTitle}>Sacred Timing</TextR>
        </View>
        <Pressable onPress={save} style={({ pressed }) => [s.saveChip, pressed && s.pressed]}>
          <TextR style={s.saveText}>Save</TextR>
        </Pressable>
      </View>

      <View style={s.timeCard}>
        <View style={s.glowOne} />
        <View style={s.glowTwo} />
        <View style={s.windowTitle}>
          <Sun size={18} color={C.goldDark} />
          <TextR style={s.windowText}>Brahma Muhurta Window</TextR>
        </View>

        <View style={s.timePicker}>
          <TimeColumn
            value={String(hour).padStart(2, '0')}
            onIncrease={() => updateHour(1)}
            onDecrease={() => updateHour(-1)}
            label="hour"
          />
          <TextR serif style={s.colon}>
            :
          </TextR>
          <TimeColumn
            value={String(minute).padStart(2, '0')}
            onIncrease={() => updateMinute(1)}
            onDecrease={() => updateMinute(-1)}
            label="minute"
          />
          <View style={s.meridiemTrack}>
            {(['AM', 'PM'] as const).map((value) => {
              const active = meridiem === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => updateMeridiem(value)}
                  style={[s.meridiemButton, active && s.meridiemActive]}
                >
                  <TextR style={[s.meridiemText, active && s.meridiemActiveText]}>
                    {value}
                  </TextR>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={s.sunrisePill}>
          <Sun size={15} color={C.goldDark} />
          <TextR style={s.sunriseText}>
            Sunrise is at <TextR style={s.sunriseStrong}>06:18 AM</TextR> today
          </TextR>
        </View>
      </View>

      <View style={s.recurrenceHeader}>
        <TextR style={s.label}>Weekly Recurrence</TextR>
        <TextR style={s.recurrenceValue}>{recurrenceLabel}</TextR>
      </View>
      <View style={s.weekRow}>
        {days.map((day) => (
          <Pressable
            key={day.id}
            onPress={() =>
              setDays((items) =>
                items.map((item) =>
                  item.id === day.id ? { ...item, selected: !item.selected } : item,
                ),
              )
            }
            style={({ pressed }) => [
              s.dayChip,
              day.selected && s.daySelected,
              pressed && s.dayPressed,
            ]}
          >
            <TextR style={[s.dayText, day.selected && s.dayTextSelected]}>
              {day.label}
            </TextR>
          </Pressable>
        ))}
      </View>

      <View style={s.modeHeader}>
        <View>
          <TextR style={s.label}>Morning Awakening Mode</TextR>
          <TextR style={s.caption}>Selected devotional flow upon waking</TextR>
        </View>
        <Leaf size={23} color={C.goldDark} />
      </View>

      <View style={s.modeList}>
        {modes.map((item) => (
          <ModeCard
            key={item.key}
            active={mode === item.key}
            item={item}
            onPress={() => {
              setMode(item.key);
              setAlarmTone(item.tone);
            }}
          />
        ))}
      </View>

      <View style={s.soundCard}>
        <View style={s.soundRow}>
          <View style={s.soundLeft}>
            <View style={s.musicIcon}>
              <Music size={22} color={C.goldDark} fill={C.goldDark} />
            </View>
            <View style={s.soundTextBlock}>
              <TextR style={s.caps}>Soundtrack</TextR>
              <TextR style={s.soundTitle}>{selectedMode.tone}</TextR>
            </View>
          </View>
          <Pressable
            accessibilityLabel="Preview tone"
            onPress={() => setPreviewing((value) => !value)}
            style={[s.previewButton, previewing && s.previewActive]}
          >
            {previewing ? (
              <Pause size={19} color={C.saffron} fill={C.saffron} />
            ) : (
              <Play size={19} color={C.saffron} fill={C.saffron} />
            )}
          </Pressable>
        </View>

        <ToggleRow
          title="Gradual Awakening"
          description="Slow volume rise over 5 minutes like dawn light"
          enabled={gradual}
          onPress={() => setGradual((value) => !value)}
        />
        <ToggleRow
          title="Gentle Heartbeat Pulse"
          description="Soft rhythmic haptic feedback"
          enabled={haptics}
          onPress={() => setHaptics((value) => !value)}
          icon={<Vibrate size={18} color={C.mutedSoft} />}
        />
      </View>

      <View style={s.companionGrid}>
        <CompanionCard
          image={PUJA_IMAGE_URL}
          label="Morning Puja"
          title="Automatic Diya reminder"
          color={C.goldDark}
        />
        <CompanionCard
          image={DHYAN_IMAGE_URL}
          label="Post-Alarm"
          title="10 Min Silent Dhyan"
          color={C.greenDark}
        />
      </View>

      <Pressable onPress={save} style={({ pressed }) => [s.primaryButton, pressed && s.primaryPressed]}>
        <Sun size={23} color={C.white} />
        <TextR style={s.primaryText}>Save Alarm & Morning Ritual</TextR>
      </Pressable>
    </Screen>
  );
}

function TimeColumn({
  value,
  label,
  onIncrease,
  onDecrease,
}: {
  value: string;
  label: string;
  onIncrease: () => void;
  onDecrease: () => void;
}) {
  return (
    <View style={s.timeColumn}>
      <Pressable
        accessibilityLabel={`Increase ${label}`}
        onPress={onIncrease}
        hitSlop={10}
        style={s.chevronButton}
      >
        <ChevronUp size={22} color="#DABBAA" strokeWidth={2.2} />
      </Pressable>
      <TextR serif style={s.timeNumber}>
        {value}
      </TextR>
      <Pressable
        accessibilityLabel={`Decrease ${label}`}
        onPress={onDecrease}
        hitSlop={10}
        style={s.chevronButton}
      >
        <ChevronDown size={22} color="#DABBAA" strokeWidth={2.2} />
      </Pressable>
    </View>
  );
}

function ModeCard({
  active,
  item,
  onPress,
}: {
  active: boolean;
  item: (typeof modes)[number];
  onPress: () => void;
}) {
  const Icon = item.Icon;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        s.modeCard,
        active ? s.modeCardActive : s.modeCardRest,
        pressed && s.pressed,
      ]}
    >
      <View style={[s.modeIcon, active ? s.modeIconActive : s.modeIconRest]}>
        <Icon
          size={25}
          color={active ? C.white : item.iconColor}
          fill={active && item.key === 'gita' ? C.white : 'transparent'}
        />
      </View>
      <View style={s.modeBody}>
        <View style={s.modeTitleLine}>
          <TextR style={s.modeTitle}>{item.title}</TextR>
          {active && (
            <View style={s.activePill}>
              <TextR style={s.activePillText}>Active</TextR>
            </View>
          )}
        </View>
        <TextR style={s.modeDescription}>{item.description}</TextR>
      </View>
      <View style={[s.radio, active && s.radioActive]}>
        {active && <Check size={17} color={C.white} strokeWidth={3} />}
      </View>
    </Pressable>
  );
}

function ToggleRow({
  title,
  description,
  enabled,
  onPress,
  icon,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onPress: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <View style={s.toggleRow}>
      <View style={s.toggleCopy}>
        {icon && <View style={s.inlineIcon}>{icon}</View>}
        <View style={s.toggleText}>
          <TextR style={s.toggleTitle}>{title}</TextR>
          <TextR style={s.toggleDescription}>{description}</TextR>
        </View>
      </View>
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: enabled }}
        onPress={onPress}
        style={[s.switchTrack, enabled ? s.switchOn : s.switchOff]}
      >
        <View style={[s.switchKnob, enabled && s.switchKnobOn]} />
      </Pressable>
    </View>
  );
}

function CompanionCard({
  image,
  label,
  title,
  color,
}: {
  image: string;
  label: string;
  title: string;
  color: string;
}) {
  return (
    <View style={s.companionCard}>
      <Image source={{ uri: image }} style={s.companionImage} />
      <View style={s.companionCopy}>
        <TextR style={[s.companionLabel, { color }]}>{label}</TextR>
        <TextR style={s.companionTitle}>{title}</TextR>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    height: 64,
    marginHorizontal: -4,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  backButton: {
    height: 44,
    width: 44,
    marginLeft: -8,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 38,
    height: 38,
    marginLeft: 2,
    resizeMode: 'contain',
  },
  headerTitle: {
    marginLeft: 14,
    fontSize: 26,
    lineHeight: 31,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primary,
    shadowColor: C.primary,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.985 }],
  },
  sectionTop: {
    marginTop: 3,
    marginBottom: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.sand,
  },
  mainTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  saveChip: {
    minWidth: 80,
    height: 38,
    paddingHorizontal: 18,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD8CA',
  },
  saveText: {
    color: C.ink,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  timeCard: {
    minHeight: 305,
    borderRadius: 34,
    marginBottom: 28,
    paddingHorizontal: 25,
    paddingTop: 30,
    paddingBottom: 28,
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: '#FFF0E7',
    shadowColor: '#B86D3A',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },
  glowOne: {
    position: 'absolute',
    top: -72,
    right: -54,
    width: 185,
    height: 185,
    borderRadius: 95,
    backgroundColor: 'rgba(229,107,39,0.08)',
  },
  glowTwo: {
    position: 'absolute',
    bottom: -78,
    left: -56,
    width: 185,
    height: 185,
    borderRadius: 95,
    backgroundColor: 'rgba(244,185,66,0.16)',
  },
  windowTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 22,
  },
  windowText: {
    fontSize: 16,
    lineHeight: 23,
    color: C.inkSoft,
    fontWeight: '500',
  },
  timePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeColumn: {
    width: 86,
    alignItems: 'center',
  },
  chevronButton: {
    height: 34,
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeNumber: {
    fontSize: 57,
    lineHeight: 66,
    fontWeight: '300',
    letterSpacing: -2.2,
  },
  colon: {
    marginHorizontal: 2,
    paddingBottom: 6,
    fontSize: 54,
    lineHeight: 62,
    color: 'rgba(168,71,12,0.67)',
    fontWeight: '300',
  },
  meridiemTrack: {
    marginLeft: 10,
    padding: 5,
    borderRadius: 24,
    backgroundColor: 'rgba(255,248,245,0.72)',
  },
  meridiemButton: {
    minWidth: 43,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meridiemActive: {
    backgroundColor: C.primary,
    shadowColor: C.primary,
    shadowOpacity: 0.18,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 4 },
  },
  meridiemText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.6,
    color: C.muted,
  },
  meridiemActiveText: {
    color: C.white,
  },
  sunrisePill: {
    marginTop: 27,
    minHeight: 39,
    paddingHorizontal: 16,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(248,229,214,0.9)',
  },
  sunriseText: {
    fontSize: 14,
    color: C.muted,
  },
  sunriseStrong: {
    fontSize: 14,
    fontWeight: '800',
    color: C.ink,
  },
  recurrenceHeader: {
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  recurrenceValue: {
    color: C.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  weekRow: {
    marginBottom: 26,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayChip: {
    width: 49,
    height: 49,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FCEADD',
  },
  daySelected: {
    backgroundColor: C.primary,
    shadowColor: C.primary,
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
  },
  dayPressed: {
    transform: [{ scale: 0.94 }],
  },
  dayText: {
    color: C.inkSoft,
    fontSize: 16,
    fontWeight: '900',
  },
  dayTextSelected: {
    color: C.white,
  },
  modeHeader: {
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  caption: {
    marginTop: 3,
    color: C.muted,
    fontSize: 15,
    lineHeight: 21,
  },
  modeList: {
    gap: 14,
    marginBottom: 24,
  },
  modeCard: {
    minHeight: 108,
    borderRadius: 30,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  modeCardActive: {
    backgroundColor: '#FDE4D5',
    shadowColor: '#C97544',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  modeCardRest: {
    backgroundColor: '#FFF0E8',
  },
  modeIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  modeIconActive: {
    backgroundColor: C.saffron,
    shadowColor: C.saffron,
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  modeIconRest: {
    backgroundColor: '#F8DFCA',
  },
  modeBody: {
    flex: 1,
    paddingRight: 8,
  },
  modeTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  modeTitle: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '900',
    letterSpacing: 0.1,
  },
  activePill: {
    paddingHorizontal: 11,
    height: 25,
    borderRadius: 13,
    justifyContent: 'center',
    backgroundColor: '#FFD8CA',
  },
  activePillText: {
    color: C.ink,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  modeDescription: {
    marginTop: 5,
    color: C.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  radio: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FBE6D8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    backgroundColor: C.primary,
  },
  soundCard: {
    borderRadius: 30,
    padding: 18,
    marginBottom: 26,
    backgroundColor: '#FFF0E8',
  },
  soundRow: {
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  soundLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  musicIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(244,185,66,0.45)',
  },
  soundTextBlock: {
    flex: 1,
  },
  caps: {
    textTransform: 'uppercase',
    color: C.muted,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  soundTitle: {
    marginTop: 3,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
  },
  previewButton: {
    width: 43,
    height: 43,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FBE6D8',
  },
  previewActive: {
    backgroundColor: '#FFD8CA',
  },
  toggleRow: {
    minHeight: 70,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleCopy: {
    flex: 1,
    paddingRight: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inlineIcon: {
    width: 28,
    alignItems: 'center',
    marginRight: 9,
  },
  toggleText: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '800',
  },
  toggleDescription: {
    marginTop: 2,
    color: C.muted,
    fontSize: 15,
    lineHeight: 21,
  },
  switchTrack: {
    width: 53,
    height: 32,
    borderRadius: 18,
    padding: 4,
    justifyContent: 'center',
  },
  switchOn: {
    backgroundColor: C.green,
  },
  switchOff: {
    backgroundColor: '#E9D7C8',
  },
  switchKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.white,
    shadowColor: '#32170A',
    shadowOpacity: 0.14,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  switchKnobOn: {
    transform: [{ translateX: 21 }],
  },
  companionGrid: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 36,
  },
  companionCard: {
    flex: 1,
    minHeight: 148,
    borderRadius: 30,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FCE5D6',
  },
  companionImage: {
    width: 55,
    height: 55,
    borderRadius: 28,
    marginRight: 11,
    backgroundColor: C.sand,
  },
  companionCopy: {
    flex: 1,
  },
  companionLabel: {
    textTransform: 'uppercase',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  companionTitle: {
    marginTop: 5,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '600',
  },
  primaryButton: {
    minHeight: 63,
    borderRadius: 32,
    marginBottom: 6,
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: C.saffron,
    shadowColor: C.saffron,
    shadowOpacity: 0.24,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 9 },
  },
  primaryPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.92,
  },
  primaryText: {
    color: C.white,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.1,
  },
});
