import React, { useState } from 'react';
import { Platform, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, Clock, Eye, Flame, Flower2, Heart, Image as ImageIcon, Smartphone, Sun, Vibrate } from 'lucide-react-native';
import { TextR } from '@/components/ritual-ui';
import { C } from '@/constants/ritual-theme';
import { useLanguage } from '@/i18n/provider';
import { requestEngagementNotificationPermission } from '@/services/engagement-notifications';
import { useJaap } from '@/features/jaap/provider';
import { pickJaapPhoto } from '@/features/jaap/photo';
import { JaapButton, JaapPage, JaapRow, j } from '@/features/jaap/ui';

export default function PreferencesScreen() {
  const jaap = useJaap();
  const p = jaap.state.preferences;
  const { t } = useLanguage();
  const router = useRouter();

  const [time, setTime] = useState(
    `${String(Math.floor(p.reminderMinutes / 60)).padStart(2, '0')}:${String(p.reminderMinutes % 60).padStart(2, '0')}`
  );
  const [malas, setMalas] = useState(String(p.dailyMalas));
  const [notice, setNotice] = useState('');
  const [working, setWorking] = useState(false);

  const toggle = (label: string, key: 'focus' | 'bell' | 'keepAwake', Icon: any) => (
    <View style={[j.card, s.toggleCard]}>
      <View style={s.toggleLeft}>
        <View style={s.iconCircle}>
          <Icon size={18} color={C.saffron} strokeWidth={2} />
        </View>
        <TextR style={s.toggleLabel}>{label}</TextR>
      </View>
      <Switch
        accessibilityLabel={label}
        value={p[key]}
        onValueChange={value => {
          void jaap.preferences({ [key]: value });
        }}
        trackColor={{ false: '#E2D5C5', true: C.saffron }}
        thumbColor={Platform.OS === 'android' ? (p[key] ? '#FFFFFF' : '#F6EEE5') : undefined}
      />
    </View>
  );

  return (
    <JaapPage title={t('Preferences')} subtitle={t('Make this space your own.')}>
      {/* Quick Mala Chooser Row */}
      <JaapRow label={t('Choose your mala')} onPress={() => router.push('/jaap/mala')} />

      {/* Practice Experience Toggles */}
      <View style={s.section}>
        <TextR style={s.sectionHeader}>{t('Preferences')}</TextR>
        {toggle(t('Dim focus view'), 'focus', Eye)}
        {toggle(t('Mala completion bell'), 'bell', Bell)}
        {toggle(t('Keep screen awake'), 'keepAwake', Smartphone)}
        <TextR style={[j.small, { paddingHorizontal: 6 }]}>
          {t('The bell stays quiet while app music is playing.')}
        </TextR>
      </View>

      {/* Haptic Touch Feedback Segmented Grid */}
      <View style={[j.card, s.optionSection]}>
        <View style={s.optionHeader}>
          <View style={s.iconCircle}>
            <Vibrate size={18} color={C.saffron} strokeWidth={2} />
          </View>
          <TextR style={j.label}>{t('Touch feedback')}</TextR>
        </View>

        <View style={j.actions}>
          {(['off', 'light', 'medium', 'strong'] as const).map(value => (
            <JaapButton
              key={value}
              label={t(({ off: 'Off', light: 'Light', medium: 'Medium', strong: 'Strong' } as const)[value])}
              secondary={p.haptics !== value}
              onPress={() => void jaap.preferences({ haptics: value })}
              style={{ flex: 1, minWidth: 70 }}
            />
          ))}
        </View>
      </View>

      {/* Sacred Background Selector */}
      <View style={[j.card, s.optionSection]}>
        <View style={s.optionHeader}>
          <View style={s.iconCircle}>
            <Sun size={18} color={C.saffron} strokeWidth={2} />
          </View>
          <TextR style={j.label}>{t('Background')}</TextR>
        </View>

        <View style={j.actions}>
          {(['plain', 'lotus', 'diya'] as const).map(value => (
            <JaapButton
              key={value}
              label={t(({ plain: 'Plain', lotus: 'Lotus', diya: 'Diya' } as const)[value])}
              secondary={p.background !== value}
              onPress={() => void jaap.preferences({ background: value })}
              style={{ flex: 1, minWidth: 80 }}
            />
          ))}
        </View>

        {Platform.OS !== 'web' && (
          <JaapButton
            secondary={p.background !== 'photo'}
            disabled={working}
            icon={<ImageIcon size={16} color={p.background === 'photo' ? C.white : C.primary} />}
            label={t('Choose a personal photo')}
            onPress={() => {
              setWorking(true);
              void pickJaapPhoto()
                .then(uri => (uri ? jaap.preferences({ background: 'photo', photoUri: uri }) : null))
                .catch(() =>
                  setNotice(t('Your photo could not be opened. Your previous background is unchanged.'))
                )
                .finally(() => setWorking(false));
            }}
            style={{ marginTop: 4 }}
          />
        )}
      </View>

      {/* Daily Mala Target */}
      <View style={[j.card, s.optionSection]}>
        <View style={s.optionHeader}>
          <View style={s.iconCircle}>
            <Heart size={18} color={C.saffron} strokeWidth={2} />
          </View>
          <TextR style={[j.label, { flex: 1 }]}>{t('Daily mala target')}</TextR>
        </View>

        <TextR style={j.small}>
          {t('Choose how many malas you aim to complete each day. One mala is 108 jaap, so 2 malas means 216 jaap. You can keep chanting after reaching your goal.')}
        </TextR>

        <TextInput
          accessibilityLabel={t('Daily mala target')}
          style={j.input}
          keyboardType="number-pad"
          value={malas}
          onChangeText={setMalas}
          maxLength={3}
        />

        <JaapButton
          secondary
          label={t('Save target')}
          disabled={!/^\d+$/.test(malas) || Number(malas) < 1 || Number(malas) > 108}
          onPress={() => {
            void jaap.preferences({ dailyMalas: Number(malas) }).then(v => {
              if (v) setNotice(t('Saved'));
            });
          }}
        />
      </View>

      {/* Daily Practice Reminder */}
      <View style={[j.card, s.optionSection]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={s.toggleLeft}>
            <View style={s.iconCircle}>
              <Clock size={18} color={C.saffron} strokeWidth={2} />
            </View>
            <TextR style={s.toggleLabel}>{t('Daily jaap reminder')}</TextR>
          </View>
          <Switch
            disabled={working || Platform.OS === 'web'}
            accessibilityLabel={t('Daily jaap reminder')}
            value={p.reminderEnabled}
            onValueChange={enabled => {
              setWorking(true);
              void (async () => {
                if (enabled && !(await requestEngagementNotificationPermission())) {
                  setNotice(t('Notifications are not allowed. You can keep practising anytime.'));
                  return;
                }
                await jaap.preferences({ reminderEnabled: enabled });
              })()
                .catch(() => setNotice(t('Reminder could not be updated. Please retry.')))
                .finally(() => setWorking(false));
            }}
            trackColor={{ false: '#E2D5C5', true: C.saffron }}
            thumbColor={Platform.OS === 'android' ? (p.reminderEnabled ? '#FFFFFF' : '#F6EEE5') : undefined}
          />
        </View>

        <TextR style={j.small}>{t('Reminder time (24-hour HH:MM)')}</TextR>
        <TextInput
          accessibilityLabel={t('Reminder time (24-hour HH:MM)')}
          value={time}
          onChangeText={setTime}
          maxLength={5}
          keyboardType="numbers-and-punctuation"
          style={j.input}
        />

        <JaapButton
          secondary
          label={t('Save reminder time')}
          disabled={!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)}
          onPress={() => {
            const [h, m] = time.split(':').map(Number);
            void jaap.preferences({ reminderMinutes: h * 60 + m }).then(v => {
              if (v) setNotice(t('Saved'));
            });
          }}
        />

        <TextR style={j.small}>
          {t('Reminders are optional. Your practice is always available offline.')}
        </TextR>
      </View>

      {!!notice && (
        <TextR accessibilityLiveRegion="polite" style={[j.small, { textAlign: 'center', color: C.saffron, fontWeight: '600' }]}>
          {notice}
        </TextR>
      )}
    </JaapPage>
  );
}

const s = StyleSheet.create({
  section: {
    gap: 10,
    marginTop: 4,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.8,
    color: C.saffron,
    paddingHorizontal: 4,
    textTransform: 'uppercase',
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: C.ink,
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(229, 107, 39, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionSection: {
    padding: 18,
    gap: 12,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});
