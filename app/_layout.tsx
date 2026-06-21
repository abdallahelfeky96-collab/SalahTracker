import { Stack } from 'expo-router';
import { useState } from 'react';
import { ThemeProvider } from './../context/ThemeContext';
import SplashScreen from './SplashScreen';

export default function RootLayout() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <ThemeProvider>
      {showSplash && (
        <SplashScreen onFinish={() => setShowSplash(false)} />
      )}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </ThemeProvider>
  );
}