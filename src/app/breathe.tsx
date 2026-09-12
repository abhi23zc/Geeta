import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import {
  CheckCircle2,
  Leaf,
  Pause,
  PauseCircle,
  Play,
  RotateCcw,
  Timer,
  Volume2,
  VolumeX,
  Wind,
} from 'lucide-react-native';

import { Header, Screen, TextR } from '@/components/ritual-ui';
import { C } from '@/constants/ritual-theme';

const GHAT_IMAGE_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBexs9pzbqy6fkQnJhb0iPmtJUeR1xQt2GCUPq9bzKXBTaRj0QzrT1_hBNNDyfeVF1WkYi97G1jKLA9HfxOwxZtfYVpLBhiKQw3SohCzwSz5zwAhIYsQJsHWGJVd7L50RffdpUn7AQlbAQRp4Bwssn8Ntwe81989phRcTm7kueC1li_w3THiR0uvJij74DS5i7ofYmfy0TY_LDeNtxUOkoOgY8r6FwOqMEIDQ9YihfPdrX-MBKwAnom_g';

const phases = [
  {
    key: 'inhale',
    label: 'Inhale',
    seconds: 4,
    prompt: 'Inhale gently through nostrils, filling abdomen and chest.',
    Icon: Wind,
  },
  {
    key: 'hold',
    label: 'Hold',
    seconds: 4,
    prompt: 'Gently retain the breath at the crest, resting in tranquility.',
    Icon: PauseCircle,
  },
  {
    key: 'exhale',
    label: 'Exhale',
    seconds: 4,
    prompt: 'Slowly release breath through nose, relaxing the shoulders.',
    Icon: Leaf,
  },
] as const;

const circle = 2 * Math.PI * 108;

