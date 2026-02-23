import React, { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withSequence,
  withTiming, Easing, SharedValue,
} from 'react-native-reanimated';
import { getEmberColors, brighten, withAlpha } from '../utils/colors';

const OUTER = 220;
const MIDDLE = 170;
const INNER = 130;
const CORE = 90;
const CENTER = 40;

interface Props {
  count: number;
  flashTrigger: SharedValue<number>;
  exceeded: boolean;
}

export default function EmberCore({ count, flashTrigger, exceeded }: Props) {
  const colors = useMemo(() => getEmberColors(count), [count]);

  const breathe = useSharedValue(0);
  const jitterX = useSharedValue(0);
  const jitterY = useSharedValue(0);

  useEffect(() => {
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
    );
  }, []);

  useEffect(() => {
    if (exceeded) {
      jitterX.value = withRepeat(
        withSequence(
          withTiming(3, { duration: 80 }),
          withTiming(-3, { duration: 80 }),
          withTiming(2, { duration: 60 }),
          withTiming(-2, { duration: 60 }),
          withTiming(0, { duration: 40 }),
        ),
        -1,
      );
      jitterY.value = withRepeat(
        withSequence(
          withTiming(-2, { duration: 70 }),
          withTiming(2, { duration: 70 }),
          withTiming(0, { duration: 50 }),
        ),
        -1,
      );
    } else {
      jitterX.value = withTiming(0, { duration: 200 });
      jitterY.value = withTiming(0, { duration: 200 });
    }
  }, [exceeded]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: 1 + breathe.value * 0.05 + flashTrigger.value * 0.12 },
      { translateX: jitterX.value },
      { translateY: jitterY.value },
    ],
  }));

  const outerStyle = useAnimatedStyle(() => ({
    opacity: 0.12 + breathe.value * 0.08 + flashTrigger.value * 0.2,
  }));

  const coreAnimStyle = useAnimatedStyle(() => ({
    opacity: 0.7 + breathe.value * 0.15 + flashTrigger.value * 0.15,
    transform: [{ scale: 1 + flashTrigger.value * 0.15 }],
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]} testID="ember-core">
      <Animated.View
        style={[styles.layer, {
          width: OUTER, height: OUTER, borderRadius: OUTER / 2,
          backgroundColor: withAlpha(colors.glow, 0.12),
          shadowColor: colors.glow, shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.8, shadowRadius: 50, elevation: 20,
        }, outerStyle]}
      />
      <View style={[styles.layer, {
        width: MIDDLE, height: MIDDLE, borderRadius: MIDDLE / 2,
        backgroundColor: withAlpha(colors.glow, 0.22),
        shadowColor: colors.glow, shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6, shadowRadius: 30, elevation: 15,
      }]} />
      <View style={[styles.layer, {
        width: INNER, height: INNER, borderRadius: INNER / 2,
        backgroundColor: withAlpha(colors.core, 0.4),
        shadowColor: colors.core, shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5, shadowRadius: 20, elevation: 10,
      }]} />
      <Animated.View
        style={[styles.layer, {
          width: CORE, height: CORE, borderRadius: CORE / 2,
          backgroundColor: withAlpha(colors.core, 0.75),
          shadowColor: colors.core, shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.7, shadowRadius: 25, elevation: 12,
        }, coreAnimStyle]}
      />
      <View style={[styles.layer, {
        width: CENTER, height: CENTER, borderRadius: CENTER / 2,
        backgroundColor: brighten(colors.core, 1.6),
        opacity: 0.85,
      }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: OUTER,
    height: OUTER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  layer: {
    position: 'absolute',
  },
});
