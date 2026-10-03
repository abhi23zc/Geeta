import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { usePathname, useRouter } from "expo-router";
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Dumbbell,
  Leaf,
  Moon,
  PenLine,
  Plus,
  Repeat2,
  SunMedium,
} from "lucide-react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { AruMascot } from "@/components/aru-mascot";
import {
  DawnMeshBackdrop,
  Header,
  TextR,
  useDockHeight,
} from "@/components/ritual-ui";
import { C } from "@/constants/ritual-theme";
import { useContent } from "@/state/content-store";
import { useTasks, type Task } from "@/state/tasks-store";
import {
  TASK_CATEGORIES,
  type TaskCategory,
  type TaskInput,
} from "@/state/tasks-model";

const CATEGORY_ICONS = {
  Pranayama: SunMedium,
  Work: PenLine,
  Health: Dumbbell,
  Mind: BookOpen,
};
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TaskRow = memo(
  function TaskRow({
    task,
    onToggle,
    onEdit,
  }: {
    task: Task;
    onToggle: (id: string) => void;
    onEdit: (task: Task) => void;
  }) {
    const Icon = CATEGORY_ICONS[task.category];
    const pressed = useSharedValue(1);
    const reduced = useReducedMotion();
    const motion = useAnimatedStyle(() => ({
      transform: [{ scale: pressed.value }],
    }));
    return (
      <View style={s.taskCard}>
        <AnimatedPressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: task.done }}
          accessibilityLabel={`${task.title}, ${task.time}, ${task.recurrence === "daily" ? "daily habit" : "one-time intention"}`}
          onPress={() => onToggle(task.id)}
          onPressIn={() =>
            pressed.set(reduced ? 1 : withTiming(0.985, { duration: 90 }))
          }
          onPressOut={() =>
            pressed.set(withTiming(1, { duration: reduced ? 0 : 120 }))
          }
          style={[s.taskMain, motion]}
        >
          <View style={[s.checkbox, task.done && s.checkboxDone]}>
            {task.done ? (
              <Check size={17} color="white" strokeWidth={3} />
            ) : null}
          </View>
          <View style={s.taskCopy}>
            <TextR style={[s.taskTitle, task.done && s.taskDone]}>
              {task.title}
            </TextR>
            <View style={s.meta}>
              <Clock3 size={12} color={C.muted} />
              <TextR style={s.metaText}>{task.time}</TextR>
              <TextR style={s.category}>{task.category}</TextR>
              {task.recurrence === "daily" ? (
                <Repeat2 size={12} color={C.muted} />
              ) : null}
            </View>
          </View>
        </AnimatedPressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Edit ${task.title}`}
          onPress={() => onEdit(task)}
          style={({ pressed }) => [s.editButton, pressed && s.pressed]}
        >
          <Icon size={19} color={task.done ? C.greenDark : C.primary} />
          <PenLine size={10} color={C.muted} />
        </Pressable>
      </View>
    );
  },
  (previous, next) =>
    previous.onToggle === next.onToggle &&
    previous.onEdit === next.onEdit &&
    previous.task.id === next.task.id &&
    previous.task.title === next.task.title &&
    previous.task.category === next.task.category &&
    previous.task.done === next.task.done &&
    previous.task.timeMinutes === next.task.timeMinutes &&
    previous.task.recurrence === next.task.recurrence,
);

function Choice({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[s.choice, selected && s.choiceSelected]}
    >
      <TextR style={[s.choiceText, selected && s.choiceTextSelected]}>
        {label}
      </TextR>
    </Pressable>
  );
}

function TaskEditor({
  task,
  onClose,
}: {
  task: Task | null;
  onClose: () => void;
}) {
  const { createTask, updateTask, archiveTask } = useTasks();
  const [title, setTitle] = useState(task?.title ?? "");
  const [category, setCategory] = useState<TaskCategory>(
    task?.category ?? "Mind",
  );
  const [recurrence, setRecurrence] = useState<"daily" | "once">(
    task?.recurrence ?? "once",
  );
  const [anytime, setAnytime] = useState(task?.timeMinutes === undefined);
  const [time, setTime] = useState(
    task?.timeMinutes === undefined
      ? "09:00"
      : `${String(Math.floor(task.timeMinutes / 60)).padStart(2, "0")}:${String(task.timeMinutes % 60).padStart(2, "0")}`,
  );
  const [error, setError] = useState("");
  const insets = useSafeAreaInsets();
  const save = () => {
    const trimmed = title.trim();
    if (!trimmed || trimmed.length > 120) {
      setError("Enter an intention between 1 and 120 characters.");
      return;
    }
    if (!anytime && !/^([01]?\d|2[0-3]):[0-5]\d$/.test(time.trim())) {
      setError("Enter a valid 24-hour time, such as 06:45.");
      return;
    }
    const [hour, minute] = time.trim().split(":").map(Number);
    const input: TaskInput = {
      title: trimmed,
      category,
      recurrence,
      timeMinutes: anytime ? undefined : hour * 60 + minute,
    };
    if (task ? updateTask(task.id, input) : createTask(input)) onClose();
    else setError("This intention could not be saved. Please try again.");
  };
  const remove = () =>
    Alert.alert(
      task?.recurrence === "daily"
        ? "Stop this daily habit?"
        : "Remove this intention?",
      "Previous completion records will be kept.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            if (task) archiveTask(task.id);
            onClose();
          },
        },
      ],
    );
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={s.modalBackdrop}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View
          accessibilityViewIsModal
          style={[
            s.editor,
            { paddingBottom: Math.max(insets.bottom, 20), maxHeight: "90%" },
          ]}
        >
          <ScrollView keyboardShouldPersistTaps="handled">
            <TextR style={s.editorTitle}>
              {task ? "Edit intention" : "A mindful intention"}
            </TextR>
            <TextR style={s.label}>What would you like to do?</TextR>
            <TextInput
              accessibilityLabel="Intention title"
              value={title}
              onChangeText={setTitle}
              maxLength={120}
              multiline
              placeholder="Give your attention to…"
              placeholderTextColor={C.muted}
              style={s.input}
            />
            <TextR style={s.label}>Category</TextR>
            <View style={s.choices}>
              {TASK_CATEGORIES.map((item) => (
                <Choice
                  key={item}
                  label={item}
                  selected={item === category}
                  onPress={() => setCategory(item)}
                />
              ))}
            </View>
            <TextR style={s.label}>Repeat</TextR>
            <View style={s.choices}>
              <Choice
                label="One-time"
                selected={recurrence === "once"}
                onPress={() => setRecurrence("once")}
              />
              <Choice
                label="Daily habit"
                selected={recurrence === "daily"}
                onPress={() => setRecurrence("daily")}
              />
            </View>
            <TextR style={s.help}>
              {recurrence === "daily"
                ? "A fresh completion each day."
                : "Stays on your list until completed."}
            </TextR>
            <TextR style={s.label}>Time</TextR>
            <View style={s.choices}>
              <Choice
                label="Anytime"
                selected={anytime}
                onPress={() => setAnytime(true)}
              />
              <Choice
                label="Set time"
                selected={!anytime}
                onPress={() => setAnytime(false)}
              />
            </View>
            {!anytime ? (
              <TextInput
                accessibilityLabel="Scheduled time in 24-hour format"
                value={time}
                onChangeText={setTime}
                keyboardType="numbers-and-punctuation"
                maxLength={5}
                placeholder="06:45"
                style={s.input}
              />
            ) : null}
            <TextR style={s.help}>
              Times help organize your day. They do not create reminders.
            </TextR>
            {error ? (
              <TextR accessibilityLiveRegion="polite" style={s.error}>
                {error}
              </TextR>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={save}
              style={({ pressed }) => [s.primaryButton, pressed && s.pressed]}
            >
              <TextR style={s.primaryText}>Save intention</TextR>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={s.textButton}
            >
              <TextR style={s.link}>Cancel</TextR>
            </Pressable>
            {task ? (
              <Pressable
                accessibilityRole="button"
                onPress={remove}
                style={s.textButton}
              >
                <TextR style={s.error}>Remove intention</TextR>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function Today() {
  const store = useTasks();
  const { tasks, today, done, toggleCompletion } = store;
  const focused = usePathname() === "/today";
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(AppState.currentState === "active");
  const [expanded, setExpanded] = useState(false);
  const [editor, setEditor] = useState<{ task: Task | null } | null>(null);
  const dockHeight = useDockHeight();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) =>
      setActive(state === "active"),
    );
    return () => subscription.remove();
  }, []);
  const edit = useCallback((task: Task) => setEditor({ task }), []);
  const renderTask = useCallback(
    ({ item }: { item: Task }) => (
      <TaskRow task={item} onToggle={toggleCompletion} onEdit={edit} />
    ),
    [edit, toggleCompletion],
  );
  const sections = useMemo(
    () => [
      {
        title: "Your intentions",
        completed: false,
        data: tasks.filter((task) => !task.done),
      },
      {
        title: `Completed · ${done}`,
        completed: true,
        data: expanded ? tasks.filter((task) => task.done) : [],
      },
    ],
    [tasks, done, expanded],
  );
  const [year, month, day] = today.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const { practice: verse } = useContent();
  const ratio = tasks.length ? done / tasks.length : 0;
  const confirmReset = () =>
    Alert.alert(
      "Reset saved intentions?",
      "Unreadable task data will be replaced with the four starter intentions. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset intentions",
          style: "destructive",
          onPress: store.reset,
        },
      ],
    );
  const header = (
    <View>
      <Header eyebrow="Today" showActions={false} />
      <View style={s.hero}>
        <View style={s.heroCopy}>
          <TextR style={s.title}>Today</TextR>
          <TextR style={s.subtitle}>
            {date.toLocaleDateString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </TextR>
          <View style={s.dailyPill}>
            <Leaf size={11} color={C.primary} />
            <TextR style={s.dailyText}>DAILY INTENTIONS</TextR>
          </View>
        </View>
        <AruMascot
          clip="tasks_pointing"
          size={106}
          glow="day"
          animated={focused && active && !reduceMotion}
        />
      </View>
      <View style={s.teaching}>
        <TextR serif style={s.teachingText}>
          {verse.takeaway}
        </TextR>
        <TextR style={s.source}>
          {verse.referenceLabel ?? `GITA ${verse.chapter}.${verse.verse}`} ·
          DAILY TEACHING
        </TextR>
      </View>
      {store.loadError ? (
        <View style={s.notice}>
          <TextR style={s.taskTitle}>
            Saved intentions couldn’t be opened.
          </TextR>
          <TextR style={s.help}>
            Your saved data has been kept. Retry, or reset to starter
            intentions.
          </TextR>
          <View style={s.choices}>
            <Pressable
              accessibilityRole="button"
              onPress={store.retry}
              style={s.textButton}
            >
              <TextR style={s.link}>Retry</TextR>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={confirmReset}
              style={s.textButton}
            >
              <TextR style={s.error}>Reset</TextR>
            </Pressable>
          </View>
        </View>
      ) : !store.ready ? (
        <View style={s.notice}>
          <ActivityIndicator color={C.saffron} />
          <TextR style={s.help}>Preparing your intentions…</TextR>
        </View>
      ) : (
        <>
          <View style={s.progressCard}>
            <View style={s.progressTop}>
              <TextR style={s.progressTitle}>Daily rhythm</TextR>
              <TextR accessibilityLiveRegion="polite" style={s.progressCount}>
                {tasks.length
                  ? `${done} of ${tasks.length} complete`
                  : "No intentions yet"}
              </TextR>
            </View>
            <View
              accessibilityRole="progressbar"
              accessibilityLabel="Today's intentions"
              accessibilityValue={{
                min: 0,
                max: tasks.length || 1,
                now: done,
                text: tasks.length
                  ? `${done} of ${tasks.length} complete`
                  : "No intentions yet",
              }}
              style={s.track}
            >
              <View style={[s.fill, { width: `${ratio * 100}%` }]} />
            </View>
            <TextR style={s.help}>
              {tasks.length === 0
                ? "Make room for one meaningful action."
                : done === tasks.length
                  ? "All intentions fulfilled for today."
                  : "One thoughtful action at a time."}
            </TextR>
          </View>
          {store.saveError ? (
            <View style={s.notice}>
              <TextR style={s.error}>
                Changes haven’t been saved on this device yet.
              </TextR>
              <Pressable
                accessibilityRole="button"
                onPress={store.retry}
                style={s.textButton}
              >
                <TextR style={s.link}>Retry save</TextR>
              </Pressable>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <DawnMeshBackdrop />
      <SectionList
        sections={store.ready ? sections : []}
        keyExtractor={(task) => task.id}
        renderItem={renderTask}
        stickySectionHeadersEnabled={false}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: dockHeight + Math.max(insets.bottom + 8, 18) + 24,
        }}
        ListHeaderComponent={header}
        renderSectionHeader={({ section }) =>
          section.completed ? (
            done > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                accessibilityLabel={`${section.title}, ${expanded ? "collapse" : "expand"}`}
                onPress={() => setExpanded((value) => !value)}
                style={s.sectionHeader}
              >
                <TextR style={s.sectionTitle}>{section.title}</TextR>
                <ChevronDown
                  size={18}
                  color={C.primary}
                  style={
                    expanded ? { transform: [{ rotate: "180deg" }] } : undefined
                  }
                />
              </Pressable>
            ) : null
          ) : (
            <View style={s.sectionHeader}>
              <TextR style={s.sectionTitle}>{section.title}</TextR>
              <TextR style={s.help}>{tasks.length - done} pending</TextR>
            </View>
          )
        }
        ListFooterComponent={
          store.ready ? (
            <View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add mindful task"
                onPress={() => setEditor({ task: null })}
                style={({ pressed }) => [s.primaryButton, pressed && s.pressed]}
              >
                <Plus size={20} color="white" />
                <TextR style={s.primaryText}>Add mindful task</TextR>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open evening reflection"
                onPress={() => router.navigate("/night")}
                style={({ pressed }) => [s.evening, pressed && s.pressed]}
              >
                <Moon size={20} color={C.primary} />
                <View style={s.taskCopy}>
                  <TextR style={s.taskTitle}>Evening reflection</TextR>
                  <TextR style={s.help}>
                    Close your day with a little gratitude.
                  </TextR>
                </View>
                <ChevronRight size={18} color={C.primary} />
              </Pressable>
            </View>
          ) : null
        }
      />
      {editor ? (
        <TaskEditor task={editor.task} onClose={() => setEditor(null)} />
      ) : null}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.surface },
  hero: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  heroCopy: { flex: 1 },
  title: { color: C.ink, fontSize: 28, fontWeight: "800" },
  subtitle: { color: C.inkSoft, fontSize: 14, marginTop: 4 },
  dailyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: "#FFF0E0",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginTop: 10,
  },
  dailyText: {
    fontSize: 9,
    letterSpacing: 1,
    color: C.primary,
    fontWeight: "800",
  },
  teaching: {
    backgroundColor: "#FFF9F2",
    borderRadius: 22,
    padding: 17,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#F6DBC7",
  },
  teachingText: { color: C.ink, fontSize: 18, lineHeight: 26 },
  source: {
    color: C.primary,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.6,
    marginTop: 8,
  },
  progressCard: {
    backgroundColor: "#FFFCF8",
    borderRadius: 22,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#F4DDCC",
  },
  progressTop: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  progressTitle: { color: C.ink, fontSize: 16, fontWeight: "800" },
  progressCount: { color: C.primary, fontSize: 12, fontWeight: "700" },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#EEDCCC",
    overflow: "hidden",
    marginTop: 12,
    marginBottom: 6,
  },
  fill: { height: "100%", backgroundColor: C.saffron, borderRadius: 3 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    minHeight: 48,
    gap: 8,
  },
  sectionTitle: { fontSize: 13, color: C.inkSoft, fontWeight: "800" },
  taskCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFCF8",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F3DECE",
    marginBottom: 10,
    shadowColor: "#8C4010",
    shadowOpacity: 0.07,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  taskMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    paddingVertical: 16,
    paddingLeft: 14,
    paddingRight: 4,
  },
  checkbox: {
    width: 25,
    height: 25,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: "#D6BAA4",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxDone: { backgroundColor: "#5C9D68", borderColor: "#5C9D68" },
  taskCopy: { flex: 1 },
  taskTitle: { color: C.ink, fontSize: 14, fontWeight: "700", lineHeight: 20 },
  taskDone: { textDecorationLine: "line-through", color: C.muted },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 6,
  },
  metaText: { color: C.muted, fontSize: 11 },
  category: {
    color: C.greenDark,
    fontSize: 10,
    backgroundColor: "#EAF3E7",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  editButton: {
    minWidth: 48,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  primaryButton: {
    minHeight: 52,
    padding: 14,
    borderRadius: 26,
    backgroundColor: C.saffron,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
    marginBottom: 12,
  },
  primaryText: {
    color: "white",
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
  },
  pressed: { opacity: 0.75 },
  evening: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: "#FFF1E5",
    marginTop: 4,
  },
  help: { color: C.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  notice: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#FFF2E5",
    marginVertical: 8,
  },
  error: { color: "#A53419", fontSize: 13, lineHeight: 19 },
  link: { color: C.primary, fontSize: 14, fontWeight: "700" },
  textButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(43, 27, 18, 0.4)",
  },
  editor: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 22,
  },
  editorTitle: {
    color: C.ink,
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 14,
  },
  label: {
    color: C.inkSoft,
    fontSize: 13,
    fontWeight: "700",
    marginTop: 12,
    marginBottom: 8,
  },
  input: {
    color: C.ink,
    fontSize: 16,
    minHeight: 50,
    borderWidth: 1,
    borderColor: "#DFC8B7",
    borderRadius: 14,
    padding: 13,
    backgroundColor: "#FFFCF8",
    marginVertical: 4,
  },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: "#F5E9DD",
    borderWidth: 1,
    borderColor: "#ECD5C2",
  },
  choiceSelected: { backgroundColor: C.saffron, borderColor: C.saffron },
  choiceText: { color: C.inkSoft, fontSize: 13, fontWeight: "700" },
  choiceTextSelected: { color: "white" },
});
