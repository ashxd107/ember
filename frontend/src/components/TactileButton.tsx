import React, { useCallback } from 'react';
import { StyleSheet, Platform } from 'react-native';
import { TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
} from 'react-native-reanimated';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface Props {
  children: React.ReactNode;
  onPress: () => void;
  size?: number;
  hapticType?: 'light' | 'medium' | 'heavy';
  testID?: string;
  disabled?: boolean;
  color?: string;
}

export default function TactileButton({
  children, onPress, size = 64, hapticType = 'medium', testID, disabled, color,
}: Props) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleIn = useCallback(() => {
    scale.value = withSpring(0.9, { damping: 15, stiffness: 400 });
  }, []);

  const handleOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 12, stiffness: 300 });
  }, []);

  const handlePress = useCallback(() => {
    if (Platform.OS !== 'web') {
      const style = hapticType === 'light'
        ? Haptics.ImpactFeedbackStyle.Light
        : hapticType === 'heavy'
          ? Haptics.ImpactFeedbackStyle.Heavy
          : Haptics.ImpactFeedbackStyle.Medium;
      Haptics.impactAsync(style);
    }
    onPress();
  }, [hapticType, onPress]);

  return (
    <AnimatedTouchable
      testID={testID}
      disabled={disabled}
      style={[
        styles.btn,
        { width: size, height: size, borderRadius: size / 2 },
        color ? { borderColor: color, borderWidth: 1 } : null,
        disabled ? { opacity: 0.4 } : null,
        animStyle,
      ]}
      onPress={handlePress}
      onPressIn={handleIn}
      onPressOut={handleOut}
      activeOpacity={1}
    >
      {children}
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
});
