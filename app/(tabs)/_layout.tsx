import { Tabs } from 'expo-router';
import { Platform, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, Calculator, BookOpen, FileText, Settings } from 'lucide-react-native';

export default function TabLayout() {
  const isDark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();
  const active = '#2E6DB4';
  const inactive = isDark ? '#64748B' : '#94A3B8';
  const tabBg = isDark ? '#0A1628' : '#FFFFFF';
  const headerBg = isDark ? '#0A1628' : '#FFFFFF';
  const headerTitle = isDark ? '#F1F5F9' : '#0A1628';

  const bottomPad = Platform.OS === 'ios' ? 28 : Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: active,
        tabBarInactiveTintColor: inactive,
        tabBarStyle: {
          backgroundColor: tabBg,
          borderTopColor: isDark ? '#1E3A5F' : '#E2E4EA',
          borderTopWidth: 0.5,
          height: Platform.OS === 'ios' ? 88 : 56 + Math.max(insets.bottom, 0),
          paddingBottom: bottomPad,
          paddingTop: 4,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
        headerStyle: { backgroundColor: headerBg },
        headerTitleStyle: { color: headerTitle, fontSize: 17, fontWeight: '600' },
        headerTintColor: active,
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          headerTitle: 'PilotRules',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="calculators"
        options={{
          title: 'Calculators',
          tabBarIcon: ({ color, size }) => <Calculator size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="rules"
        options={{
          title: 'Rules',
          headerTitle: 'Working Conditions',
          tabBarIcon: ({ color, size }) => <BookOpen size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="document"
        options={{
          title: 'Document',
          tabBarIcon: ({ color, size }) => <FileText size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
