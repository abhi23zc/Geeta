import { useLanguage } from '@/i18n/provider';
import { taskDisplayTitle } from '@/i18n/task-copy';
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
  useWindowDimensions,
  View,
} from "react-native";
import { usePathname, useRouter } from "expo-router";
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock3,
  Dumbbell,
  Leaf,
  Moon,
  Pencil,
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
    const { t: translate, text: translateText, language } = useLanguage();
    const CategoryIcon = CATEGORY_ICONS[task.category];
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
          accessibilityLabel={`${taskDisplayTitle(task, language)}, ${translateText(task.time)}, ${task.recurrence === "daily" ? translate("daily habit") : translate("one-time intention")}`}
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
              <Check size={16} color="white" strokeWidth={3} />
            ) : null}
          </View>
          <View style={s.taskCopy}>
            <TextR style={[s.taskTitle, task.done && s.taskDone]} numberOfLines={2}>
              {taskDisplayTitle(task, language)}
            </TextR>
            <View style={s.meta}>
              <Clock3 size={12} color={C.muted} />
              <TextR style={s.metaText}>{translateText(task.time)}</TextR>
              <View style={s.categoryTag}>
                <CategoryIcon size={11} color={C.greenDark} strokeWidth={2.2} />
                <TextR style={s.categoryText}>{translateText(task.category)}</TextR>
              </View>
              {task.recurrence === "daily" ? (
                <View style={s.recurrenceTag}>
                  <Repeat2 size={11} color={C.muted} />
                  <TextR style={s.recurrenceText}>{translate("Daily")}</TextR>
                </View>
              ) : null}
            </View>
          </View>
        </AnimatedPressable>

        {/* Explicit and Prominent Edit Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={translate('editTask', { title: taskDisplayTitle(task, language) })}
          onPress={() => onEdit(task)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={({ pressed }) => [s.editButton, pressed && s.pressed]}
        >
          <View style={s.editPencilBadge}>
            <Pencil size={15} color={C.primary} strokeWidth={2.4} />
          </View>
        </Pressable>
      </View>
    );
  },
  (previous, next) =>
    previous.onToggle === next.onToggle &&
    previous.onEdit === next.onEdit &&
    previous.task.id === next.task.id &&
    previous.task.title === next.task.title &&
    previous.task.templateId === next.task.templateId &&
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

function TimeSelector({
  hour,
  minute,
  meridiem,
  onHourChange,
  onMinuteChange,
  onMeridiemChange,
  onPresetSelect,
}: {
  hour: number;
  minute: number;
  meridiem: "AM" | "PM";
  onHourChange: (h: number) => void;
  onMinuteChange: (m: number) => void;
  onMeridiemChange: (m: "AM" | "PM") => void;
  onPresetSelect: (h: number, m: number, med: "AM" | "PM") => void;
}) {
  const { t: translate, text: translateText } = useLanguage();
  const PRESETS = [
    { label: translate("Dawn 6:00 AM"), h: 6, m: 0, med: "AM" as const },
    { label: translate("Morning 8:30 AM"), h: 8, m: 30, med: "AM" as const },
    { label: translate("Noon 12:00 PM"), h: 12, m: 0, med: "PM" as const },
    { label: translate("Evening 5:30 PM"), h: 5, m: 30, med: "PM" as const },
    { label: translate("Night 9:00 PM"), h: 9, m: 0, med: "PM" as const },
  ];

  const updateHour = (dir: 1 | -1) => {
    const next = dir === 1 ? (hour === 12 ? 1 : hour + 1) : (hour === 1 ? 12 : hour - 1);
    onHourChange(next);
  };

  const updateMinute = (dir: 1 | -1) => {
    const step = 5;
    const next = (minute + dir * step + 60) % 60;
    onMinuteChange(next);
  };

  return (
    <View style={s.timePickerCard}>
      <View style={s.timePickerRow}>
        {/* Hour Stepper */}
        <View style={s.timeStepCol}>
          <Pressable
            accessibilityLabel={translate("Increase hour")}
            onPress={() => updateHour(1)}
            hitSlop={{ top: 8, bottom: 8, left: 10, right: 10 }}
            style={({ pressed }) => [s.timeChevron, pressed && s.pressed]}
          >
            <ChevronUp size={20} color={C.primary} strokeWidth={2.5} />
          </Pressable>
          <View style={s.timeDisplayBox}>
            <TextR serif style={s.timeDisplayText}>
              {String(hour).padStart(2, "0")}
            </TextR>
          </View>
          <Pressable
            accessibilityLabel={translate("Decrease hour")}
            onPress={() => updateHour(-1)}
            hitSlop={{ top: 8, bottom: 8, left: 10, right: 10 }}
            style={({ pressed }) => [s.timeChevron, pressed && s.pressed]}
          >
            <ChevronDown size={20} color={C.primary} strokeWidth={2.5} />
          </Pressable>
        </View>

        <TextR serif style={s.timeColon}>
          :
        </TextR>

        {/* Minute Stepper */}
        <View style={s.timeStepCol}>
          <Pressable
            accessibilityLabel={translate("Increase minute")}
            onPress={() => updateMinute(1)}
            hitSlop={{ top: 8, bottom: 8, left: 10, right: 10 }}
            style={({ pressed }) => [s.timeChevron, pressed && s.pressed]}
          >
            <ChevronUp size={20} color={C.primary} strokeWidth={2.5} />
          </Pressable>
          <View style={s.timeDisplayBox}>
            <TextR serif style={s.timeDisplayText}>
              {String(minute).padStart(2, "0")}
            </TextR>
          </View>
          <Pressable
            accessibilityLabel={translate("Decrease minute")}
            onPress={() => updateMinute(-1)}
            hitSlop={{ top: 8, bottom: 8, left: 10, right: 10 }}
            style={({ pressed }) => [s.timeChevron, pressed && s.pressed]}
          >
            <ChevronDown size={20} color={C.primary} strokeWidth={2.5} />
          </Pressable>
        </View>

        {/* AM / PM Selector */}
        <View style={s.modalMeridiemTrack}>
          {(["AM", "PM"] as const).map((v) => {
            const active = meridiem === v;
            return (
              <Pressable
                key={v}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                onPress={() => onMeridiemChange(v)}
                style={[s.modalMeridiemBtn, active && s.modalMeridiemBtnActive]}
              >
                <TextR style={[s.modalMeridiemTxt, active && s.modalMeridiemTxtActive]}>
                  {v}
                </TextR>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Preset Chips */}
      <View style={s.presetWrap}>
        {PRESETS.map((p) => {
          const isSelected =
            hour === p.h && minute === p.m && meridiem === p.med;
          return (
            <Pressable
              key={p.label}
              onPress={() => onPresetSelect(p.h, p.m, p.med)}
              style={[s.presetChip, isSelected && s.presetChipActive]}
            >
              <TextR style={[s.presetText, isSelected && s.presetTextActive]}>
                {translateText(p.label)}
              </TextR>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function TaskEditor({
  task,
  onClose,
}: {
  task: Task | null;
  onClose: () => void;
}) {
  const { t: translate, text: translateText, language } = useLanguage();
  const { createTask, updateTask, archiveTask } = useTasks();
  const [title, setTitle] = useState(task ? taskDisplayTitle(task, language) : "");
  const [category, setCategory] = useState<TaskCategory>(
    task?.category ?? "Mind",
  );
  const [recurrence, setRecurrence] = useState<"daily" | "once">(
    task?.recurrence ?? "once",
  );
  const [anytime, setAnytime] = useState(task?.timeMinutes === undefined);

  // Time picker state (hours, minutes, AM/PM)
  const initialMins = task?.timeMinutes ?? 540; // 9:00 AM
  const initialH24 = Math.floor(initialMins / 60);
  const [hour, setHour] = useState(
    initialH24 > 12 ? initialH24 - 12 : initialH24 === 0 ? 12 : initialH24,
  );
  const [minute, setMinute] = useState(initialMins % 60);
  const [meridiem, setMeridiem] = useState<"AM" | "PM">(
    initialH24 >= 12 ? "PM" : "AM",
  );

  const [error, setError] = useState("");
  const insets = useSafeAreaInsets();

  const handlePresetSelect = (h: number, m: number, med: "AM" | "PM") => {
    setHour(h);
    setMinute(m);
    setMeridiem(med);
  };

  const save = () => {
    const trimmed = title.trim();
    if (!trimmed || trimmed.length > 120) {
      setError("Enter an intention between 1 and 120 characters.");
      return;
    }

    let finalHour24 = hour % 12;
    if (meridiem === "PM") finalHour24 += 12;
    const timeMinutes = anytime ? undefined : finalHour24 * 60 + minute;

    const input: TaskInput = {
      title: trimmed,
      category,
      recurrence,
      timeMinutes,
    };
    if (task ? updateTask(task.id, input) : createTask(input)) onClose();
    else setError("This intention could not be saved. Please try again.");
  };

  const remove = () =>
    Alert.alert(
      task?.recurrence === "daily"
        ? translate("Stop this daily habit?")
        : translate("Remove this intention?"),
      translate("Previous completion records will be kept."),
      [
        { text: translate("Cancel"), style: "cancel" },
        {
          text: translate("Remove"),
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
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={s.editorScrollContent}
          >
            <TextR style={s.editorTitle}>
              {task ? translate("Edit intention") : translate("A mindful intention")}
            </TextR>
            <TextR style={s.label}>{translate("What would you like to do?")}</TextR>
            <TextInput
              accessibilityLabel={translate("Intention title")}
              value={title}
              onChangeText={setTitle}
              maxLength={120}
              multiline
              placeholder={translate("Give your attention to…")}
              placeholderTextColor={C.muted}
              style={s.input}
            />
            <TextR style={s.label}>{translate("Category")}</TextR>
            <View style={s.choices}>
              {TASK_CATEGORIES.map((item) => (
                <Choice
                  key={item}
                  label={translateText(item)}
                  selected={item === category}
                  onPress={() => setCategory(item)}
                />
              ))}
            </View>
            <TextR style={s.label}>{translate("Repeat")}</TextR>
            <View style={s.choices}>
              <Choice
                label={translate("One-time")}
                selected={recurrence === "once"}
                onPress={() => setRecurrence("once")}
              />
              <Choice
                label={translate("Daily habit")}
                selected={recurrence === "daily"}
                onPress={() => setRecurrence("daily")}
              />
            </View>
            <TextR style={s.help}>
              {recurrence === "daily"
                ? translate("A fresh completion each day.")
                : translate("Stays on your list until completed.")}
            </TextR>

            <TextR style={s.label}>{translate("Time")}</TextR>
            <View style={s.choices}>
              <Choice
                label={translate("Anytime")}
                selected={anytime}
                onPress={() => setAnytime(true)}
              />
              <Choice
                label={translate("Set time")}
                selected={!anytime}
                onPress={() => setAnytime(false)}
              />
            </View>

            {/* Seamless Interactive Time Selector (No manual typing) */}
            {!anytime ? (
              <TimeSelector
                hour={hour}
                minute={minute}
                meridiem={meridiem}
                onHourChange={setHour}
                onMinuteChange={setMinute}
                onMeridiemChange={setMeridiem}
                onPresetSelect={handlePresetSelect}
              />
            ) : null}

            <TextR style={s.help}>
               {translate("Times help organize your day. They do not create reminders.")} </TextR>
            {error ? (
              <TextR accessibilityLiveRegion="polite" style={s.error}>
                {translateText(error)}
              </TextR>
            ) : null}
            <Pressable
              accessibilityRole="button"
              onPress={save}
              style={({ pressed }) => [s.primaryButton, pressed && s.pressed]}
            >
              <TextR style={s.primaryText}>{translate("Save intention")}</TextR>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={s.textButton}
            >
              <TextR style={s.link}>{translate("Cancel")}</TextR>
            </Pressable>
            {task ? (
              <Pressable
                accessibilityRole="button"
                onPress={remove}
                style={s.textButton}
              >
                <TextR style={s.error}>{translate("Remove intention")}</TextR>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function Today() {
  const { formatDate, t: translate, text: translateText } = useLanguage();
  const store = useTasks();
  const { tasks, today, done, toggleCompletion } = store;
  const focused = usePathname() === "/today";
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(AppState.currentState === "active");
  const [expanded, setExpanded] = useState(false);
  const [editor, setEditor] = useState<{ task: Task | null } | null>(null);
  const dockHeight = useDockHeight();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isSmall = width < 360;
  const isTablet = width >= 768;
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
        title: translate("Your intentions"),
        completed: false,
        data: tasks.filter((task) => !task.done),
      },
      {
        title: translate('completedSection', { count: done }),
        completed: true,
        data: expanded ? tasks.filter((task) => task.done) : [],
      },
    ],
    [tasks, done, expanded, translate],
  );

  const [year, month, day] = today.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const { practice: verse } = useContent();
  const ratio = tasks.length ? done / tasks.length : 0;

  const confirmReset = () =>
    Alert.alert(
      translate("Reset saved intentions?"),
      translate("Unreadable task data will be replaced with the four starter intentions. This cannot be undone."),
      [
        { text: translate("Cancel"), style: "cancel" },
        {
          text: translate("Reset intentions"),
          style: "destructive",
          onPress: store.reset,
        },
      ],
    );

  const header = (
    <View style={s.headerWrap}>
      <Header eyebrow={translate("Today")} showActions={false} />
      <View style={s.hero}>
        <View style={s.heroCopy}>
          <TextR style={[s.title, isSmall && s.titleSmall]}>{translate("Today")}</TextR>
          <TextR style={[s.subtitle, isSmall && s.subtitleSmall]}>
            {formatDate(date, {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </TextR>
          <View style={s.dailyPill}>
            <Leaf size={11} color={C.primary} />
            <TextR style={s.dailyText}>{translate("DAILY INTENTIONS")}</TextR>
          </View>
        </View>
        <AruMascot
          clip="tasks_pointing"
          size={isSmall ? 88 : isTablet ? 116 : 104}
          glow="day"
          animated={focused && active && !reduceMotion}
        />
      </View>

      <View style={[s.teaching, isSmall && s.teachingSmall]}>
        <TextR serif style={[s.teachingText, isSmall && s.teachingTextSmall]}>
          {verse.takeaway}
        </TextR>
        <TextR style={s.source}>
          {verse.referenceLabel ?? `GITA ${verse.chapter}.${verse.verse}`}  {translate("· DAILY TEACHING")} </TextR>
      </View>

      {store.loadError ? (
        <View style={s.notice}>
          <TextR style={s.taskTitle}>
             {translate("Saved intentions couldn’t be opened.")} </TextR>
          <TextR style={s.help}>
             {translate("Your saved data has been kept. Retry, or reset to starter intentions.")} </TextR>
          <View style={s.choices}>
            <Pressable
              accessibilityRole="button"
              onPress={store.retry}
              style={s.textButton}
            >
              <TextR style={s.link}>{translate("Retry")}</TextR>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={confirmReset}
              style={s.textButton}
            >
              <TextR style={s.error}>{translate("Reset")}</TextR>
            </Pressable>
          </View>
        </View>
      ) : !store.ready ? (
        <View style={s.notice}>
          <ActivityIndicator color={C.saffron} />
          <TextR style={s.help}>{translate("Preparing your intentions…")}</TextR>
        </View>
      ) : (
        <>
          <View style={s.progressCard}>
            <View style={s.progressTop}>
              <TextR style={s.progressTitle}>{translate("Daily rhythm")}</TextR>
              <TextR accessibilityLiveRegion="polite" style={s.progressCount}>
                {tasks.length
                  ? translate('completedCount', { done, total: tasks.length })
                  : translate("No intentions yet")}
              </TextR>
            </View>
            <View
              accessibilityRole="progressbar"
              accessibilityLabel={translate("Today's intentions")}
              accessibilityValue={{
                min: 0,
                max: tasks.length || 1,
                now: done,
                text: tasks.length
                  ? `${done} of ${tasks.length} complete`
                  : translate("No intentions yet"),
              }}
              style={s.track}
            >
              <View style={[s.fill, { width: `${ratio * 100}%` }]} />
            </View>
            <TextR style={s.help}>
              {tasks.length === 0
                ? translate("Make room for one meaningful action.")
                : done === tasks.length
                  ? translate("All intentions fulfilled for today.")
                  : translate("One thoughtful action at a time.")}
            </TextR>
          </View>
          {store.saveError ? (
            <View style={s.notice}>
              <TextR style={s.error}>
                 {translate("Changes haven’t been saved on this device yet.")} </TextR>
              <Pressable
                accessibilityRole="button"
                onPress={store.retry}
                style={s.textButton}
              >
                <TextR style={s.link}>{translate("Retry save")}</TextR>
              </Pressable>
            </View>
          ) : null}
        </>
      )}
    </View>
  );

  const bottomPadding = Math.max(dockHeight + insets.bottom + 36, 140);

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
          paddingHorizontal: isSmall ? 14 : isTablet ? 32 : 20,
          paddingBottom: bottomPadding,
          maxWidth: 640,
          alignSelf: "center",
          width: "100%",
        }}
        ListHeaderComponent={header}
        renderSectionHeader={({ section }) =>
          section.completed ? (
            done > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                accessibilityLabel={translateText(`${section.title}, ${expanded ? translate("collapse") : translate("expand")}`)}
                onPress={() => setExpanded((value) => !value)}
                style={s.sectionHeader}
              >
                <TextR style={s.sectionTitle}>{translateText(section.title)}</TextR>
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
              <TextR style={s.sectionTitle}>{translateText(section.title)}</TextR>
              <TextR style={s.help}>{translate('pendingCount', { count: tasks.length - done })}</TextR>
            </View>
          )
        }
        ListFooterComponent={
          store.ready ? (
            <View style={s.footerContainer}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={translate("Add mindful task")}
                onPress={() => setEditor({ task: null })}
                style={({ pressed }) => [
                  s.primaryButton,
                  isSmall && s.primaryButtonSmall,
                  pressed && s.pressed,
                ]}
              >
                <Plus size={20} color="white" strokeWidth={2.5} />
                <TextR style={[s.primaryText, isSmall && s.primaryTextSmall]}>
                   {translate("Add mindful task")} </TextR>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={translate("Open evening reflection")}
                onPress={() => router.navigate("/night")}
                style={({ pressed }) => [s.evening, pressed && s.pressed]}
              >
                <View style={s.eveningIconWrap}>
                  <Moon size={20} color={C.primary} strokeWidth={2.2} />
                </View>
                <View style={s.taskCopy}>
                  <TextR style={s.taskTitle}>{translate("Evening reflection")}</TextR>
                  <TextR style={s.help}>
                     {translate("Close your day with a little gratitude.")} </TextR>
                </View>
                <ChevronRight size={18} color={C.primary} strokeWidth={2.4} />
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
  headerWrap: {
    width: "100%",
  },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  heroCopy: { flex: 1, minWidth: 0, paddingRight: 8 },
  title: { color: C.ink, fontSize: 28, fontWeight: "800", letterSpacing: -0.6 },
  titleSmall: { fontSize: 24 },
  subtitle: { color: C.inkSoft, fontSize: 14, marginTop: 4, fontWeight: "500" },
  subtitleSmall: { fontSize: 12.5 },
  dailyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    backgroundColor: "#FFF0E0",
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(235,120,60,0.15)",
  },
  dailyText: {
    fontSize: 9,
    letterSpacing: 1.1,
    color: C.primary,
    fontWeight: "900",
  },
  teaching: {
    backgroundColor: "#FFF9F2",
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(215, 150, 100, 0.25)",
    borderBottomWidth: 2,
    shadowColor: "#8C4010",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  teachingSmall: { padding: 14, borderRadius: 18 },
  teachingText: { color: C.ink, fontSize: 17, lineHeight: 25, letterSpacing: -0.2 },
  teachingTextSmall: { fontSize: 15, lineHeight: 22 },
  source: {
    color: C.primary,
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginTop: 8,
  },
  progressCard: {
    backgroundColor: "#FFFCF8",
    borderRadius: 22,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(215, 150, 100, 0.2)",
    borderBottomWidth: 2,
    shadowColor: "#8C4010",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  progressTop: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  progressTitle: { color: C.ink, fontSize: 16, fontWeight: "800" },
  progressCount: { color: C.primary, fontSize: 12.5, fontWeight: "800" },
  track: {
    height: 7,
    borderRadius: 4,
    backgroundColor: "#EEDCCC",
    overflow: "hidden",
    marginTop: 12,
    marginBottom: 6,
  },
  fill: { height: "100%", backgroundColor: C.saffron, borderRadius: 4 },
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
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(215, 150, 100, 0.25)",
    borderBottomWidth: 2,
    marginBottom: 10,
    shadowColor: "#8C4010",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  taskMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 4,
    minWidth: 0,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: "#D6BAA4",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF8F2",
    flexShrink: 0,
  },
  checkboxDone: { backgroundColor: "#5C9D68", borderColor: "#5C9D68" },
  taskCopy: { flex: 1, minWidth: 0 },
  taskTitle: { color: C.ink, fontSize: 14.5, fontWeight: "700", lineHeight: 20 },
  taskDone: { textDecorationLine: "line-through", color: C.muted },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 5,
  },
  metaText: { color: C.muted, fontSize: 11.5, fontWeight: "500" },
  categoryTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EAF3E7",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
  },
  categoryText: {
    color: C.greenDark,
    fontSize: 10.5,
    fontWeight: "700",
  },
  recurrenceTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(0,0,0,0.04)",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
  },
  recurrenceText: {
    color: C.muted,
    fontSize: 10.5,
    fontWeight: "600",
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  editPencilBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(235, 120, 60, 0.1)",
    borderWidth: 1.2,
    borderColor: "rgba(235, 120, 60, 0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  footerContainer: {
    width: "100%",
    paddingTop: 4,
  },
  primaryButton: {
    minHeight: 54,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 27,
    backgroundColor: C.saffron,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(160, 50, 10, 0.4)",
    borderBottomWidth: 3,
    shadowColor: C.saffron,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  primaryButtonSmall: {
    minHeight: 48,
    borderRadius: 24,
    paddingVertical: 11,
  },
  primaryText: {
    color: "white",
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  primaryTextSmall: {
    fontSize: 14,
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.985 }] },
  evening: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderRadius: 20,
    backgroundColor: "#FFF1E5",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.95)",
    borderTopColor: "#FFFFFF",
    borderBottomColor: "rgba(215, 150, 100, 0.2)",
    borderBottomWidth: 2,
    marginTop: 4,
    shadowColor: "#8C4010",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  eveningIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FCE1CE",
    alignItems: "center",
    justifyContent: "center",
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
    backgroundColor: "rgba(43, 27, 18, 0.45)",
  },
  editor: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 22,
    maxWidth: 580,
    width: "100%",
    alignSelf: "center",
    shadowColor: "#2B1B12",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 8,
  },
  editorScrollContent: {
    paddingBottom: 16,
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
  timePickerCard: {
    backgroundColor: "#FFFCF8",
    borderRadius: 20,
    padding: 14,
    marginTop: 8,
    marginBottom: 4,
    borderWidth: 1.2,
    borderColor: "#EBD4C2",
  },
  timePickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  timeStepCol: {
    alignItems: "center",
    width: 60,
  },
  timeChevron: {
    height: 28,
    width: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  timeDisplayBox: {
    width: 58,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#FFF5EC",
    borderWidth: 1,
    borderColor: "#ECD5C2",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 2,
  },
  timeDisplayText: {
    fontSize: 26,
    lineHeight: 30,
    fontWeight: "700",
    color: C.ink,
  },
  timeColon: {
    fontSize: 28,
    lineHeight: 32,
    color: C.primary,
    fontWeight: "700",
    marginHorizontal: 2,
  },
  modalMeridiemTrack: {
    marginLeft: 10,
    padding: 3,
    borderRadius: 18,
    backgroundColor: "#F7E9DD",
    borderWidth: 1,
    borderColor: "#ECD5C2",
  },
  modalMeridiemBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modalMeridiemBtnActive: {
    backgroundColor: C.primary,
    shadowColor: C.primary,
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  modalMeridiemTxt: {
    fontSize: 12,
    fontWeight: "800",
    color: C.muted,
  },
  modalMeridiemTxtActive: {
    color: "white",
  },
  presetWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#ECD5C2",
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "#F8EFE7",
    borderWidth: 1,
    borderColor: "#EBD4C2",
  },
  presetChipActive: {
    backgroundColor: "#FFE5D6",
    borderColor: C.saffron,
  },
  presetText: {
    fontSize: 11,
    fontWeight: "700",
    color: C.inkSoft,
  },
  presetTextActive: {
    color: C.primary,
    fontWeight: "800",
  },
});
