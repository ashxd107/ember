import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, Platform, ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSequence, withTiming,
  withSpring, Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import EmberCore from '../../src/components/EmberCore';
import SmokeParticles from '../../src/components/SmokeParticles';
import TactileButton from '../../src/components/TactileButton';
import DelayTimer from '../../src/components/DelayTimer';
import { getEmberColors, withAlpha } from '../../src/utils/colors';
import { api } from '../../src/utils/api';

export default function HomeScreen() {
  const [count, setCount] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [isDelaying, setIsDelaying] = useState(false);
  const [delayTimeLeft, setDelayTimeLeft] = useState(0);
  const [delayId, setDelayId] = useState<string | null>(null);
  const [delayStreak, setDelayStreak] = useState(0);
  const [yesterdayCount, setYesterdayCount] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const flashTrigger = useSharedValue(0);
  const counterScale = useSharedValue(1);
  const shakeX = useSharedValue(0);
  const messageOpacity = useSharedValue(0);

  const colors = useMemo(() => getEmberColors(count), [count]);
  const exceeded = count > dailyLimit;
  const delayDuration = 300;

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Refetch data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  const fetchData = async () => {
    try {
      const [todayData, settingsData, delayData] = await Promise.all([
        api.get('/logs/today'),
        api.get('/settings'),
        api.get('/delays/streak'),
      ]);
      setCount(todayData.count || 0);
      setDailyLimit(settingsData.daily_limit || 10);
      setDelayStreak(delayData.total_completed || 0);
    } catch (e) {
      console.error('Fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const showMessage = useCallback((msg: string) => {
    setMessage(msg);
    messageOpacity.value = withSequence(
      withTiming(1, { duration: 300 }),
      withTiming(1, { duration: 2000 }),
      withTiming(0, { duration: 500 }),
    );
    setTimeout(() => setMessage(null), 3000);
  }, []);

  const handleIncrement = useCallback(async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    flashTrigger.value = withSequence(
      withTiming(1, { duration: 100 }),
      withTiming(0, { duration: 400 }),
    );
    counterScale.value = withSequence(
      withSpring(1.25, { damping: 10, stiffness: 300 }),
      withSpring(1, { damping: 15, stiffness: 200 }),
    );
    try {
      const result = await api.post('/logs/increment');
      const newCount = result.count;
      setCount(newCount);

      if (newCount > dailyLimit) {
        if (Platform.OS !== 'web') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        }
        shakeX.value = withSequence(
          withTiming(6, { duration: 50 }),
          withTiming(-6, { duration: 50 }),
          withTiming(4, { duration: 40 }),
          withTiming(-4, { duration: 40 }),
          withTiming(0, { duration: 30 }),
        );
        showMessage('You crossed your limit.');
      }
    } catch (e) {
      console.error(e);
    }
  }, [dailyLimit]);

  const handleDecrement = useCallback(async () => {
    if (count <= 0) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    counterScale.value = withSequence(
      withSpring(0.8, { damping: 12, stiffness: 300 }),
      withSpring(1, { damping: 15, stiffness: 200 }),
    );
    try {
      const result = await api.post('/logs/decrement');
      setCount(result.count);
    } catch (e) {
      console.error(e);
    }
  }, [count]);

  const handleDelay = useCallback(async () => {
    if (isDelaying) return;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    try {
      const result = await api.post('/delays/start');
      setDelayId(result.id);
      setIsDelaying(true);
      setDelayTimeLeft(result.duration_seconds || delayDuration);

      timerRef.current = setInterval(() => {
        setDelayTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            timerRef.current = null;
            completeDelay(result.id);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (e) {
      console.error(e);
    }
  }, [isDelaying]);

  const completeDelay = async (id: string) => {
    try {
      await api.post(`/delays/${id}/complete`);
      setIsDelaying(false);
      setDelayId(null);
      setDelayStreak(prev => prev + 1);
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      showMessage('Delay completed. Well done.');
    } catch (e) {
      console.error(e);
      setIsDelaying(false);
    }
  };

  const counterAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: counterScale.value }],
  }));

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const msgStyle = useAnimatedStyle(() => ({
    opacity: messageOpacity.value,
  }));

  const delayProgress = isDelaying ? 1 - delayTimeLeft / delayDuration : 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#FF4500" testID="loading-indicator" />
      </SafeAreaView>
    );
  }

  const diff = yesterdayCount - count;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]} testID="home-screen">
      <Animated.View style={[styles.inner, shakeStyle]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>EMBER</Text>
          {delayStreak > 0 && (
            <View style={styles.streakBadge}>
              <MaterialCommunityIcons name="timer-outline" size={14} color="#FFA500" />
              <Text style={styles.streakText}>{delayStreak}</Text>
            </View>
          )}
        </View>

        {/* Ember Area */}
        <View style={styles.emberArea}>
          <SmokeParticles color={withAlpha(colors.glow, 0.5)} intensity={colors.intensity} />
          {isDelaying && (
            <DelayTimer
              progress={delayProgress}
              timeLeft={delayTimeLeft}
              size={250}
              color={colors.core}
            />
          )}
          <EmberCore count={count} flashTrigger={flashTrigger} exceeded={exceeded} />
        </View>

        {/* Counter Section */}
        <View style={styles.counterSection}>
          <TactileButton
            testID="decrement-btn"
            onPress={handleDecrement}
            size={60}
            hapticType="light"
            disabled={count <= 0}
            color={colors.glow}
          >
            <MaterialCommunityIcons name="minus" size={28} color="#E0E0E0" />
          </TactileButton>

          <View style={styles.countDisplay}>
            <Text style={styles.countLabel}>Cigarettes Today</Text>
            <Animated.View style={counterAnimStyle}>
              <Text style={[styles.countNumber, { color: colors.core }]} testID="cigarette-count">
                {count}
              </Text>
            </Animated.View>
          </View>

          <TactileButton
            testID="increment-btn"
            onPress={handleIncrement}
            size={60}
            hapticType="medium"
            color={colors.glow}
          >
            <MaterialCommunityIcons name="plus" size={28} color="#E0E0E0" />
          </TactileButton>
        </View>

        {/* Delay Button */}
        <TouchableOpacity
          testID="delay-btn"
          style={[styles.delayBtn, isDelaying && styles.delayBtnActive]}
          onPress={handleDelay}
          disabled={isDelaying}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name={isDelaying ? 'timer-sand' : 'clock-outline'}
            size={18}
            color={isDelaying ? '#FFA500' : '#A0A0A0'}
          />
          <Text style={[styles.delayText, isDelaying && { color: '#FFA500' }]}>
            {isDelaying
              ? `Delaying... ${Math.floor(delayTimeLeft / 60)}:${(delayTimeLeft % 60).toString().padStart(2, '0')}`
              : 'Delay 5 Minutes'}
          </Text>
        </TouchableOpacity>

        {/* Message */}
        {message && (
          <Animated.View style={[styles.messageWrap, msgStyle]}>
            <Text style={styles.messageText}>{message}</Text>
          </Animated.View>
        )}

        {/* Limit indicator */}
        <View style={styles.limitRow}>
          <Text style={styles.limitText}>
            Daily limit: {dailyLimit}
          </Text>
          {exceeded && (
            <View style={styles.exceededBadge}>
              <Text style={styles.exceededText}>EXCEEDED</Text>
            </View>
          )}
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    color: '#E0E0E0',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 4,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,165,0,0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  streakText: {
    color: '#FFA500',
    fontSize: 13,
    fontWeight: '700',
  },
  emberArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  counterSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 24,
  },
  countDisplay: {
    alignItems: 'center',
    minWidth: 140,
  },
  countLabel: {
    color: '#707070',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  countNumber: {
    fontSize: 56,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  delayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    backgroundColor: '#121212',
    borderWidth: 1,
    borderColor: '#1E1E1E',
    gap: 8,
    marginBottom: 8,
  },
  delayBtnActive: {
    borderColor: 'rgba(255,165,0,0.3)',
    backgroundColor: 'rgba(255,165,0,0.06)',
  },
  delayText: {
    color: '#A0A0A0',
    fontSize: 14,
    fontWeight: '600',
  },
  messageWrap: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  messageText: {
    color: '#A0A0A0',
    fontSize: 14,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  limitRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 12,
    gap: 8,
  },
  limitText: {
    color: '#404040',
    fontSize: 12,
    fontWeight: '500',
  },
  exceededBadge: {
    backgroundColor: 'rgba(255,0,0,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  exceededText: {
    color: '#FF4500',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
