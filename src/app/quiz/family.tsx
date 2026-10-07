import React, { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Users, User, Flower2 } from 'lucide-react-native';

import { StartButton } from '@/features/quiz/start-button';
import { Button, Copy, Panel, QuizScreen, styles, useCopy } from '@/features/quiz/ui';
import { C } from '@/constants/ritual-theme';

export default function Family() {
  const t = useCopy();
  const [mode, setMode] = useState<'together' | 'turns'>('together');
  const [count, setCount] = useState(2);
  const [names, setNames] = useState(['', '', '', '']);

  const PLAYER_COLORS = ['#E56B27', '#2563EB', '#16A34A', '#9333EA'];

  return (
    <QuizScreen
      title={t('Play with Family', 'परिवार के साथ खेलें')}
      subtitle={t('Shared Vedic Wisdom', 'एक साथ सीखें व खेलें')}
    >
      {/* Intro Hero Panel */}
      <Panel gold style={s.introPanel}>
        <View style={s.introIconWrap}>
          <Users size={28} color={C.primary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Copy title style={{ fontSize: 17 }}>
            {t('Kutumbha Gyan Arena', 'पारिवारिक ज्ञान साधना')}
          </Copy>
          <Copy small style={{ color: C.muted }}>
            {t(
              'One phone, shared discoveries. Scores stay separate from your personal journey.',
              'एक ही फोन पर मिलकर खेलें। परिवार का स्कोर आपकी व्यक्तिगत यात्रा से अलग रहेगा।'
            )}
          </Copy>
        </View>
      </Panel>

      {/* Mode Selector */}
      <View style={{ gap: 8 }}>
        <Copy title style={s.sectionTitle}>
          {t('CHOOSE MULTIPLAYER FORMAT', 'खेलने का प्रकार चुनें')}
        </Copy>
        <View style={s.modeButtonsRow}>
          <Button
            label={t('Together • 10 Qs', 'मिलकर • 10 प्रश्न')}
            selected={mode === 'together'}
            onPress={() => setMode('together')}
            style={{ flex: 1 }}
          />
          <Button
            label={t('Take Turns • 5 Qs Each', 'बारी-बारी • 5 प्रश्न')}
            selected={mode === 'turns'}
            onPress={() => setMode('turns')}
            style={{ flex: 1 }}
          />
        </View>
      </View>

      {/* Turn-Based Setup */}
      {mode === 'turns' && (
        <Panel style={{ gap: 14 }}>
          <Copy title style={{ fontSize: 16 }}>
            {t('Select Number of Players', 'खिलाड़ियों की संख्या')}
          </Copy>

          <View style={s.playerCountRow}>
            {[2, 3, 4].map(n => (
              <Button
                key={n}
                label={t(`${n} Players`, `${n} खिलाड़ी`)}
                selected={count === n}
                onPress={() => setCount(n)}
                style={{ flex: 1 }}
              />
            ))}
          </View>

          <View style={{ gap: 10, marginTop: 4 }}>
            <Copy small style={{ color: C.muted, fontWeight: '700' }}>
              {t('PLAYER NAMES', 'खिलाड़ियों के नाम')}
            </Copy>
            {names.slice(0, count).map((name, i) => (
              <View key={i} style={s.inputRow}>
                <View
                  style={[
                    s.playerAvatarCircle,
                    { backgroundColor: PLAYER_COLORS[i] },
                  ]}
                >
                  <User size={16} color="#FFFFFF" strokeWidth={2.5} />
                </View>
                <TextInput
                  accessibilityLabel={t(`Player ${i + 1} name`, `खिलाड़ी ${i + 1} का नाम`)}
                  placeholder={t(`Player ${i + 1}`, `खिलाड़ी ${i + 1}`)}
                  placeholderTextColor="#8C7667"
                  value={name}
                  maxLength={30}
                  style={[styles.input, s.playerInput]}
                  onChangeText={value =>
                    setNames(prev => prev.map((v, j) => (j === i ? value : v)))
                  }
                />
              </View>
            ))}
          </View>

          <View style={s.balanceInfoPill}>
            <Flower2 size={14} color={C.goldDark} />
            <Copy small style={{ color: C.inkSoft, flex: 1 }}>
              {t(
                'Fair play: Each player receives balanced 3 easy and 2 medium questions.',
                'संतुलित प्रश्न: प्रत्येक खिलाड़ी को 3 सरल और 2 मध्यम प्रश्न मिलेंगे।'
              )}
            </Copy>
          </View>
        </Panel>
      )}

      {/* Start Button */}
      <View style={{ marginTop: 6 }}>
        <StartButton
          label={t('Start Family Round →', 'परिवार की क्विज़ शुरू करें →')}
          options={{
            mode,
            players: names.slice(0, count).map(
              (n, i) => n.trim() || t(`Player ${i + 1}`, `खिलाड़ी ${i + 1}`)
            ),
          }}
        />
      </View>
    </QuizScreen>
  );
}

const s = StyleSheet.create({
  introPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  introIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFE9C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: C.muted,
    letterSpacing: 0.8,
    marginVertical: 2,
  },
  modeButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  playerCountRow: {
    flexDirection: 'row',
    gap: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  playerAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerInput: {
    flex: 1,
  },
  balanceInfoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 245, 225, 0.85)',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(244, 185, 66, 0.4)',
  },
});
