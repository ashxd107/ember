import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet } from 'react-native';

function TrackIcon({ color, size }: { color: string; size: number }) {
  return <MaterialCommunityIcons name="fire" size={size} color={color} />;
}
function AnalyticsIcon({ color, size }: { color: string; size: number }) {
  return <MaterialCommunityIcons name="chart-bar" size={size} color={color} />;
}
function SettingsIcon({ color, size }: { color: string; size: number }) {
  return <MaterialCommunityIcons name="cog-outline" size={size} color={color} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#FF4500',
        tabBarInactiveTintColor: '#505050',
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Track', tabBarIcon: TrackIcon }}
      />
      <Tabs.Screen
        name="analytics"
        options={{ title: 'Analytics', tabBarIcon: AnalyticsIcon }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Settings', tabBarIcon: SettingsIcon }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#0A0A0A',
    borderTopColor: '#1A1A1A',
    borderTopWidth: 0.5,
    height: 85,
    paddingTop: 8,
    paddingBottom: 28,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  tabItem: {
    paddingTop: 4,
  },
});
