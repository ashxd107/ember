import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, Switch, Platform,
  TextInput, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../src/utils/api';

export default function SettingsScreen() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dailyLimit, setDailyLimit] = useState('10');
  const [price, setPrice] = useState('0.50');
  const [soundEnabled, setSoundEnabled] = useState(false);

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    try {
      const data = await api.get('/settings');
      setSettings(data);
      setDailyLimit(String(data.daily_limit));
      setPrice(String(data.cigarette_price));
      setSoundEnabled(data.sound_enabled);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const save = useCallback(async (updates: any) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    try {
      const result = await api.put('/settings', updates);
      setSettings(result);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const adjustLimit = (delta: number) => {
    const newVal = Math.max(1, parseInt(dailyLimit || '0') + delta);
    setDailyLimit(String(newVal));
    save({ daily_limit: newVal });
  };

  const handlePriceBlur = () => {
    const val = parseFloat(price);
    if (!isNaN(val) && val >= 0) {
      save({ cigarette_price: val });
    }
  };

  const handleSoundToggle = (val: boolean) => {
    setSoundEnabled(val);
    save({ sound_enabled: val });
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleResetToday = () => {
    const doReset = async () => {
      try {
        await api.post('/logs/reset-today');
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      } catch (e) {
        console.error(e);
      }
    };

    if (Platform.OS === 'web') {
      doReset();
    } else {
      Alert.alert('Reset Today', 'Reset today\'s count to 0?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: doReset },
      ]);
    }
  };

  const handleSeedData = async () => {
    try {
      const result = await api.post('/seed');
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#FF4500" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} testID="settings-screen">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Settings</Text>

        {/* Daily Limit */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Limit</Text>
          <View style={styles.limitRow}>
            <TouchableOpacity
              testID="limit-decrement"
              style={styles.limitBtn}
              onPress={() => adjustLimit(-1)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="minus" size={22} color="#E0E0E0" />
            </TouchableOpacity>
            <View style={styles.limitDisplay}>
              <Text style={styles.limitValue} testID="limit-value">{dailyLimit}</Text>
              <Text style={styles.limitLabel}>cigarettes / day</Text>
            </View>
            <TouchableOpacity
              testID="limit-increment"
              style={styles.limitBtn}
              onPress={() => adjustLimit(1)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="plus" size={22} color="#E0E0E0" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Price */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Price per Cigarette</Text>
          <View style={styles.inputRow}>
            <Text style={styles.currency}>$</Text>
            <TextInput
              testID="price-input"
              style={styles.input}
              value={price}
              onChangeText={setPrice}
              onBlur={handlePriceBlur}
              keyboardType="decimal-pad"
              placeholderTextColor="#505050"
            />
          </View>
        </View>

        {/* Sound */}
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.sectionTitle}>Sound Effects</Text>
              <Text style={styles.toggleSub}>Play subtle sounds on interactions</Text>
            </View>
            <Switch
              testID="sound-toggle"
              value={soundEnabled}
              onValueChange={handleSoundToggle}
              trackColor={{ false: '#2A2A2A', true: 'rgba(255,69,0,0.3)' }}
              thumbColor={soundEnabled ? '#FF4500' : '#606060'}
            />
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <TouchableOpacity
            testID="reset-today-btn"
            style={styles.actionBtn}
            onPress={handleResetToday}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="refresh" size={20} color="#FF4500" />
            <Text style={styles.actionText}>Reset Today's Count</Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="seed-data-btn"
            style={[styles.actionBtn, { marginTop: 12 }]}
            onPress={handleSeedData}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="database-plus" size={20} color="#4682B4" />
            <Text style={[styles.actionText, { color: '#4682B4' }]}>Generate Sample Data</Text>
          </TouchableOpacity>
        </View>

        {/* About */}
        <View style={[styles.section, { marginTop: 16 }]}>
          <Text style={styles.aboutText}>
            EMBER is an awareness tool. No judgment.{'\n'}Just observation.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  scroll: { paddingHorizontal: 24, paddingTop: 16 },
  title: { color: '#E0E0E0', fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginBottom: 28 },
  section: { marginBottom: 28 },
  sectionTitle: { color: '#A0A0A0', fontSize: 14, fontWeight: '700', letterSpacing: 0.3, marginBottom: 12 },
  limitRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20,
  },
  limitBtn: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: '#1A1A1A',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5,
  },
  limitDisplay: { alignItems: 'center', minWidth: 100 },
  limitValue: { color: '#E0E0E0', fontSize: 48, fontWeight: '800', fontVariant: ['tabular-nums'] },
  limitLabel: { color: '#505050', fontSize: 12, fontWeight: '500', marginTop: 2 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#121212',
    borderRadius: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: '#1E1E1E',
  },
  currency: { color: '#A0A0A0', fontSize: 20, fontWeight: '600', marginRight: 8 },
  input: {
    flex: 1, color: '#E0E0E0', fontSize: 20, fontWeight: '600', paddingVertical: 14,
  },
  toggleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  toggleSub: { color: '#505050', fontSize: 12, marginTop: 2 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#121212', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#1E1E1E',
  },
  actionText: { color: '#FF4500', fontSize: 15, fontWeight: '600' },
  aboutText: {
    color: '#404040', fontSize: 13, textAlign: 'center', lineHeight: 20, fontStyle: 'italic',
  },
});
