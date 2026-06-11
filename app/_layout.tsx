import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

export default function RootLayout() {
  const isDark = useColorScheme() === 'dark';
  const headerBg = isDark ? '#0A1628' : '#FFFFFF';
  const headerTitle = isDark ? '#F1F5F9' : '#0A1628';

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: headerBg },
          headerTintColor: '#2E6DB4',
          headerTitleStyle: { color: headerTitle, fontSize: 17, fontWeight: '600' },
          headerBackTitle: 'Back',
          contentStyle: { backgroundColor: isDark ? '#0A1628' : '#F7F8FA' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="calculators/fdp" options={{ title: 'FDP Calculator' }} />
        <Stack.Screen name="calculators/rest" options={{ title: 'Rest Checker' }} />
        <Stack.Screen name="calculators/days-off" options={{ title: 'Days Off' }} />
        <Stack.Screen name="calculators/route" options={{ title: 'Route Lookup' }} />
        <Stack.Screen name="calculators/standby" options={{ title: 'Standby Decoder' }} />
        <Stack.Screen name="calculators/delay" options={{ title: 'Delay Tool' }} />
        <Stack.Screen name="calculators/coefficient" options={{ title: 'Coefficient Bank' }} />
        <Stack.Screen name="calculators/owc" options={{ title: 'OWC Calculator' }} />
        <Stack.Screen name="calculators/perf" options={{ title: 'Performance Pay' }} />
        <Stack.Screen name="rule/[id]" options={{ title: 'Rule Detail' }} />
      </Stack>
    </>
  );
}
