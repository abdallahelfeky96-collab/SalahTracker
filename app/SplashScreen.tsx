import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useTheme } from './../context/ThemeContext';

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const { themeStyles, isDarkMode } = useTheme();
  const [isReady, setIsReady] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entry animation
    Animated.sequence([
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.5)),
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic),
        }),
      ]),
      Animated.timing(textFadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Wait then exit
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isReady) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease),
      }).start(() => {
        onFinish();
      });
    }
  }, [isReady]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[styles.container, { backgroundColor: themeStyles.bg, opacity: fadeAnim }]}>
      <Animated.View style={[styles.logoContainer, { transform: [{ scale: scaleAnim }, { rotate }] }]}>
        <View style={[styles.logoOuter, { borderColor: themeStyles.accent }]}>
          <View style={[styles.logoInner, { backgroundColor: themeStyles.accent }]}>
            <Text style={styles.logoText}>🕌</Text>
          </View>
        </View>
      </Animated.View>

      <Animated.View style={{ opacity: textFadeAnim, alignItems: 'center' }}>
        <Text style={[styles.appName, { color: themeStyles.accent }]}>صلاتي</Text>
        <Text style={[styles.subtitle, { color: themeStyles.subText }]}>
          {isDarkMode ? 'رفيقك في الطاعة' : 'رفيقك في الطاعة'}
        </Text>
      </Animated.View>

      <Animated.View style={[styles.loadingContainer, { opacity: textFadeAnim }]}>
        <View style={styles.loadingBar}>
          <Animated.View 
            style={[
              styles.loadingFill, 
              { backgroundColor: themeStyles.accent }
            ]} 
          />
        </View>
        <Text style={[styles.loadingText, { color: themeStyles.subText }]}>جاري التحميل...</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 50,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 40,
  },
  loadingContainer: {
    width: 200,
    alignItems: 'center',
  },
  loadingBar: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(201, 168, 76, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 12,
  },
  loadingFill: {
    width: '60%',
    height: '100%',
    borderRadius: 2,
  },
  loadingText: {
    fontSize: 12,
  },
});