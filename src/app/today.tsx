import React from 'react';
import { DimensionValue, Image, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import {
  BookOpen,
  Check,
  Clock3,
  Dumbbell,
  Leaf,
  ListTodo,
  Moon,
  PenLine,
  Plus,
  Quote,
  SunMedium,
} from 'lucide-react-native';

import { Header, Screen, TextR } from '@/components/ritual-ui';
import { Interactive3DCard } from '@/components/interactive-3d-card';
import { C } from '@/constants/ritual-theme';
import { Task, useRitual } from '@/state/ritual-store';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const SERENITY_IMAGE_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBEIEoiZiaHM4XJ6TexRv_WLW2SN251hi9lx11JXnpdm1yKCxY26NO_g1eC8i7w0sD6hOWyDdKUJcz1lI7W6PBk4hURk17Y2X7s1Zx7zzbZ1Jcz76Y4H4u2z0J0kA41JcPe1BdIs1bEKs904cpmQXbPn118nSl3P4eTBmz6w6CPLg4RkpMKRLRZ196cfvj45SKcWMzIJUa1o_ZMS7iar0--voJR45OLZqxSmSmZflGPytD_NElprteWpg';

export default function Today() {
  const { tasks, toggleTask, addTask } = useRitual();
  const done = tasks.filter((task) => task.done).length;
  const remaining = tasks.length - done;

  const btnPress = useSharedValue(0);
  const animatedBtnStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: withSpring(btnPress.value ? 3 : 0, { damping: 14, stiffness: 240 }) },
      { scale: withSpring(btnPress.value ? 0.98 : 1, { damping: 14, stiffness: 240 }) },
    ],
    shadowOffset: {
      width: 0,
      height: withSpring(btnPress.value ? 2 : 7, { damping: 14, stiffness: 240 }),
    },
    shadowOpacity: withSpring(btnPress.value ? 0.12 : 0.28, { damping: 14, stiffness: 240 }),
  }));

  return (
    <Screen>
      <Header eyebrow="Today" />

      {/* Dynamic Breathing Brahma Muhurta Aura Header */}
      <View style={s.headerAuraWrap}>
        <BrahmaMuhurtaAura />
        <View style={s.titleRow}>
          <View>
            <TextR style={s.title}>Today</TextR>
            <TextR style={s.subtitle}>Mindful actions for this day</TextR>
          </View>
          <View style={s.muhurtaChip}>
            <View style={s.pulseDot} />
            <TextR style={s.muhurtaText}>BRAHMA MUHURTA</TextR>
          </View>
        </View>
      </View>

      {/* 3D Tactile Interactive Bhagavad Gita Quote Card */}
      <View style={{ marginBottom: 28 }}>
        <Interactive3DCard maxTiltDeg={8} style={s.quoteCard3D}>
          <View style={s.quoteCardContent}>
            <View style={s.quoteIconCircle}>
              <Quote size={20} color={C.saffron} fill={C.saffron} />
            </View>
            <View style={s.quoteCopy}>
              <TextR serif style={s.quoteText}>
                “Perform your duty with dedication and equanimity.”
              </TextR>
              <View style={s.quoteMetaRow}>
                <View style={s.quoteDot} />
                <TextR style={s.quoteMeta}>GITA 2.48 • NISHKAMA KARMA</TextR>
              </View>
            </View>
          </View>
        </Interactive3DCard>
      </View>

      {/* 3D Tactile Morning Cadence Card with Sacred Bead Progress Arc */}
      <View style={s.cadenceCard}>
        <View style={s.cadenceTop}>
          <View style={s.cadenceTitleRow}>
            <View style={s.cadenceIconCircle}>
              <Leaf size={19} color={C.greenDark} />
            </View>
            <View>
              <TextR style={s.cadenceTitle}>Morning Cadence</TextR>
              <TextR style={s.progressSubtext}>Sacred daily rhythm</TextR>
            </View>
          </View>
          <View style={s.progressBadge}>
            <TextR style={s.progressText}>
              {done} OF {tasks.length} COMPLETED
            </TextR>
          </View>
        </View>

        {/* Sacred Bead Node Progress Visualizer */}
        <SacredBeadProgress total={tasks.length} completed={done} />

        <View style={s.cadenceBottom}>
          <View style={s.steadyRow}>
            <View style={s.goldDot} />
            <TextR style={s.steadyText}>Keep your mind steady & present.</TextR>
          </View>
          <View style={s.karmaBadge}>
            <TextR style={s.karmaText}>KARMA YOGA</TextR>
          </View>
        </View>
      </View>

      <View style={s.intentHeader}>
        <TextR style={s.intentTitle}>SANKALPAS (INTENTIONS)</TextR>
        <TextR style={s.orderText}>Sacred Order</TextR>
      </View>

      <View style={s.taskList}>
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} onPress={() => toggleTask(task.id)} />
        ))}
      </View>

      <AnimatedPressable
        onPress={addTask}
        onPressIn={() => {
          btnPress.value = 1;
        }}
        onPressOut={() => {
          btnPress.value = 0;
        }}
        style={[s.addButton, animatedBtnStyle]}
      >
        <Plus size={22} color={C.white} strokeWidth={2.5} />
        <TextR style={s.addText}>Add mindful task</TextR>
      </AnimatedPressable>

      <View style={s.noteCard}>
        <View style={s.noteIconCircle}>
          <TextR style={s.noteIconText}>⌘</TextR>
        </View>
        <View style={{ flex: 1 }}>
          <TextR style={s.noteTitle}>
            {remaining === 0
              ? 'All intentions fulfilled for today.'
              : `${remaining} mindful intention${remaining === 1 ? '' : 's'} remaining.`}
          </TextR>
          <TextR style={s.noteBody}>
            Act with wholehearted presence, detachment from fruits.
          </TextR>
        </View>
      </View>

      <View style={s.serenityCard}>
        <View style={s.serenityImageWrap}>
          <Image source={{ uri: SERENITY_IMAGE_URL }} style={s.serenityImage} />
          <View style={s.imageFade} />
          <View style={s.serenityPill}>
            <SunMedium size={14} color={C.saffron} />
            <TextR style={s.serenityPillText}>DAWN SERENITY</TextR>
          </View>
        </View>
        <View style={s.serenityFooter}>
          <View style={{ flex: 1 }}>
            <TextR style={s.serenityTitle}>Quiet Evening Transition</TextR>
            <TextR style={s.serenitySub}>
              Scheduled reflection at sunset (06:12 PM)
            </TextR>
          </View>
          <View style={s.moonCircle}>
            <Moon size={22} color={C.saffron} />
          </View>
        </View>
      </View>
    </Screen>
  );
}

