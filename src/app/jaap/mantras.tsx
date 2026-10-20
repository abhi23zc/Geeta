import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Check, Plus, Sparkles } from 'lucide-react-native';
import { confirmAction } from '@/features/quiz/actions';
import { TextR } from '@/components/ritual-ui';
import { C } from '@/constants/ritual-theme';
import { useLanguage } from '@/i18n/provider';
import { jaapId, useJaap } from '@/features/jaap/provider';
import { activeSession, allMantras, selectedMantra } from '@/features/jaap/model';
import { JaapButton, JaapPage, j } from '@/features/jaap/ui';

export default function MantraScreen() {
  const jaap = useJaap();
  const router = useRouter();
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [transliteration, setTransliteration] = useState('');

  const current = selectedMantra(jaap.state);

  const choose = (id: string) => {
    const select = () => {
      void jaap.selectMantra(id).then(value => {
        if (value) router.replace('/jaap');
      });
    };
    const session = activeSession(jaap.state);
    if (session && session.mantra.id !== id) {
      confirmAction(
        t('Change mantra?'),
        t('Finish your current session before beginning another mantra.'),
        t('Finish and switch'),
        select
      );
    } else {
      select();
    }
  };

  return (
    <JaapPage
      title={t('Choose your mantra')}
      subtitle={t('Keep the words that matter to you close.')}
    >
      {/* List of Sacred Mantras in 3D Tactile Cards */}
      <View style={s.listContainer}>
        {allMantras(jaap.state).map(m => {
          const isSelected = current.id === m.id;
          return (
            <Pressable
              key={m.id}
              accessibilityRole="button"
              accessibilityLabel={m.name || m.text}
              accessibilityState={{ selected: isSelected }}
              onPress={() => choose(m.id)}
              style={({ pressed }) => [
                s.mantraCard,
                isSelected ? s.mantraCardSelected : s.mantraCardUnselected,
                { transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
            >
              <View style={s.cardContent}>
                {/* Mantra Name & Tag */}
                <View style={s.badgeRow}>
                  <TextR style={[s.badgeText, isSelected && s.badgeTextSelected]}>
                    {m.name}
                  </TextR>
                  {isSelected && (
                    <View style={s.selectedCheck}>
                      <Check size={12} color={C.white} strokeWidth={3} />
                    </View>
                  )}
                </View>

                {/* Primary Sacred Text in Serif */}
                <TextR serif style={[s.mantraText, isSelected && s.mantraTextSelected]}>
                  {m.text}
                </TextR>

                {/* Transliteration */}
                {!!m.transliteration && (
                  <TextR style={s.transliterationText}>
                    {m.transliteration}
                  </TextR>
                )}
              </View>

              {/* Bottom 3D Bevel Shadow Ridge */}
              <View style={isSelected ? s.bottomRidgeSelected : s.bottomRidge} />
            </Pressable>
          );
        })}
      </View>

      {/* 3D Custom Mantra Card */}
      <View style={[j.card, s.customCard]}>
        <View style={s.customHeader}>
          <View style={s.plusCircle}>
            <Plus size={16} color={C.saffron} strokeWidth={2.5} />
          </View>
          <TextR style={j.label}>{t('Your own mantra')}</TextR>
        </View>

        <TextInput
          accessibilityLabel={t('Mantra name')}
          placeholder={t('Mantra name')}
          placeholderTextColor={C.mutedSoft}
          value={name}
          onChangeText={setName}
          maxLength={120}
          style={j.input}
        />

        <TextInput
          accessibilityLabel={t('Mantra text')}
          placeholder={t('Mantra text')}
          placeholderTextColor={C.mutedSoft}
          value={text}
          onChangeText={setText}
          maxLength={4000}
          multiline
          style={[j.input, { minHeight: 90, textAlignVertical: 'top' }]}
        />

        <TextInput
          accessibilityLabel={t('Transliteration (optional)')}
          placeholder={t('Transliteration (optional)')}
          placeholderTextColor={C.mutedSoft}
          value={transliteration}
          onChangeText={setTransliteration}
          maxLength={4000}
          multiline
          style={j.input}
        />

        <JaapButton
          disabled={jaap.busy || !name.trim() || !text.trim()}
          label={t('Save mantra')}
          onPress={() => {
            const id = jaapId();
            void jaap
              .addMantra({
                id,
                name: name.trim(),
                text: text.trim(),
                transliteration: transliteration.trim(),
                custom: true,
              })
              .then(value => {
                if (value) {
                  setName('');
                  setText('');
                  setTransliteration('');
                  choose(id);
                }
              });
          }}
          style={{ marginTop: 4 }}
        />
      </View>
    </JaapPage>
  );
}

const s = StyleSheet.create({
  listContainer: {
    gap: 12,
  },
  mantraCard: {
    borderRadius: 22,
    padding: 18,
    position: 'relative',
    overflow: 'hidden',
  },
  mantraCardUnselected: {
    backgroundColor: 'rgba(255, 248, 242, 0.94)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(215, 185, 170, 0.7)',
    borderBottomWidth: 2.8,
    shadowColor: C.shadow3D,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  mantraCardSelected: {
    backgroundColor: 'rgba(255, 245, 236, 0.98)',
    borderWidth: 1.8,
    borderColor: 'rgba(229, 107, 39, 0.65)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: C.saffron,
    borderBottomWidth: 3.5,
    shadowColor: C.saffron,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },
  cardContent: {
    gap: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
    color: C.muted,
    textTransform: 'uppercase',
  },
  badgeTextSelected: {
    color: C.saffron,
  },
  selectedCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.saffron,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mantraText: {
    fontSize: 22,
    fontWeight: '700',
    color: C.ink,
    lineHeight: 32,
  },
  mantraTextSelected: {
    color: '#8C3806',
  },
  transliterationText: {
    fontSize: 13.5,
    color: C.muted,
    lineHeight: 20,
  },
  bottomRidge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(140, 64, 16, 0.08)',
  },
  bottomRidgeSelected: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2.5,
    backgroundColor: 'rgba(229, 107, 39, 0.22)',
  },
  customCard: {
    padding: 20,
    gap: 12,
    marginTop: 6,
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 2,
  },
  plusCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(229, 107, 39, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
