import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { useGitaProgress } from './gita-store';
import { useTasks } from './tasks-store';
import { useRitual } from './ritual-store';
import { useContent } from './content-store';
import { localDateKey } from '@/data/gita-verses';
import { parseProgress, QUIZ_STORAGE_KEY } from '@/features/quiz/storage';
import { onNotificationScheduleChanged, syncEngagementNotifications } from '@/services/engagement-notifications';

import { deferOwnerNavigation } from '@/services/owner-opening';
import * as Network from 'expo-network';
import { useLanguage } from '@/i18n/provider';
import { useOnboarding } from '@/features/onboarding/provider';
import { needsIntroduction } from '@/features/onboarding/model';
import { useAlarmPresentation } from '@/navigation/alarm-presentation';
import { getAlarmPresentationState } from '@/services/alarm';
import { DESTINATIONS, parseOwnerPayload } from '../../shared/notifications';
import { cacheOwnerDeviceToken, configureOwnerChannels, handleOwnerOpening, hydrateOwnerNotifications, onOwnerStatus, ownerPresentationEnabled, ownerStatus, peekOwnerDestination, syncOwnerRegistration, takeOwnerDestination } from '@/services/owner-notifications';

// A task or practice reminder must remain visible when the app happens to be open;
// otherwise a user can miss the exact moment they are actively testing.
if (Platform.OS !== 'web') Notifications.setNotificationHandler({ handleNotification: async notification => {
  const payload = parseOwnerPayload(notification.request.content.data);
  const owner = !!payload || notification.request.content.data?.kind === 'owner-announcement';
  const task = !owner && notification.request.content.data?.kind === 'task-reminder';
  const visible = !owner || !!payload && ownerPresentationEnabled();
  return { shouldShowBanner: visible, shouldShowList: visible, shouldPlaySound: visible && (task || owner && (payload?.sound ?? notification.request.content.sound != null)), ...(task ? { priority: Notifications.AndroidNotificationPriority.HIGH } : {}), shouldSetBadge: false };
} });

export function NotificationProvider({ children }: React.PropsWithChildren) {
  const gita = useGitaProgress(), tasks = useTasks(), ritual = useRitual();
  const content = useContent(), { language } = useLanguage(), onboarding = useOnboarding(), alarm = useAlarmPresentation();
  const [owner, updateOwner] = useState(ownerStatus), [routingTick, setRoutingTick] = useState(0);
  const gate = useRef(true);
  useEffect(() => { gate.current = deferOwnerNavigation(!!onboarding.record && !needsIntroduction(onboarding.record), alarm.active, true); }, [alarm.active, onboarding.record]);
  useEffect(() => onOwnerStatus(() => { updateOwner(ownerStatus()); setRoutingTick(n => n + 1); }), []);
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sync = async (refreshToken = true) => {
      const quiz = parseProgress(await AsyncStorage.getItem(QUIZ_STORAGE_KEY));
      const engagement = gita.ready && content.ready ? { practiceDate: [...gita.completedDates].sort().at(-1) ?? null, quizDate: quiz.history.map(r => r.date).sort().at(-1) ?? null, streak: gita.streak, hasSaved: content.snapshot.saved.length > 0 } : null;
      await syncOwnerRegistration(language, engagement, refreshToken);
    };
    const queue = (refreshToken = true) => { clearTimeout(timer); timer = setTimeout(() => { void sync(refreshToken).catch(() => undefined); }, 750); };
    void hydrateOwnerNotifications().then(configureOwnerChannels).then(() => queue()).catch(() => undefined);
    const foreground = AppState.addEventListener('change', state => { if (state === 'active') queue(); });
    const network = Network.addNetworkStateListener(state => { if (state.isConnected) queue(); });
    const token = Notifications.addPushTokenListener(native => { void cacheOwnerDeviceToken(native).then(changed => { if (changed) queue(false); }).catch(() => undefined); });
    const changed = onNotificationScheduleChanged(() => queue());
    const retry = setInterval(() => { if (AppState.currentState === 'active') queue(); }, 60000);
    return () => { clearTimeout(timer); clearInterval(retry); foreground.remove(); network.remove(); token.remove(); changed(); };
  }, [language, gita.ready, gita.completedDates, gita.streak, content.ready, content.snapshot.saved.length, owner.enabled]);
  useEffect(() => {
    if (gate.current || !peekOwnerDestination()) return;
    let alive = true;
    const timer = setTimeout(() => {
      if (gate.current || getAlarmPresentationState().active || AppState.currentState !== 'active' || !alive) return;
      const destination = peekOwnerDestination();
      if (destination) { router.push(DESTINATIONS[destination] as never); void takeOwnerDestination(destination); }
    }, 0);
    return () => { alive = false; clearTimeout(timer); };
  }, [alarm.active, onboarding.record, routingTick]);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sync = async () => {
      if (!gita.ready || !tasks.ready || !ritual.alarmReady) return;
      const quiz = parseProgress(await AsyncStorage.getItem(QUIZ_STORAGE_KEY));
      const today = localDateKey();
      await syncEngagementNotifications({ practiceCompleted: gita.completedDates.has(today), quizCompleted: quiz.history.some(round => round.date === today), hasSavedTeaching: content.snapshot.saved.length > 0, tasks: tasks.tasks, alarmEnabled: ritual.alarmEnabled, alarmTime: ritual.alarmTime });
    };
    void sync().catch(() => undefined);
    const app = AppState.addEventListener('change', state => { if (state === 'active') void sync().catch(() => undefined); });
    const changed = onNotificationScheduleChanged(() => { void sync().catch(() => undefined); });
    return () => { app.remove(); changed(); };
  }, [gita.ready, gita.completedDates, tasks.ready, tasks.tasks, ritual.alarmReady, ritual.alarmEnabled, ritual.alarmTime, content.snapshot.saved.length]);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const open = (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data;
      const payload = parseOwnerPayload(data);
      if (payload) { void handleOwnerOpening(payload).catch(() => undefined); return; }
      const url = data?.url;
      if (!gate.current && typeof url === 'string' && Object.values(DESTINATIONS).includes(url as never)) router.push(url as never);
    };
    const latest = Notifications.getLastNotificationResponse(); if (latest) open(latest);
    const sub = Notifications.addNotificationResponseReceivedListener(open); return () => sub.remove();
  }, []);
  return <>{children}</>;
}
