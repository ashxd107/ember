import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence,
  withTiming, withDelay, Easing,
} from 'react-native-reanimated';

const NUM_PARTICLES = 10;

interface Props {
  color: string;
  intensity: number; // 0-1
}

function Particle({ index, color, intensity }: { index: number; color: string; intensity: number }) {
  const progress = useSharedValue(0);
  const xSeed = useMemo(() => (Math.random() - 0.5) * 2, []);
  const size = useMemo(() => 3 + Math.random() * 6, []);
  const dur = useMemo(() => 2500 + Math.random() * 2000, []);
  const startDelay = useMemo(() => index * 320, []);
  const xRange = useMemo(() => 15 + Math.random() * 25, []);

  useEffect(() => {
    progress.value = withDelay(
      startDelay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: dur, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 0 }),
        ),
        -1,
      ),
    );
  }, []);

  const animStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const maxTravel = 180 + intensity * 80;
    const fadeIn = Math.min(p / 0.12, 1);
    const fadeOut = Math.max(0, 1 - (p - 0.12) / 0.88);
    const baseOpacity = 0.15 + intensity * 0.2;
    return {
      transform: [
        { translateY: -p * maxTravel },
        { translateX: Math.sin(p * Math.PI * 2.5 + xSeed * 3) * xRange },
        { scale: 0.4 + p * 0.8 },
      ],
      opacity: fadeIn * fadeOut * baseOpacity,
    };
  });

  return (
    <Animated.View
      style={[{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
      }, animStyle]}
    />
  );
}

export default function SmokeParticles({ color, intensity }: Props) {
  const particles = useMemo(() => Array.from({ length: NUM_PARTICLES }, (_, i) => i), []);

  return (
    <View style={styles.container} pointerEvents="none" testID="smoke-particles">
      {particles.map(i => (
        <Particle key={i} index={i} color={color} intensity={intensity} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 220,
    height: 300,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
});