function TaskRow({ task, onPress }: { task: Task; onPress: () => void }) {
  const Icon = taskIcon(task.category);
  const pressVal = useSharedValue(0);
  const checkScale = useSharedValue(1);

  const handlePress = () => {
    checkScale.value = withSequence(
      withSpring(1.3, { damping: 8, stiffness: 300 }),
      withSpring(1, { damping: 12, stiffness: 200 })
    );
    onPress();
  };

  const animatedCardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: withSpring(pressVal.value ? 3 : 0, { damping: 14, stiffness: 240 }) },
      { scale: withSpring(pressVal.value ? 0.985 : 1, { damping: 14, stiffness: 240 }) },
    ],
    shadowOffset: {
      width: 0,
      height: withSpring(pressVal.value ? 2 : 6, { damping: 14, stiffness: 240 }),
    },
    shadowOpacity: withSpring(pressVal.value ? 0.06 : 0.14, { damping: 14, stiffness: 240 }),
  }));

  const animatedCheckStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={() => {
        pressVal.value = 1;
      }}
      onPressOut={() => {
        pressVal.value = 0;
      }}
      style={[s.taskCard, animatedCardStyle]}
    >
      <View style={s.taskLeft}>
        <Animated.View
          style={[
            s.checkCircle,
            task.done && s.checkCircleDone,
            animatedCheckStyle,
          ]}
        >
          {task.done ? (
            <Check size={18} color={C.white} strokeWidth={3} />
          ) : (
            <View style={s.emptyDot} />
          )}
        </Animated.View>
        <View style={s.taskCopy}>
          <TextR
            style={[s.taskTitle, task.done && s.taskTitleDone]}
            numberOfLines={2}
          >
            {task.title}
          </TextR>
          <View style={s.metaRow}>
            <Clock3 size={13} color={C.inkSoft} />
            <TextR style={s.taskTime}>{task.time}</TextR>
            <View style={s.metaDot} />
            <View style={[s.categoryPill, task.done && s.categoryPillDone]}>
              <TextR style={[s.categoryText, task.done && s.categoryTextDone]}>
                {task.category.toUpperCase()}
              </TextR>
            </View>
          </View>
        </View>
      </View>
      <View style={s.taskRightIconWrap}>
        <Icon
          size={22}
          color={task.done ? C.greenDark : C.mutedSoft}
          strokeWidth={1.8}
        />
      </View>
    </AnimatedPressable>
  );
}

