import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { TextR } from '@/components/ritual-ui';
import { useLanguage } from '@/i18n/provider';
import { GUIDE_EXAMPLES, guideExampleForSetting, screenshotDimensions } from './guide-data';
import { guideImage } from './guide-images';
import { screenshotMetadata } from './screenshot-metadata';

function GuideScreenshot({ name }: { name: keyof typeof GUIDE_EXAMPLES }) {
  const { text } = useLanguage();
  const { height: viewportHeight } = useWindowDimensions();
  const [availableWidth, setAvailableWidth] = useState(0);
  const [failed, setFailed] = useState(false);
  const asset = guideImage(name);
  const target = screenshotMetadata.find(item => item.name === name)?.highlight;
  const size = screenshotDimensions(availableWidth, Math.min(420, viewportHeight / 2), asset);

  return <View style={s.imageContainer} onLayout={event => setAvailableWidth(event.nativeEvent.layout.width)}>
    {!failed && availableWidth > 0 && <View style={size}>
      <Image
        source={asset.source}
        style={size}
        contentFit="contain"
        onError={() => setFailed(true)}
        accessible
        accessibilityLabel={`${GUIDE_EXAMPLES[name].software}. ${text(GUIDE_EXAMPLES[name].instruction)}`}
      />
      {target && <Svg pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill} width={size.width} height={size.height} viewBox={`0 0 ${asset.width} ${asset.height}`}>
        <Rect x={target[0] * asset.width} y={target[1] * asset.height} width={target[2] * asset.width} height={target[3] * asset.height} rx={8} fill="rgba(213, 53, 32, 0.08)" stroke="#D53520" strokeWidth={4} />
      </Svg>}
    </View>}
  </View>;
}

export function PermissionGuide({ manufacturer, setting, instruction }: {
  manufacturer: string;
  setting: string;
  instruction: string;
}) {
  const { text } = useLanguage();
  const key = guideExampleForSetting(manufacturer, setting);
  return <View style={{ gap: 14 }}>
    <TextR>{text(key ? GUIDE_EXAMPLES[key].instruction : instruction)}</TextR>
    {key && <GuideScreenshot key={key} name={key} />}
  </View>;
}

const s = StyleSheet.create({
  imageContainer: { width: '100%', alignItems: 'center' },
});
