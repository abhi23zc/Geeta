import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Check, Globe } from 'lucide-react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { TextR } from '@/components/ritual-ui';
import { C } from '@/constants/ritual-theme';
import { LANGUAGES, LANGUAGE_NAMES, type AppLanguage } from './model';
import { useLanguage } from './provider';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const LANGUAGE_DESCRIPTIONS: Record<AppLanguage, { script: string; hint: string }> = {
  en: { script: 'English', hint: 'Universal & English narration' },
  hi: { script: 'हिंदी', hint: 'शुद्ध हिंदी एवं देवनागरी पाठ' },
  hinglish: { script: 'Hinglish', hint: 'Natural conversational blend' },
};

function LanguageCard({
  value,
  selected,
  disabled,
  onSelect,
}: {
  value: AppLanguage;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const pressed = useSharedValue(0);
  const info = LANGUAGE_DESCRIPTIONS[value];

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: withSpring(pressed.value ? 0.985 : 1, {
          damping: 14,
          stiffness: 220,
        }),
      },
    ],
  }));

  return (
    <AnimatedPressable
      accessibilityRole="radio"
      accessibilityLabel={LANGUAGE_NAMES[value]}
      accessibilityState={{ checked: selected, disabled }}
      disabled={disabled}
      onPress={onSelect}
      onPressIn={() => {
        pressed.value = 1;
      }}
      onPressOut={() => {
        pressed.value = 0;
      }}
      style={[
        s.card,
        selected ? s.cardSelected : s.cardUnselected,
        disabled && s.disabled,
        animStyle,
      ]}
    >
      <View style={s.cardLeft}>
        <View style={[s.iconBox, selected ? s.iconBoxSelected : s.iconBoxUnselected]}>
          <Globe size={20} color={selected ? C.primary : C.muted} />
        </View>
        <View style={s.textGroup}>
          <TextR style={[s.title, selected && s.titleSelected]}>
            {LANGUAGE_NAMES[value]}
          </TextR>
          <TextR style={s.subtitle}>{info.hint}</TextR>
        </View>
      </View>

      <View style={[s.radioCircle, selected && s.radioCircleSelected]}>
        {selected && <Check size={14} color={C.white} strokeWidth={3} />}
      </View>
    </AnimatedPressable>
  );
}

export function LanguagePicker() {
  const { language, setLanguage, busy, error, nativeSyncError, t } = useLanguage();

  return (
    <View style={s.container} accessibilityRole="radiogroup" accessibilityLabel={t('App language')}>
      {LANGUAGES.map((value) => (
        <LanguageCard
          key={value}
          value={value}
          selected={language === value}
          disabled={busy}
          onSelect={() => {
            void setLanguage(value);
          }}
        />
      ))}

      {error && (
        <View style={s.alertBox}>
          <TextR accessibilityRole="alert" style={s.errorText}>
            {t('Language could not be saved. Please try again.')}
          </TextR>
        </View>
      )}

      {nativeSyncError && (
        <View style={s.alertBox}>
          <TextR accessibilityRole="alert" style={s.errorText}>
            {t('App language saved. Alarm language could not sync. Please retry.')}
          </TextR>
          <Pressable
            accessibilityRole="button"
            disabled={busy}
            onPress={() => {
              void setLanguage(language);
            }}
            style={({ pressed }) => [s.retryBtn, pressed && { opacity: 0.8 }]}
          >
            <TextR style={s.retryText}>{t('Retry')}</TextR>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    gap: 12,
    width: '100%',
  },
  card: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  cardUnselected: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderColor: 'rgba(222, 192, 180, 0.5)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(140, 64, 16, 0.1)',
    borderBottomWidth: 2,
    shadowColor: '#8C4010',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardSelected: {
    backgroundColor: 'rgba(254, 236, 220, 0.95)',
    borderColor: C.saffron,
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(140, 64, 16, 0.22)',
    borderBottomWidth: 2.5,
    shadowColor: C.saffron,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  disabled: {
    opacity: 0.6,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxUnselected: {
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
  },
  iconBoxSelected: {
    backgroundColor: 'rgba(229, 107, 39, 0.15)',
  },
  textGroup: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: C.ink,
  },
  titleSelected: {
    color: C.primary,
  },
  subtitle: {
    fontSize: 12.5,
    color: C.muted,
    fontWeight: '500',
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(140, 64, 16, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    marginLeft: 10,
    flexShrink: 0,
  },
  radioCircleSelected: {
    backgroundColor: C.saffron,
    borderColor: C.saffron,
  },
  alertBox: {
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#FDE8E8',
    borderWidth: 1,
    borderColor: '#F8B4B4',
    gap: 8,
  },
  errorText: {
    fontSize: 14.5,
    lineHeight: 22,
    color: '#9D2525',
    fontWeight: '600',
  },
  retryBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: '#9D2525',
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
});
