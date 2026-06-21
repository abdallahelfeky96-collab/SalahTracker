import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { useTheme } from './../context/ThemeContext';

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const { themeStyles } = useTheme();
  const [isReady, setIsReady] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const textFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(textFadeAnim, {
        toValue: 1,
        duration: 800,
        delay: 400,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => setIsReady(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isReady) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease),
      }).start(() => onFinish());
    }
  }, [isReady, onFinish]);

  return (
    <Animated.View style={[styles.container, { backgroundColor: themeStyles.bg, opacity: fadeAnim }]}>
      <Animated.View style={[styles.logoContainer, { transform: [{ scale: scaleAnim }] }]}>
        <Image 
          source={require('../assets/images/splash-icon.png')} 
          style={styles.logoImage}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.View style={{ opacity: textFadeAnim, alignItems: 'center', marginTop: 20 }}>
        <Text style={[styles.appName, { color: themeStyles.accent }]}>صلاتي</Text>
        <Text style={[styles.subtitle, { color: themeStyles.subText }]}>
          اقر صلاتك تطلب حياتك
        </Text>
      </Animated.View>

      <Animated.View style={[styles.loadingContainer, { opacity: textFadeAnim }]}>
        <View style={styles.loadingBar}>
          <View style={[styles.loadingFill, { backgroundColor: themeStyles.accent }]} />
        </View>
        <Text style={[styles.loadingText, { color: themeStyles.subText }]}>
          جاري التحميل...
        </Text>
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
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 9999,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: {
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 6,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  loadingContainer: {
    width: 180,
    alignItems: 'center',
    position: 'absolute',
    bottom: 80,
  },
  loadingBar: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(201, 168, 76, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 10,
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