function BrahmaMuhurtaAura() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.45);

  React.useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 3200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.95, { duration: 3200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    opacity.value = withRepeat(
      withSequence(
        withTiming(0.65, { duration: 3200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.35, { duration: 3200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={s.auraContainer} pointerEvents="none">
      <Animated.View style={[s.auraCircle, animatedStyle]}>
        <Svg width="300" height="300" viewBox="0 0 300 300">
          <Defs>
            <RadialGradient id="dawnHalo" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#FDE3B8" stopOpacity="0.85" />
              <Stop offset="45%" stopColor="#FDCBA5" stopOpacity="0.4" />
              <Stop offset="80%" stopColor="#FEEADC" stopOpacity="0.15" />
              <Stop offset="100%" stopColor="#FFF9F5" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect width="300" height="300" fill="url(#dawnHalo)" />
        </Svg>
      </Animated.View>
    </View>
  );
}

function SacredBeadProgress({ total, completed }: { total: number; completed: number }) {
  const percent = total > 0 ? (completed / total) * 100 : 0;

  const animatedFillStyle = useAnimatedStyle(() => ({
    width: withSpring(`${percent}%`, { damping: 16, stiffness: 140 }),
  }));

  return (
    <View style={s.sacredBeadContainer}>
      <View style={s.beadTrackLine} />
      <Animated.View style={[s.beadFillLine, animatedFillStyle]} />
      <View style={s.beadNodesRow}>
        {Array.from({ length: Math.max(total, 1) }).map((_, idx) => {
          const isDone = idx < completed;
          const isCurrent = idx === completed;
          return (
            <BeadNode key={idx} isDone={isDone} isCurrent={isCurrent} />
          );
        })}
      </View>
    </View>
  );
}

function BeadNode({ isDone, isCurrent }: { isDone: boolean; isCurrent: boolean }) {
  const scale = useSharedValue(isDone ? 1.15 : 1);

  React.useEffect(() => {
    if (isDone) {
      scale.value = withSequence(
        withSpring(1.35, { damping: 8, stiffness: 300 }),
        withSpring(1.1, { damping: 12, stiffness: 200 })
      );
    } else {
      scale.value = withSpring(1, { damping: 14, stiffness: 200 });
    }
  }, [isDone]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        s.beadNode,
        isDone && s.beadNodeDone,
        isCurrent && s.beadNodeCurrent,
        animatedStyle,
      ]}
    >
      {isDone ? (
        <Check size={11} color={C.white} strokeWidth={3.5} />
      ) : (
        <View style={[s.innerBeadDot, isCurrent && s.innerBeadDotCurrent]} />
      )}
    </Animated.View>
  );
}

function taskIcon(category: string) {
  switch (category.toLowerCase()) {
    case 'pranayama':
      return SunMedium;
    case 'work':
      return PenLine;
    case 'mind':
      return BookOpen;
    case 'health':
      return Dumbbell;
    default:
      return ListTodo;
  }
}

const s = StyleSheet.create({
  headerAuraWrap: {
    position: 'relative',
    marginBottom: 28,
  },
  auraContainer: {
    position: 'absolute',
    top: -90,
    right: -50,
    width: 300,
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: -1,
  },
  auraCircle: {
    width: 300,
    height: 300,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    color: C.ink,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 16,
    lineHeight: 23,
    color: C.inkSoft,
    fontWeight: '500',
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: C.saffron,
  },
  muhurtaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(254, 236, 220, 0.85)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(140, 64, 16, 0.15)',
    borderBottomWidth: 2,
    shadowColor: C.saffron,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    marginTop: 2,
  },
  muhurtaText: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: C.primary,
  },
  addButton: {
    height: 60,
    borderRadius: 999,
    backgroundColor: C.saffron,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(140, 64, 16, 0.35)',
    borderBottomWidth: 3.5,
    shadowColor: C.saffron,
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 7 },
    elevation: 6,
    marginBottom: 30,
  },
  addText: {
    fontSize: 17,
    fontWeight: '800',
    color: C.white,
  },
  noteCard: {
    minHeight: 108,
    borderRadius: 26,
    backgroundColor: 'rgba(255, 252, 248, 0.95)',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(140, 64, 16, 0.15)',
    borderBottomWidth: 2.5,
    shadowColor: '#8C4010',
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
    marginBottom: 30,
  },
  noteIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(254, 236, 220, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(140, 64, 16, 0.18)',
    borderBottomWidth: 2,
    shadowColor: C.saffron,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  noteIconText: {
    fontSize: 22,
    fontWeight: '800',
    color: C.ink,
  },
  noteTitle: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '700',
    color: C.ink,
  },
  noteBody: {
    marginTop: 3,
    fontSize: 14,
    lineHeight: 21,
    color: C.inkSoft,
    fontWeight: '500',
  },
  serenityCard: {
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 253, 249, 0.98)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(140, 64, 16, 0.22)',
    borderBottomWidth: 3.5,
    shadowColor: '#8C4010',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 7 },
    elevation: 5,
    marginBottom: 24,
  },
  serenityImageWrap: {
    height: 178,
    overflow: 'hidden',
  },
  serenityImage: {
    width: '100%',
    height: '100%',
  },
  imageFade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(35, 26, 17, 0.25)',
  },
  serenityPill: {
    position: 'absolute',
    top: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 249, 245, 0.92)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    shadowColor: C.saffron,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  serenityPillText: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 1.6,
    color: C.primary,
  },
  serenityFooter: {
    minHeight: 82,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  serenityTitle: {
    fontSize: 18.5,
    lineHeight: 24,
    fontWeight: '800',
    color: C.ink,
  },
  serenitySub: {
    fontSize: 14.5,
    lineHeight: 21,
    color: C.inkSoft,
    fontWeight: '500',
  },
  moonCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(254, 236, 220, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(140, 64, 16, 0.2)',
    borderBottomWidth: 2,
    shadowColor: C.saffron,
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 3,
  },
  quoteCard3D: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  quoteCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 6,
  },
  quoteIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(254, 236, 220, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(140, 64, 16, 0.2)',
    borderBottomWidth: 2,
    shadowColor: C.saffron,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  quoteCopy: {
    flex: 1,
  },
  quoteText: {
    fontSize: 24,
    lineHeight: 35,
    color: C.ink,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  quoteMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  quoteDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: C.saffron,
  },
  quoteMeta: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: C.inkSoft,
  },
  cadenceCard: {
    borderRadius: 28,
    backgroundColor: 'rgba(255, 253, 249, 0.98)',
    padding: 22,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(140, 64, 16, 0.22)',
    borderBottomWidth: 3.5,
    shadowColor: '#8C4010',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 7 },
    elevation: 5,
    marginBottom: 28,
  },
  cadenceTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  cadenceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cadenceIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(42, 92, 51, 0.25)',
    borderBottomWidth: 2,
    shadowColor: C.greenDark,
    shadowOpacity: 0.14,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  cadenceTitle: {
    fontSize: 18.5,
    lineHeight: 23,
    fontWeight: '800',
    color: C.ink,
  },
  progressSubtext: {
    fontSize: 12,
    fontWeight: '600',
    color: C.mutedSoft,
    marginTop: 1,
  },
  progressBadge: {
    backgroundColor: 'rgba(254, 236, 220, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  progressText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
    color: C.saffron,
  },
  sacredBeadContainer: {
    height: 38,
    justifyContent: 'center',
    marginTop: 18,
    marginBottom: 6,
    position: 'relative',
  },
  beadTrackLine: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(238, 210, 190, 0.7)',
  },
  beadFillLine: {
    position: 'absolute',
    left: 10,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.saffron,
    shadowColor: C.saffron,
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 3,
  },
  beadNodesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  beadNode: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFF8EE',
    borderWidth: 1.8,
    borderColor: '#DEC0B4',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8C4010',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  beadNodeDone: {
    backgroundColor: C.saffron,
    borderColor: '#FFFFFF',
    shadowColor: C.saffron,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  beadNodeCurrent: {
    borderColor: C.gold,
    borderWidth: 2,
    backgroundColor: '#FFF3DB',
    shadowColor: C.gold,
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  innerBeadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DEC0B4',
  },
  innerBeadDotCurrent: {
    backgroundColor: C.goldDark,
  },
  cadenceBottom: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  steadyRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goldDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.gold,
  },
  steadyText: {
    flex: 1,
    fontSize: 14.5,
    lineHeight: 21,
    color: C.inkSoft,
    fontWeight: '500',
  },
  karmaBadge: {
    backgroundColor: 'rgba(254, 236, 220, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(140, 64, 16, 0.18)',
    borderBottomWidth: 2,
    shadowColor: C.saffron,
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  karmaText: {
    fontSize: 11.5,
    fontWeight: '900',
    letterSpacing: 1.6,
    color: C.primary,
  },
  intentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  intentTitle: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    letterSpacing: 2.4,
    color: C.ink,
  },
  orderText: {
    fontSize: 16,
    color: C.primary,
  },
  taskList: {
    gap: 14,
    marginBottom: 22,
  },
  taskCard: {
    minHeight: 88,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 252, 248, 0.96)',
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(180, 120, 80, 0.25)',
    borderBottomWidth: 3,
    shadowColor: C.shadow3D,
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  taskLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  taskRightIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(254, 236, 220, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: C.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E4BFAE',
  },
  checkCircleDone: {
    backgroundColor: C.green,
    borderColor: C.green,
  },
  emptyDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#C99F88',
  },
  taskCopy: {
    flex: 1,
    minWidth: 0,
  },
  taskTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
    color: C.ink,
  },
  taskTitleDone: {
    color: C.muted,
    textDecorationLine: 'line-through',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 6,
  },
  taskTime: {
    fontSize: 13,
    color: C.inkSoft,
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DEC0B4',
  },
  categoryPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: C.surfaceHigh,
  },
  categoryPillDone: {
    backgroundColor: '#D7EACD',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: C.inkSoft,
  },
  categoryTextDone: {
    color: C.greenDark,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
});
