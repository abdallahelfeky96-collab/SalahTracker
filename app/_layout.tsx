import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { I18nManager } from 'react-native';
import { ThemeProvider } from './../context/ThemeContext';
import CustomSplashScreen from './SplashScreen';

I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

export default function RootLayout() {
  const [showCustomSplash, setShowCustomSplash] = useState(true);

  useEffect(() => {
    // اخفاء الـ Native Splash فوراً
    SplashScreen.hideAsync();
  }, []);

  return (
    <ThemeProvider>
      {showCustomSplash && (
        <CustomSplashScreen onFinish={() => setShowCustomSplash(false)} />
      )}
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </ThemeProvider>
  );
}