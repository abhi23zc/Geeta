import { useEventListener } from 'expo';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useLanguage } from '@/i18n/provider';
import { useAlarmPresentation } from '@/navigation/alarm-presentation';
import { treeAsset, type TreeAsset } from './assets';
import { useTreeEnvironment } from './use-motion';
import { useTreePlaybackLease } from './playback-lease';

export type TreeSceneProps = { streak: number; play?: boolean; recap?: boolean; priority?: number; reducedMotion?: boolean; simulateFailure?: boolean; onEnd?: () => void; onError?: () => void };
export function TreeScene(props: TreeSceneProps) {
  return <Scene key={`${props.streak}:${props.play}`} {...props} />;
}
function Scene({ streak, play = false, recap = true, priority = 1, reducedMotion = false, simulateFailure = false, onEnd, onError }: TreeSceneProps) {
  const { t } = useLanguage();
  const { reduced, active } = useTreeEnvironment();
  const alarm = useAlarmPresentation();
  const asset = treeAsset(streak, recap);
  const [finished, setFinished] = useState(false);
  const end = useCallback(() => { setFinished(true); onEnd?.(); }, [onEnd]);
  const fail = useCallback(() => { setFinished(true); onError?.(); }, [onError]);
  const playing = useTreePlaybackLease(play && !finished && !reduced && !reducedMotion && active && !alarm.active && (asset.video !== undefined || streak === 0), priority);
  return <View accessible accessibilityRole="image" accessibilityLabel={streak > 0 ? t('Level {count} of 30', { count: streak }) : t('A seed, ready to grow')} style={s.scene}>
    <Image source={asset.poster} contentFit="contain" style={StyleSheet.absoluteFill} />
    {playing && streak === 0 && <SeedReveal poster={asset.poster} onEnd={end} />}
    {playing && asset.video !== undefined && <TreePlayback key={`${asset.stage}:${simulateFailure}`} asset={asset} onEnd={end} onError={fail} simulateFailure={simulateFailure} />}
  </View>;
}
function SeedReveal({ poster, onEnd }: { poster: number; onEnd: () => void }) {
  const [opacity] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const animation = Animated.timing(opacity, { toValue: 1, duration: 900, useNativeDriver: true });
    animation.start(({ finished }) => { if (finished) onEnd(); });
    return () => animation.stop();
  }, [opacity, onEnd]);
  return <View style={[StyleSheet.absoluteFill, { backgroundColor: '#FAF1E4' }]}><Animated.View style={[StyleSheet.absoluteFill, { opacity }]}><Image source={poster} contentFit="contain" style={StyleSheet.absoluteFill} /></Animated.View></View>;
}
function TreePlayback({ asset, onEnd, onError, simulateFailure }: { asset: TreeAsset; onEnd: () => void; onError: () => void; simulateFailure: boolean }) {
  const frame = useRef(false);
  const player = useVideoPlayer(simulateFailure ? null : asset.video!, p => {
    p.muted = true; p.loop = false; p.staysActiveInBackground = false; p.audioMixingMode = 'mixWithOthers';
  });
  useEventListener(player, 'playToEnd', onEnd);
  useEventListener(player, 'statusChange', ({ status }) => { if (status === 'error') onError(); });
  useEffect(() => {
    if (!simulateFailure) player.play();
    const timeout = setTimeout(() => { if (!frame.current) onError(); }, 5000);
    // Also bound a stalled decoder after its first frame.
    const watchdog = setTimeout(onError, (asset.duration + 8) * 1000);
    // useVideoPlayer releases the native player on unmount; do not access it after its cleanup.
    return () => { clearTimeout(timeout); clearTimeout(watchdog); };
  }, [player, asset.duration, onError, simulateFailure]);

  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="contain"
      nativeControls={false}
      fullscreenOptions={{ enable: false }}
      allowsPictureInPicture={false}
      playsInline
      onFirstFrameRender={() => { frame.current = true; }}
      accessible={false}
    />
  );
}
const s = StyleSheet.create({ scene: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#FAF1E4' } });
