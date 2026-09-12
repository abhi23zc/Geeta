import React from 'react';
import { DimensionValue, Image, Pressable, StyleSheet, View } from 'react-native';
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
import { C } from '@/constants/ritual-theme';
import { Task, useRitual } from '@/state/ritual-store';

const SERENITY_IMAGE_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBEIEoiZiaHM4XJ6TexRv_WLW2SN251hi9lx11JXnpdm1yKCxY26NO_g1eC8i7w0sD6hOWyDdKUJcz1lI7W6PBk4hURk17Y2X7s1Zx7zzbZ1Jcz76Y4H4u2z0J0kA41JcPe1BdIs1bEKs904cpmQXbPn118nSl3P4eTBmz6w6CPLg4RkpMKRLRZ196cfvj45SKcWMzIJUa1o_ZMS7iar0--voJR45OLZqxSmSmZflGPytD_NElprteWpg';

export default function Today() {
  const { tasks, toggleTask, addTask } = useRitual();
  const done = tasks.filter((task) => task.done).length;
  const remaining = tasks.length - done;
  const progress = (tasks.length ? `${(done / tasks.length) * 100}%` : '0%') as DimensionValue;

  return (
    <Screen>
      <Header eyebrow="Today" />

      <View style={s.titleRow}>
        <View>
          <TextR style={s.title}>Today</TextR>
          <TextR style={s.subtitle}>Mindful actions for this day</TextR>
        </View>
        <View style={s.muhurtaChip}>
          <TextR style={s.muhurtaText}>BRAHMA MUHURTA</TextR>
        </View>
      </View>

      <View style={s.quoteCard}>
        <Quote size={26} color={C.primary} fill={C.primary} />
        <View style={s.quoteCopy}>
          <TextR serif style={s.quoteText}>
            “Perform your duty with dedication and equanimity.”
          </TextR>
          <TextR style={s.quoteMeta}>GITA 2.48 • NISHKAMA KARMA</TextR>
        </View>
      </View>

      <View style={s.cadenceCard}>
        <View style={s.cadenceTop}>
          <View style={s.cadenceTitleRow}>
            <Leaf size={21} color={C.greenDark} />
            <TextR style={s.cadenceTitle}>Morning Cadence</TextR>
          </View>
          <TextR style={s.progressText}>
            {done} OF {tasks.length} COMPLETED
          </TextR>
        </View>
        <View style={s.progressTrack}>
          <View style={[s.progressFill, { width: progress }]} />
        </View>
        <View style={s.cadenceBottom}>
          <View style={s.steadyRow}>
            <View style={s.goldDot} />
            <TextR style={s.steadyText}>Keep your mind steady & present.</TextR>
          </View>
          <TextR style={s.karmaText}>KARMA{'\n'}YOGA</TextR>
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

      <Pressable
        onPress={addTask}
        style={({ pressed }) => [s.addButton, pressed && s.pressed]}
      >
        <Plus size={22} color={C.white} />
        <TextR style={s.addText}>Add mindful task</TextR>
      </Pressable>

      <View style={s.noteCard}>
        <View style={s.noteIcon}>
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
            <SunMedium size={14} color={C.primary} />
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
          <Moon size={26} color={C.primary} />
        </View>
      </View>
    </Screen>
  );
}

function TaskRow({ task, onPress }: { task: Task; onPress: () => void }) {
  const Icon = taskIcon(task.category);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.taskCard, pressed && s.pressed]}
    >
      <View style={s.taskLeft}>
        <View style={[s.checkCircle, task.done && s.checkCircleDone]}>
          {task.done ? (
            <Check size={18} color={C.white} strokeWidth={3} />
          ) : (
            <View style={s.emptyDot} />
          )}
        </View>
        <View style={s.taskCopy}>
          <TextR
            style={[s.taskTitle, task.done && s.taskTitleDone]}
            numberOfLines={1}
          >
            {task.title}
          </TextR>
          <View style={s.metaRow}>
            <Clock3 size={14} color={C.inkSoft} />
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
      <Icon
        size={24}
        color={task.done ? C.greenDark : C.mutedSoft}
        strokeWidth={1.8}
      />
    </Pressable>
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    color: C.ink,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 17,
    lineHeight: 25,
    color: C.inkSoft,
  },
  muhurtaChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: C.surfaceContainer,
    marginTop: 2,
  },
  muhurtaText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: C.primary,
  },
  quoteCard: {
    minHeight: 168,
    borderRadius: 30,
    backgroundColor: C.surfaceLow,
    padding: 28,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
    shadowColor: '#8C4010',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
    marginBottom: 28,
  },
  quoteCopy: {
    flex: 1,
  },
  quoteText: {
    fontSize: 27,
    lineHeight: 39,
    color: C.ink,
    fontStyle: 'italic',
  },
  quoteMeta: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 1.6,
    color: C.inkSoft,
  },
  cadenceCard: {
    borderRadius: 28,
    backgroundColor: C.white,
    padding: 26,
    shadowColor: '#8C4010',
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
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
    gap: 10,
  },
  cadenceTitle: {
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '800',
    color: C.ink,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: C.inkSoft,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: C.surfaceContainer,
    marginTop: 18,
    padding: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: C.green,
  },
  cadenceBottom: {
    marginTop: 22,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 18,
  },
  steadyRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  goldDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: C.gold,
  },
  steadyText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: C.inkSoft,
  },
  karmaText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '800',
    letterSpacing: 1.8,
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
    minHeight: 84,
    borderRadius: 28,
    backgroundColor: C.white,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    shadowColor: '#8C4010',
    shadowOpacity: 0.05,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  taskLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
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
  addButton: {
    height: 60,
    borderRadius: 999,
    backgroundColor: C.saffron,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: C.saffron,
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
    marginBottom: 34,
  },
  addText: {
    fontSize: 17,
    fontWeight: '800',
    color: C.white,
  },
  noteCard: {
    minHeight: 118,
    borderRadius: 30,
    backgroundColor: C.surfaceLow,
    padding: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    shadowColor: '#8C4010',
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
    marginBottom: 34,
  },
  noteIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFDEA7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteIconText: {
    fontSize: 23,
    fontWeight: '800',
    color: C.ink,
  },
  noteTitle: {
    fontSize: 18,
    lineHeight: 25,
    color: C.ink,
  },
  noteBody: {
    marginTop: 3,
    fontSize: 15,
    lineHeight: 23,
    color: C.inkSoft,
  },
  serenityCard: {
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: C.white,
    shadowColor: '#8C4010',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    marginBottom: 20,
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
    backgroundColor: 'rgba(255, 248, 245, 0.08)',
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
    backgroundColor: 'rgba(255, 249, 245, 0.9)',
  },
  serenityPillText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.8,
    color: C.primary,
  },
  serenityFooter: {
    minHeight: 82,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  serenityTitle: {
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '800',
    color: C.ink,
  },
  serenitySub: {
    fontSize: 15,
    lineHeight: 22,
    color: C.inkSoft,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
});
