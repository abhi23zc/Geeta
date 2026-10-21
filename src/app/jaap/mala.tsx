import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Check, Flower2 } from 'lucide-react-native';
import { TextR } from '@/components/ritual-ui';
import { C } from '@/constants/ritual-theme';
import { useLanguage } from '@/i18n/provider';
import { useJaap } from '@/features/jaap/provider';
import { MATERIALS, type MalaMaterial } from '@/features/jaap/model';
import { MalaPreview } from '@/features/jaap/mala';
import { JaapButton, JaapPage, j } from '@/features/jaap/ui';

export default function MalaScreen() {
  const jaap = useJaap();
  const router = useRouter();
  const { t } = useLanguage();
  const [selected, setSelected] = useState<MalaMaterial>(jaap.state.preferences.material);

  const names: Record<MalaMaterial, string> = {
    rudraksha: t('Rudraksha'),
    tulsi: t('Tulsi'),
    sandalwood: t('Sandalwood'),
    crystal: t('Crystal'),
  };

  const descriptions: Record<MalaMaterial, string> = {
    rudraksha: t('Sacred seeds for deep focus and grounded devotion.'),
    tulsi: t('Sacred wood infused with purity, devotion and serenity.'),
    sandalwood: t('Aromatic wood that calms the senses and centers the heart.'),
    crystal: t('Pure luminous quartz offering clarity, light and stillness.'),
  };

  const handleSelect = (m: MalaMaterial) => {
    setSelected(m);
  };

  const handleConfirm = () => {
    void jaap.preferences({ material: selected }).then(value => {
      if (value) router.replace('/jaap/mantras');
    });
  };

  return (
    <JaapPage
      title={t('Choose your mala')}
      subtitle={t('Find the one that feels like you')}
    >
      {/* 2x2 Grid of 3D Mala Material Cards */}
      <View style={s.grid}>
        {MATERIALS.map(m => {
          const isSelected = selected === m;
          return (
            <Pressable
              key={m}
              accessibilityRole="button"
              accessibilityLabel={names[m]}
              accessibilityState={{ selected: isSelected }}
              onPress={() => handleSelect(m)}
              style={({ pressed }) => [
                s.malaCard,
                isSelected ? s.malaCardSelected : s.malaCardUnselected,
                { transform: [{ scale: pressed ? 0.96 : 1 }] },
              ]}
            >
              {/* Selected Badge Indicator */}
              {isSelected && (
                <View style={s.checkBadge}>
                  <Check size={13} color={C.white} strokeWidth={2.8} />
                </View>
              )}

              {/* Mala Bead Preview Cluster */}
              <View style={s.previewContainer}>
                <MalaPreview material={m} size={110} />
              </View>

              {/* Mala Name */}
              <TextR serif style={[s.malaTitle, isSelected && s.malaTitleSelected]}>
                {names[m]}
              </TextR>

              {/* 3D Bottom Highlight / Lip */}
              <View style={isSelected ? s.bottomLipSelected : s.bottomLip} />
            </Pressable>
          );
        })}
      </View>

      {/* 3D Showcase Card of the Selected Mala */}
      <View style={[j.card, s.showcaseCard]}>
        <View style={s.showcaseHeader}>
          <View style={s.sparkleBox}>
            <Flower2 size={18} color={C.saffron} strokeWidth={2} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <TextR style={s.showcaseEyebrow}>{t('SELECTED MALA')}</TextR>
            <TextR serif style={s.showcaseTitle}>
              {names[selected]}
            </TextR>
          </View>
        </View>

        <TextR style={s.showcaseDesc}>{descriptions[selected]}</TextR>

        <View style={s.divider} />

        <View style={s.featuresRow}>
          <TextR style={s.featurePill}>📿 {t('108 beads · A practice of your own')}</TextR>
        </View>
      </View>

      {/* 3D Saffron Action Button */}
      <JaapButton
        disabled={jaap.busy}
        label={t('Use this mala')}
        onPress={handleConfirm}
        style={{ marginTop: 6 }}
      />
    </JaapPage>
  );
}

const s = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    justifyContent: 'space-between',
  },
  malaCard: {
    width: '47.5%',
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  malaCardUnselected: {
    backgroundColor: 'rgba(255, 248, 242, 0.94)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.95)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: 'rgba(215, 185, 170, 0.7)',
    borderBottomWidth: 3,
    shadowColor: C.shadow3D,
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  malaCardSelected: {
    backgroundColor: 'rgba(255, 245, 236, 0.98)',
    borderWidth: 1.8,
    borderColor: 'rgba(229, 107, 39, 0.65)',
    borderTopColor: '#FFFFFF',
    borderBottomColor: C.saffron,
    borderBottomWidth: 3.5,
    shadowColor: C.saffron,
    shadowOpacity: 0.26,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  checkBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.saffron,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    shadowColor: C.saffron,
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
    zIndex: 2,
  },
  previewContainer: {
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  malaTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.ink,
    textAlign: 'center',
  },
  malaTitleSelected: {
    color: C.saffron,
  },
  bottomLip: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(140, 64, 16, 0.08)',
  },
  bottomLipSelected: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2.5,
    backgroundColor: 'rgba(229, 107, 39, 0.25)',
  },
  showcaseCard: {
    padding: 20,
    gap: 10,
    marginTop: 4,
  },
  showcaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sparkleBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(229, 107, 39, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  showcaseEyebrow: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.6,
    color: C.saffron,
    textTransform: 'uppercase',
  },
  showcaseTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: C.ink,
  },
  showcaseDesc: {
    fontSize: 13.5,
    lineHeight: 21,
    color: C.muted,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(222, 192, 180, 0.5)',
    marginVertical: 4,
  },
  featuresRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  featurePill: {
    fontSize: 12,
    fontWeight: '600',
    color: C.inkSoft,
    backgroundColor: 'rgba(254, 236, 220, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
});
