import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { Header, Screen, TextR } from '@/components/ritual-ui';
import { C } from '@/constants/ritual-theme';
import { useLanguage } from '@/i18n/provider';
import { DEVICE_GUIDES, GUIDE_EXAMPLES } from '@/features/onboarding/guide-data';
import { screenshotMetadata } from '@/features/onboarding/screenshot-metadata';

function CreditLink({ label, url }: { label: string; url: string }) {
  const { t } = useLanguage();
  const [failed, setFailed] = useState(false);
  return <View>
    <Pressable accessibilityRole="link" accessibilityLabel={label} style={{ minHeight: 48, justifyContent: 'center' }} onPress={() => { setFailed(false); void Linking.openURL(url).catch(() => setFailed(true)); }}>
      <TextR style={{ color: C.primary, textDecorationLine: 'underline' }}>{label}</TextR>
    </Pressable>
    {failed && <TextR accessibilityRole="alert">{t('The guide could not be opened. Please retry.')}</TextR>}
  </View>;
}

export default function ImageCreditsScreen() {
  const { t } = useLanguage();
  return <Screen contentContainerStyle={{ padding: 24, gap: 20, paddingBottom: 32 }}>
    <Header title={t('Image credits')} back showActions={false} />
    {screenshotMetadata.filter(item => item.eligible).map(item => {
      const example = GUIDE_EXAMPLES[item.name as keyof typeof GUIDE_EXAMPLES];
      return <View key={item.name} style={{ gap: 8 }}>
        <TextR accessibilityRole="header" style={{ fontSize: 18, fontWeight: '700' }}>{item.name}</TextR>
        <TextR>{item.attribution}</TextR>
        <TextR>{item.license} · {item.softwareVersion}</TextR>
        <TextR>{item.uiVariant}</TextR>
        <TextR>{item.redistributionRights}</TextR>
        <TextR>{item.width} × {item.height} · {item.file.endsWith('.png') ? 'PNG' : 'WebP'} · {item.retrieved}</TextR>
        {item.source.startsWith('https://') ? <CreditLink label={t('View screenshot source')} url={item.source} /> : <TextR>{item.source}</TextR>}
        <CreditLink label={t('View official guide')} url={example.source} />
        {item.licenseSource && <CreditLink label={t('Screenshot license')} url={item.licenseSource} />}
      </View>;
    })}
    {DEVICE_GUIDES.map(guide => <CreditLink key={guide.id} label={`${guide.name} · ${t('Manufacturer support')}`} url={guide.official} />)}
  </Screen>;
}
