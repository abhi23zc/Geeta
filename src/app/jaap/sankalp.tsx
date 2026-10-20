import React, { useState } from 'react';
import { Alert, StyleSheet, TextInput, View } from 'react-native';
import { Calendar, CheckCircle2, PauseCircle, Sparkles, Target } from 'lucide-react-native';
import { confirmAction } from '@/features/quiz/actions';
import { TextR } from '@/components/ritual-ui';
import { C } from '@/constants/ritual-theme';
import { useLanguage } from '@/i18n/provider';
import { useJaap } from '@/features/jaap/provider';
import { allMantras, currentProgram, estimatedFinish, selectedMantra } from '@/features/jaap/model';
import { dayKey } from '@/features/progress/model';
import { JaapButton, JaapPage, JaapRow, j } from '@/features/jaap/ui';

export default function SankalpScreen() {
  const jaap = useJaap();
  const { t, formatNumber, formatDate } = useLanguage();
  const p = currentProgram(jaap.state);

  const [duration, setDuration] = useState('21');
  const [malas, setMalas] = useState('1');
  const [intention, setIntention] = useState('');
  const [mantraId, setMantraId] = useState(selectedMantra(jaap.state).id);
  const [editing, setEditing] = useState(false);

  const today = dayKey(new Date(), jaap.timezone);
  const valid =
    /^\d+$/.test(duration) &&
    Number(duration) >= 1 &&
    Number(duration) <= 365 &&
    /^\d+$/.test(malas) &&
    Number(malas) >= 1 &&
    Number(malas) <= 108;

  const create = () => {
    void jaap
      .createSankalp({
        duration: Number(duration),
        dailyMalas: Number(malas),
        intention: intention.trim(),
        mantraId,
      })
      .then(value => {
        if (value) setEditing(false);
      });
  };

  return (
    <JaapPage
      title={t('My sankalp')}
      subtitle={t('Every return is a new beginning.')}
    >
      {/* Active Sankalp Commitment Card */}
      {p && !editing && (
        <View style={[j.card, s.activeCard]}>
          <View style={s.cardHeader}>
            <View style={s.targetCircle}>
              <Target size={20} color={C.saffron} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <TextR style={s.eyebrow}>{t('My sankalp')}</TextR>
              <TextR serif style={s.activeTitle}>
                {p.intention || t('Make time for daily devotion')}
              </TextR>
            </View>
          </View>

          <TextR style={s.mantraText}>
            {allMantras(jaap.state).find(m => m.id === p.mantraId)?.text}
          </TextR>

          {/* Stats & 3D Progress Bar */}
          <View style={s.progressSection}>
            <View style={s.statRow}>
              <TextR style={j.stat}>
                {t('{done} of {total} practice days', {
                  done: formatNumber(p.days.length),
                  total: formatNumber(p.duration),
                })}
              </TextR>
            </View>

            <View
              accessibilityRole="progressbar"
              accessibilityValue={{ now: p.days.length, min: 0, max: p.duration }}
              style={s.progressTrack}
            >
              <View
                style={[
                  s.progressFill,
                  { width: `${Math.min(1, p.days.length / p.duration) * 100}%` },
                ]}
              />
            </View>
          </View>

          {/* Subtext info pills */}
          <View style={s.infoPillRow}>
            <TextR style={s.infoPill}>
              {t('Today: {done} / {total} jaap', {
                done: formatNumber(p.counts[today] ?? 0),
                total: formatNumber(p.dailyMalas * 108),
              })}
            </TextR>
          </View>

          <TextR style={j.small}>
            {p.status === 'paused'
              ? t('Paused. Take your time.')
              : t('Estimated finish: {date}', {
                  date: formatDate(new Date(`${estimatedFinish(p, today)}T12:00:00`), {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  }),
                })}
          </TextR>

          <TextR style={s.missedNote}>
            {t('Missed days keep your progress and extend your journey.')}
          </TextR>

          <View style={j.actions}>
            <JaapButton
              label={t(p.status === 'paused' ? 'Resume' : 'Pause')}
              icon={
                p.status === 'paused' ? (
                  <Sparkles size={16} color={C.white} />
                ) : (
                  <PauseCircle size={16} color={C.white} />
                )
              }
              onPress={() =>
                void jaap.programStatus(p.id, p.status === 'paused' ? 'active' : 'paused')
              }
              style={{ flex: 1 }}
            />
            <JaapButton
              secondary
              label={t('Archive')}
              onPress={() =>
                confirmAction(
                  t('Archive sankalp?'),
                  t('Your completed practice days will be kept.'),
                  t('Archive'),
                  () => void jaap.programStatus(p.id, 'archived')
                )
              }
            />
          </View>

          <JaapButton
            secondary
            label={t('Start a new sankalp')}
            onPress={() => setEditing(true)}
            style={{ marginTop: 2 }}
          />
        </View>
      )}

      {/* Sankalp Creation Form */}
      {(!p || editing) && (
        <View style={[j.card, s.formCard]}>
          <TextR style={j.label}>{t('Choose your mantra')}</TextR>
          <View style={j.actions}>
            {allMantras(jaap.state).map(m => (
              <JaapButton
                key={m.id}
                label={m.name}
                secondary={mantraId !== m.id}
                onPress={() => setMantraId(m.id)}
                style={{ flexGrow: 1 }}
              />
            ))}
          </View>

          <TextR style={j.label}>{t('Practice days (1–365)')}</TextR>
          <View style={j.actions}>
            {['21', '40'].map(v => (
              <JaapButton
                key={v}
                label={v}
                secondary={duration !== v}
                onPress={() => setDuration(v)}
                style={{ flex: 1 }}
              />
            ))}
          </View>

          <TextInput
            accessibilityLabel={t('Practice days (1–365)')}
            keyboardType="number-pad"
            value={duration}
            onChangeText={setDuration}
            maxLength={3}
            style={j.input}
          />

          <TextR style={j.label}>{t('Daily malas (1–108)')}</TextR>
          <TextInput
            accessibilityLabel={t('Daily malas (1–108)')}
            keyboardType="number-pad"
            value={malas}
            onChangeText={setMalas}
            maxLength={3}
            style={j.input}
          />

          <TextR style={j.label}>{t('Personal intention (optional)')}</TextR>
          <TextInput
            accessibilityLabel={t('Personal intention (optional)')}
            placeholder={t('Personal intention (optional)')}
            placeholderTextColor={C.mutedSoft}
            value={intention}
            onChangeText={setIntention}
            multiline
            maxLength={500}
            style={[j.input, { minHeight: 80, textAlignVertical: 'top' }]}
          />

          <JaapButton
            disabled={!valid || jaap.busy}
            label={t('Begin sankalp')}
            onPress={() => {
              if (p)
                confirmAction(
                  t('Start a new sankalp?'),
                  t('Your current program will be archived. Earlier practice will be kept.'),
                  t('Begin sankalp'),
                  create
                );
              else create();
            }}
          />

          {editing && (
            <JaapButton secondary label={t('Cancel')} onPress={() => setEditing(false)} />
          )}
        </View>
      )}

      {/* History of Past Sankalps */}
      {jaap.state.sankalps
        .filter(x => x.status === 'archived' || x.status === 'complete')
        .slice()
        .reverse()
        .map(x => (
          <JaapRow
            key={x.id}
            label={x.intention || t(x.status === 'complete' ? 'Sankalp complete' : 'Archived sankalp')}
            value={t('{done} of {total} practice days', {
              done: formatNumber(x.days.length),
              total: formatNumber(x.duration),
            })}
            onPress={() =>
              Alert.alert(
                t(x.status === 'complete' ? 'Sankalp complete' : 'Archived sankalp'),
                `${allMantras(jaap.state).find(m => m.id === x.mantraId)?.text}\n${x.days.join(', ')}`
              )
            }
          />
        ))}
    </JaapPage>
  );
}

const s = StyleSheet.create({
  activeCard: {
    padding: 20,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  targetCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(229, 107, 39, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.6,
    color: C.saffron,
    textTransform: 'uppercase',
  },
  activeTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: C.ink,
  },
  mantraText: {
    fontSize: 16,
    fontWeight: '600',
    color: C.primary,
  },
  progressSection: {
    gap: 8,
    marginVertical: 4,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  progressTrack: {
    height: 10,
    backgroundColor: '#EDE2D2',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: 10,
    borderRadius: 999,
    backgroundColor: C.saffron,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.5)',
  },
  infoPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoPill: {
    fontSize: 12.5,
    fontWeight: '600',
    color: C.inkSoft,
    backgroundColor: 'rgba(254, 236, 220, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  missedNote: {
    fontSize: 12,
    color: C.muted,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  formCard: {
    padding: 20,
    gap: 12,
  },
});