export default function Breathe() {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(1);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [complete, setComplete] = useState(false);

  const phase = phases[phaseIndex];
  const progress = useMemo(
    () => (phase.seconds - secondsLeft + 1) / phase.seconds,
    [phase.seconds, secondsLeft],
  );

  useEffect(() => {
    if (paused) {
      return;
    }

    const id = setInterval(() => {
      setSecondsLeft((current) => {
        if (current > 1) {
          return current - 1;
        }

        setPhaseIndex((next) => (next + 1) % phases.length);
        return 4;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [paused]);

  return (
    <Screen>
      <Header eyebrow="Breathe" />

      <View style={s.hero}>
        <View style={s.modeChip}>
          <Leaf size={15} color={C.primary} />
          <TextR style={s.modeText}>SAMA VRITTI PRANAYAMA</TextR>
        </View>
        <TextR style={s.title}>Morning Prana & Stillness</TextR>
        <TextR style={s.subtitle}>
          Awaken vital life-force through conscious, balanced breath intervals.
        </TextR>
      </View>

      <View style={s.orbStage}>
        <View style={s.glowOuter} />
        <View style={s.glowMiddle} />
        <Svg width={270} height={270} style={s.progressRing}>
          <Circle
            cx={135}
            cy={135}
            r={108}
            stroke="#F2DFD1"
            strokeWidth={5}
            strokeDasharray="5 12"
            fill="none"
          />
          <Circle
            cx={135}
            cy={135}
            r={108}
            stroke={C.saffron}
            strokeWidth={8}
            strokeDasharray={circle}
            strokeDashoffset={circle - circle * Math.min(progress, 1)}
            strokeLinecap="round"
            fill="none"
            rotation="-90"
            origin="135,135"
          />
        </Svg>
        <View style={s.sparkTop} />
        <View style={s.sparkBottom} />
        <View style={s.orbCore}>
          <View style={s.phaseRow}>
            <View style={s.phaseDot} />
            <TextR style={s.phaseText}>{phase.label}</TextR>
          </View>
          <TextR serif style={s.countdown}>
            {String(secondsLeft).padStart(2, '0')}
          </TextR>
          <TextR style={s.countdownLabel}>seconds remaining</TextR>
        </View>
      </View>

      <View style={s.prompt}>
        <TextR style={s.promptText}>{phase.prompt}</TextR>
      </View>

      <View style={s.cycleCard}>
        <View style={s.cardTopRow}>
          <TextR style={s.sectionTitle}>BREATHING CYCLE</TextR>
          <TextR style={s.pattern}>4 · 4 · 4 Pattern</TextR>
        </View>
        <View style={s.phaseGrid}>
          {phases.map((item, index) => (
            <Pressable
              key={item.key}
              onPress={() => {
                setPhaseIndex(index);
                setSecondsLeft(item.seconds);
              }}
              style={[
                s.phaseTile,
                index === phaseIndex ? s.phaseTileActive : s.phaseTileIdle,
              ]}
            >
              <View style={s.phaseTileRow}>
                <item.Icon
                  size={18}
                  color={index === phaseIndex ? C.white : C.inkSoft}
                />
                <TextR
                  style={[
                    s.phaseTileTitle,
                    index === phaseIndex && s.phaseTileTitleActive,
                  ]}
                >
                  {item.label}
                </TextR>
              </View>
              <TextR
                style={[
                  s.phaseTileSub,
                  index === phaseIndex && s.phaseTileSubActive,
                ]}
              >
                4 Sec
              </TextR>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={s.statsGrid}>
        <Metric
          icon={<RotateCcw size={22} color="#271900" />}
          iconBg={C.gold}
          label="CURRENT LAP"
          value="Round 3 of 6"
        />
        <Metric
          icon={<Timer size={22} color="#00210A" />}
          iconBg={C.greenLight}
          label="PRANA TIME"
          value="2:30 / 5:00"
        />
      </View>

      <View style={s.resonanceCard}>
        <View style={s.resonanceLeft}>
          <View style={s.soundIcon}>
            <TextR style={s.eq}>|||</TextR>
          </View>
          <View style={s.resonanceCopy}>
            <TextR style={s.resonanceKicker}>SACRED RESONANCE</TextR>
            <TextR style={s.resonanceTitle}>Tanpura & River Ganga</TextR>
            <TextR style={s.resonanceSub}>432Hz Calm Vibrations</TextR>
          </View>
        </View>
        <Pressable onPress={() => setMuted((value) => !value)} style={s.volumeBtn}>
          {muted ? (
            <VolumeX size={22} color={C.primary} />
          ) : (
            <Volume2 size={22} color={C.primary} />
          )}
        </Pressable>
      </View>

      <View style={s.imageCard}>
        <Image source={{ uri: GHAT_IMAGE_URL }} style={s.ghatImage} />
        <View style={s.imageOverlay} />
        <View style={s.imageText}>
          <TextR style={s.imageKicker}>VARANASI DAWN SANCTUARY</TextR>
          <TextR style={s.imageSub} numberOfLines={1}>
            Synchronize your soul with sacred river ripples
          </TextR>
        </View>
      </View>

      <View style={s.actionRow}>
        <Pressable
          onPress={() => setPaused((value) => !value)}
          style={({ pressed }) => [s.pauseButton, pressed && s.pressed]}
        >
          {paused ? (
            <Play size={18} color={C.ink} fill={C.ink} />
          ) : (
            <Pause size={18} color={C.ink} fill={C.ink} />
          )}
          <TextR style={s.pauseText}>{paused ? 'Resume' : 'Pause'}</TextR>
        </Pressable>
        <Pressable
          onPress={() => setComplete((value) => !value)}
          style={({ pressed }) => [s.completeButton, pressed && s.pressed]}
        >
          <CheckCircle2 size={22} color={C.white} />
          <TextR style={s.completeText}>
            {complete ? 'Session Complete' : 'Complete Session'}
          </TextR>
        </Pressable>
      </View>
    </Screen>
  );
}

function Metric({
  icon,
  iconBg,
  label,
  value,
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
}) {
  return (
    <View style={s.metricCard}>
      <View style={[s.metricIcon, { backgroundColor: iconBg }]}>{icon}</View>
      <View style={{ flex: 1 }}>
        <TextR style={s.metricLabel}>{label}</TextR>
        <TextR style={s.metricValue} numberOfLines={1}>
          {value}
        </TextR>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  hero: {
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: C.surfaceContainer,
    shadowColor: C.primary,
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    marginBottom: 14,
  },
  modeText: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 2,
    color: C.inkSoft,
  },
  title: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: '800',
    textAlign: 'center',
    color: C.ink,
  },
  subtitle: {
    maxWidth: 310,
    marginTop: 8,
    fontSize: 16,
    lineHeight: 25,
    color: C.inkSoft,
    textAlign: 'center',
  },
  orbStage: {
    height: 330,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowOuter: {
    position: 'absolute',
    width: 288,
    height: 288,
    borderRadius: 144,
    backgroundColor: '#FFE6CF',
    opacity: 0.56,
    shadowColor: C.saffron,
    shadowOpacity: 0.2,
    shadowRadius: 44,
  },
  glowMiddle: {
    position: 'absolute',
    width: 248,
    height: 248,
    borderRadius: 124,
    backgroundColor: '#FFF2E9',
    borderWidth: 22,
    borderColor: '#FFE6D3',
    opacity: 0.94,
  },
  progressRing: {
    position: 'absolute',
  },
  sparkTop: {
    position: 'absolute',
    top: 44,
    right: 54,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: C.gold,
  },
  sparkBottom: {
    position: 'absolute',
    bottom: 60,
    left: 78,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFCDB9',
  },
  orbCore: {
    width: 176,
    height: 176,
    borderRadius: 88,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8C4010',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  phaseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  phaseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.primary,
  },
  phaseText: {
    fontSize: 16,
    fontWeight: '800',
    color: C.primary,
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  countdown: {
    fontSize: 58,
    lineHeight: 66,
    fontWeight: '300',
    marginTop: 4,
    color: C.ink,
  },
  countdownLabel: {
    fontSize: 14,
    color: C.inkSoft,
    marginTop: -2,
  },
  prompt: {
    marginHorizontal: 20,
    paddingHorizontal: 22,
    paddingVertical: 15,
    borderRadius: 999,
    backgroundColor: C.surfaceLow,
    alignItems: 'center',
    shadowColor: '#8C4010',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 1,
    marginBottom: 22,
  },
  promptText: {
    fontSize: 16,
    lineHeight: 24,
    color: C.inkSoft,
    textAlign: 'center',
  },
  cycleCard: {
    backgroundColor: C.white,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: C.glassBorder,
    shadowColor: '#8C4010',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    marginBottom: 10,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: C.inkSoft,
  },
  pattern: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: C.primary,
  },
  phaseGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  phaseTile: {
    flex: 1,
    minHeight: 82,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  phaseTileActive: {
    backgroundColor: C.saffron,
    shadowColor: C.saffron,
    shadowOpacity: 0.26,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 4,
  },
  phaseTileIdle: {
    backgroundColor: C.surfaceContainer,
  },
  phaseTileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  phaseTileTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: C.inkSoft,
  },
  phaseTileTitleActive: {
    color: C.white,
  },
  phaseTileSub: {
    fontSize: 15,
    color: C.muted,
    marginTop: 5,
  },
  phaseTileSubActive: {
    color: C.white,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  metricCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    minHeight: 86,
    padding: 14,
    borderRadius: 20,
    backgroundColor: C.surfaceLow,
    shadowColor: '#8C4010',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  metricIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: C.inkSoft,
  },
  metricValue: {
    fontSize: 20,
    lineHeight: 26,
    color: C.ink,
    marginTop: 2,
  },
  resonanceCard: {
    minHeight: 86,
    borderRadius: 22,
    backgroundColor: C.white,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#8C4010',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: 12,
  },
  resonanceLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  soundIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eq: {
    color: C.primary,
    fontWeight: '900',
    letterSpacing: 1,
  },
  resonanceCopy: {
    flex: 1,
  },
  resonanceKicker: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    color: C.primary,
  },
  resonanceTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
    color: C.ink,
  },
  resonanceSub: {
    fontSize: 13,
    color: C.inkSoft,
  },
  volumeBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: C.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageCard: {
    height: 116,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 22,
    backgroundColor: C.surfaceContainer,
  },
  ghatImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(35, 26, 17, 0.38)',
  },
  imageText: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 18,
  },
  imageKicker: {
    color: '#FFDEA7',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.7,
  },
  imageSub: {
    color: C.white,
    fontSize: 15,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 22,
  },
  pauseButton: {
    flex: 1,
    height: 58,
    borderRadius: 999,
    backgroundColor: C.surfaceContainer,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    shadowColor: '#8C4010',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  pauseText: {
    fontSize: 18,
    fontWeight: '800',
    color: C.ink,
  },
  completeButton: {
    flex: 1.62,
    height: 58,
    borderRadius: 999,
    backgroundColor: C.saffron,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    shadowColor: C.saffron,
    shadowOpacity: 0.28,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 7 },
    elevation: 4,
  },
  completeText: {
    fontSize: 18,
    fontWeight: '800',
    color: C.white,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
});
