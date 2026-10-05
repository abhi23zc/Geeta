import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Globe,
  Type,
  Vibrate,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react-native';

import { useQuiz } from '@/features/quiz/provider';
import { confirmAction } from '@/features/quiz/actions';
import { Button, Copy, Panel, QuizScreen, useCopy } from '@/features/quiz/ui';
import { LanguagePicker } from '@/i18n/language-picker';
import { C } from '@/constants/ritual-theme';

export default function Settings() {
  const { progress, busy, commit, reset } = useQuiz();
  const t = useCopy();

  return (
    <QuizScreen
      title={t('Quiz Settings', 'क्विज़ सेटिंग्स')}
      subtitle={t('Preferences & Storage', 'प्राथमिकताएं व डेटा')}
    >
      {/* Language Section */}
      <Panel style={s.sectionPanel}>
        <View style={s.sectionHeader}>
          <Globe size={20} color={C.primary} />
          <Copy title style={s.sectionTitle}>
            {t('App & Quiz Language', 'भाषा चयन')}
          </Copy>
        </View>
        <LanguagePicker />
      </Panel>

      {/* Text Size Customization */}
      <Panel style={s.sectionPanel}>
        <View style={s.sectionHeader}>
          <Type size={20} color={C.primary} />
          <Copy title style={s.sectionTitle}>
            {t('Text Size', 'अक्षर आकार')}
          </Copy>
        </View>
        <View style={s.textSizeRow}>
          {(['standard', 'large', 'extra'] as const).map(textSize => (
            <Button
              key={textSize}
              label={
                {
                  standard: t('Standard', 'सामान्य'),
                  large: t('Large', 'बड़ा'),
                  extra: t('Extra large', 'बहुत बड़ा'),
                }[textSize]
              }
              selected={progress?.settings.textSize === textSize}
              disabled={busy}
              style={{ flex: 1, minHeight: 46 }}
              onPress={() => {
                void commit(p => ({
                  ...p,
                  settings: { ...p.settings, textSize },
                }));
              }}
            />
          ))}
        </View>
      </Panel>

      {/* Haptics & Vibration Feedback */}
      <Panel style={s.sectionPanel}>
        <View style={s.sectionHeader}>
          <Vibrate size={20} color={C.primary} />
          <View style={{ flex: 1 }}>
            <Copy title style={s.sectionTitle}>
              {t('Answer Vibration Feedback', 'उत्तर पर कंपन (Haptics)')}
            </Copy>
            <Copy small style={{ color: C.muted }}>
              {t(
                'Tactile vibration pulses on correct and incorrect selections.',
                'सही व गलत उत्तर चुनने पर स्पर्श कंपन महसूस करें।'
              )}
            </Copy>
          </View>
        </View>
        <Button
          label={
            progress?.settings.haptics
              ? t('✓ Haptic Vibration: On', '✓ कंपन प्रतिक्रिया: चालू')
              : t('✕ Haptic Vibration: Off', '✕ कंपन प्रतिक्रिया: बंद')
          }
          selected={!!progress?.settings.haptics}
          disabled={busy}
          onPress={() => {
            void commit(p => ({
              ...p,
              settings: { ...p.settings, haptics: !p.settings.haptics },
            }));
          }}
        />
      </Panel>

      {/* Privacy & Storage Info */}
      <Panel style={s.infoPanel}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ShieldCheck size={20} color={C.greenDark} />
          <Copy title style={{ fontSize: 16, color: C.greenDark }}>
            {t('100% Offline & Private', '100% ऑफलाइन व सुरक्षित')}
          </Copy>
        </View>
        <Copy small style={{ color: C.inkSoft }}>
          {t(
            'All 600 questions, scriptures, and explanations are stored securely on this device. No user account or internet connection is required.',
            'सभी 600 प्रश्न, शास्त्र और व्याख्याएं आपके फोन पर सुरक्षित हैं। किसी खाते या इंटरनेट की आवश्यकता नहीं है।'
          )}
        </Copy>
        <Copy small style={{ color: C.muted }}>
          {t(
            'Question citations and traditional contexts are reviewed for accuracy and philosophical depth.',
            'प्रश्नों के संदर्भ व दार्शनिक प्रमाण प्रामाणिक परंपराओं पर आधारित हैं।'
          )}
        </Copy>
      </Panel>

      {/* Danger Zone: Reset Quiz Progress */}
      <Panel style={s.dangerPanel}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={20} color="#BA1A1A" />
          <Copy title style={{ fontSize: 16, color: '#BA1A1A' }}>
            {t('Reset Quiz Progress', 'प्रगति रीसेट करें')}
          </Copy>
        </View>
        <Copy small style={{ color: '#7F1D1D' }}>
          {t(
            'This will clear your quiz mastery, scores, and saved question cards. Your morning ritual alarms and other app data will remain untouched.',
            'यह केवल क्विज़ की प्रगति, अंक और सहेजे कार्ड हटाएगा। आपका अलार्म व अन्य ऐप डेटा सुरक्षित रहेगा।'
          )}
        </Copy>
        <Button
          variant="danger"
          disabled={busy}
          icon={<RotateCcw size={16} color="#BA1A1A" />}
          label={t('Reset Quiz Data', 'क्विज़ डेटा रीसेट करें')}
          onPress={() =>
            confirmAction(
              t('Reset quiz?', 'क्विज़ रीसेट करें?'),
              t(
                'This removes only quiz progress, saved questions and the current round. Other app data stays intact.',
                'केवल क्विज़ प्रगति, सहेजे प्रश्न और वर्तमान क्विज़ हटेंगे। ऐप का अन्य डेटा सुरक्षित रहेगा।'
              ),
              t('Reset quiz', 'क्विज़ रीसेट करें'),
              () => {
                void reset();
              }
            )
          }
          style={s.dangerBtn}
        />
      </Panel>
    </QuizScreen>
  );
}

const s = StyleSheet.create({
  sectionPanel: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 20,
  },
  textSizeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  infoPanel: {
    backgroundColor: '#F0FDF4',
    borderColor: 'rgba(34, 197, 94, 0.35)',
    gap: 8,
  },
  dangerPanel: {
    backgroundColor: '#FEF2F2',
    borderColor: 'rgba(239, 68, 68, 0.35)',
    gap: 10,
    marginTop: 4,
  },
  dangerBtn: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(239, 68, 68, 0.5)',
    borderBottomColor: '#BA1A1A',
  },
});
