import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView, RefreshControl,
  ActivityIndicator, Dimensions,
} from 'react-native';
import Svg, { Rect, Line, Circle as SvgCircle, Text as SvgText } from 'react-native-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../../src/utils/api';
import { getEmberColors } from '../../src/utils/colors';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_W = SCREEN_W - 64;
const CHART_H = 160;

interface DayData { date: string; count: number }
interface Summary {
  today: number; yesterday: number; difference: number;
  weekly_total: number; monthly_total: number; daily_average: number;
  money_spent_weekly: number; money_spent_monthly: number;
  currency: string; delay_streak: number; daily_data: DayData[];
}

function BarChart({ data }: { data: DayData[] }) {
  const last7 = data.slice(-7);
  if (last7.length === 0) return null;
  const max = Math.max(...last7.map(d => d.count), 1);
  const barW = Math.min(28, (CHART_W - 20) / last7.length - 6);
  const gap = (CHART_W - last7.length * barW) / (last7.length + 1);

  return (
    <View style={chartStyles.wrap} testID="weekly-chart">
      <Svg width={CHART_W} height={CHART_H + 30}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
          <Line
            key={i} x1={0} y1={CHART_H * (1 - p)} x2={CHART_W} y2={CHART_H * (1 - p)}
            stroke="rgba(255,255,255,0.04)" strokeWidth={1}
          />
        ))}
        {last7.map((d, i) => {
          const h = Math.max(4, (d.count / max) * (CHART_H - 10));
          const x = gap + i * (barW + gap);
          const y = CHART_H - h;
          const c = getEmberColors(d.count);
          const dayLabel = new Date(d.date + 'T12:00:00').toLocaleDateString('en', { weekday: 'short' });
          return (
            <React.Fragment key={d.date}>
              {/* Glow */}
              <Rect x={x - 2} y={y - 2} width={barW + 4} height={h + 4}
                rx={6} fill={c.core} opacity={0.15} />
              {/* Bar */}
              <Rect x={x} y={y} width={barW} height={h} rx={4} fill={c.core} />
              {/* Count label */}
              <SvgText x={x + barW / 2} y={y - 6} fontSize={10} fill="#A0A0A0"
                textAnchor="middle" fontWeight="600">{d.count}</SvgText>
              {/* Day label */}
              <SvgText x={x + barW / 2} y={CHART_H + 16} fontSize={10}
                fill="#505050" textAnchor="middle">{dayLabel}</SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

function StatCard({ icon, label, value, sub, color = '#E0E0E0' }: {
  icon: string; label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <View style={cardStyles.card} testID={`stat-${label.toLowerCase().replace(/\s/g, '-')}`}>
      <MaterialCommunityIcons name={icon as any} size={20} color={color} />
      <Text style={[cardStyles.value, { color }]}>{value}</Text>
      <Text style={cardStyles.label}>{label}</Text>
      {sub && <Text style={cardStyles.sub}>{sub}</Text>}
    </View>
  );
}

export default function AnalyticsScreen() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetch_ = useCallback(async () => {
    try {
      const data = await api.get('/analytics/summary');
      setSummary(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetch_(); }, []);

  const onRefresh = () => { setRefreshing(true); fetch_(); };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#FF4500" />
      </SafeAreaView>
    );
  }

  if (!summary) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.emptyText}>No data yet. Start tracking on the Home tab.</Text>
      </SafeAreaView>
    );
  }

  const diffText = summary.difference > 0
    ? `${summary.difference} fewer than yesterday`
    : summary.difference < 0
      ? `${Math.abs(summary.difference)} more than yesterday`
      : 'Same as yesterday';

  const diffColor = summary.difference > 0 ? '#2E8B57' : summary.difference < 0 ? '#FF4500' : '#A0A0A0';

  return (
    <SafeAreaView style={styles.container} testID="analytics-screen">
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF4500" />}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Analytics</Text>

        {/* Today highlight */}
        <View style={styles.todayCard}>
          <Text style={styles.todayLabel}>Today</Text>
          <Text style={styles.todayCount}>{summary.today}</Text>
          <Text style={[styles.diffText, { color: diffColor }]}>{diffText}</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.grid}>
          <StatCard icon="chart-line" label="Daily Avg" value={`${summary.daily_average}`} color="#FFA500" />
          <StatCard icon="calendar-week" label="This Week" value={`${summary.weekly_total}`} color="#FF6347" />
          <StatCard icon="calendar-month" label="This Month" value={`${summary.monthly_total}`} color="#DC143C" />
          <StatCard icon="timer-outline" label="Delays" value={`${summary.delay_streak}`} color="#4682B4" />
        </View>

        {/* Weekly Chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Last 7 Days</Text>
          {summary.daily_data.length > 0
            ? <BarChart data={summary.daily_data} />
            : <Text style={styles.emptyText}>No data yet</Text>
          }
        </View>

        {/* Money */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Money Spent</Text>
          <View style={styles.moneyRow}>
            <View style={styles.moneyCard}>
              <Text style={styles.moneyAmount}>
                {summary.currency === 'USD' ? '$' : summary.currency}{summary.money_spent_weekly.toFixed(2)}
              </Text>
              <Text style={styles.moneyLabel}>This Week</Text>
            </View>
            <View style={styles.moneyCard}>
              <Text style={styles.moneyAmount}>
                {summary.currency === 'USD' ? '$' : summary.currency}{summary.money_spent_monthly.toFixed(2)}
              </Text>
              <Text style={styles.moneyLabel}>This Month</Text>
            </View>
          </View>
        </View>

        {/* Health info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Health Recovery Timeline</Text>
          <Text style={styles.healthNote}>Every cigarette you skip matters.</Text>
          {[
            { time: '20 min', info: 'Heart rate normalizes', icon: 'heart-pulse' },
            { time: '8 hours', info: 'Oxygen levels improve', icon: 'lungs' },
            { time: '24 hours', info: 'CO levels drop to normal', icon: 'weather-windy' },
            { time: '48 hours', info: 'Taste and smell sharpen', icon: 'food-apple' },
            { time: '72 hours', info: 'Breathing becomes easier', icon: 'air-filter' },
          ].map((item, i) => (
            <View key={i} style={styles.healthRow}>
              <View style={styles.healthIcon}>
                <MaterialCommunityIcons name={item.icon as any} size={18} color="#4682B4" />
              </View>
              <View style={styles.healthContent}>
                <Text style={styles.healthTime}>{item.time}</Text>
                <Text style={styles.healthInfo}>{item.info}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050505' },
  scroll: { paddingHorizontal: 24, paddingTop: 16 },
  title: { color: '#E0E0E0', fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginBottom: 20 },
  todayCard: {
    backgroundColor: '#121212', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 20,
    borderWidth: 1, borderColor: '#1E1E1E',
  },
  todayLabel: { color: '#707070', fontSize: 13, fontWeight: '600', letterSpacing: 1, textTransform: 'uppercase' },
  todayCount: { color: '#E0E0E0', fontSize: 64, fontWeight: '800', marginVertical: 4, fontVariant: ['tabular-nums'] },
  diffText: { fontSize: 14, fontWeight: '500' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionTitle: { color: '#A0A0A0', fontSize: 16, fontWeight: '700', marginBottom: 12, letterSpacing: 0.3 },
  emptyText: { color: '#505050', fontSize: 14, textAlign: 'center', padding: 20 },
  moneyRow: { flexDirection: 'row', gap: 12 },
  moneyCard: {
    flex: 1, backgroundColor: '#121212', borderRadius: 16, padding: 20, alignItems: 'center',
    borderWidth: 1, borderColor: '#1E1E1E',
  },
  moneyAmount: { color: '#FF6347', fontSize: 24, fontWeight: '800', fontVariant: ['tabular-nums'] },
  moneyLabel: { color: '#707070', fontSize: 12, fontWeight: '500', marginTop: 4, textTransform: 'uppercase' },
  healthNote: { color: '#505050', fontSize: 13, marginBottom: 16, fontStyle: 'italic' },
  healthRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  healthIcon: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(70,130,180,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  healthContent: { flex: 1 },
  healthTime: { color: '#A0A0A0', fontSize: 13, fontWeight: '700' },
  healthInfo: { color: '#606060', fontSize: 13 },
});

const chartStyles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 8 },
});

const cardStyles = StyleSheet.create({
  card: {
    width: (SCREEN_W - 60) / 2, backgroundColor: '#121212', borderRadius: 16,
    padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#1E1E1E',
  },
  value: { fontSize: 28, fontWeight: '800', marginTop: 8, fontVariant: ['tabular-nums'] },
  label: { color: '#707070', fontSize: 11, fontWeight: '600', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  sub: { color: '#505050', fontSize: 11, marginTop: 2 },
});
