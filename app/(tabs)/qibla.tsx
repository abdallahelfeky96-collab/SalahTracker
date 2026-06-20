import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';

function getQiblaDirection(lat: number, lng: number): number {
  const makkahLat = 21.4225 * (Math.PI / 180);
  const makkahLng = 39.8262 * (Math.PI / 180);
  const userLat = lat * (Math.PI / 180);
  const userLng = lng * (Math.PI / 180);
  const dLng = makkahLng - userLng;
  const y = Math.sin(dLng) * Math.cos(makkahLat);
  const x = Math.cos(userLat) * Math.sin(makkahLat) - Math.sin(userLat) * Math.cos(makkahLat) * Math.cos(dLng);
  const bearing = Math.atan2(y, x) * (180 / Math.PI);
  return (bearing + 360) % 360;
}

export default function QiblaScreen() {
  const { themeStyles } = useTheme();
  const [heading, setHeading] = useState(0);
  const [qiblaAngle, setQiblaAngle] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setupQibla();
    return () => Magnetometer.removeAllListeners();
  }, []);

  async function setupQibla() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('محتاج إذن الموقع');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const angle = getQiblaDirection(loc.coords.latitude, loc.coords.longitude);
      setQiblaAngle(angle);

      Magnetometer.setUpdateInterval(100);
      Magnetometer.addListener(({ x, y, z }) => {
        let angle = Math.atan2(x, y) * (180 / Math.PI);
        let matchHeading = (-angle + 360) % 360;
        setHeading(matchHeading);
      });
    } catch (e) {
      setError('حصل خطأ في تحديد الموقع');
    }
  }

  const compassRotation = (360 - heading) % 360;
  const arrowRotation = qiblaAngle !== null ? (qiblaAngle - heading + 360) % 360 : 0;
  const isAligned = Math.abs(arrowRotation) < 5 || Math.abs(arrowRotation - 360) < 5;

  return (
    <View style={[styles.container, { backgroundColor: themeStyles.bg }]}>
      <Text style={[styles.title, { color: themeStyles.accent }]}>🧭 اتجاه القبلة</Text>

      {error ? (
        <Text style={[styles.error, { color: '#ff4444' }]}>{error}</Text>
      ) : qiblaAngle === null ? (
        <Text style={[styles.loading, { color: themeStyles.subText }]}>جاري تحديد الموقع والقبلة...</Text>
      ) : (
        <>
          <View style={styles.compassContainer}>
            <Animated.View style={[styles.fullCompass, {
              transform: [{ rotate: `${compassRotation}deg` }]
            }]}>
              <Svg width={280} height={280} viewBox="0 0 280 280">
                <Circle cx="140" cy="140" r="130" fill={themeStyles.card} stroke={themeStyles.border} strokeWidth="2" />
                <Circle cx="140" cy="140" r="110" fill="none" stroke={themeStyles.border} strokeWidth="1" strokeDasharray="5,5" />

                <SvgText x="140" y="25" textAnchor="middle" fill={themeStyles.accent} fontSize="18" fontWeight="bold">ش</SvgText>
                <SvgText x="260" y="146" textAnchor="middle" fill={themeStyles.subText} fontSize="14">ق</SvgText>
                <SvgText x="140" y="268" textAnchor="middle" fill={themeStyles.subText} fontSize="14">ج</SvgText>
                <SvgText x="20" y="146" textAnchor="middle" fill={themeStyles.subText} fontSize="14">غ</SvgText>

                {Array.from({ length: 36 }).map((_, i) => {
                  const angle = (i * 10 * Math.PI) / 180;
                  const isMajor = i % 9 === 0;
                  const r1 = isMajor ? 115 : 120;
                  const r2 = 130;
                  return (
                    <Line
                      key={i}
                      x1={140 + r1 * Math.sin(angle)}
                      y1={140 - r1 * Math.cos(angle)}
                      x2={140 + r2 * Math.sin(angle)}
                      y2={140 - r2 * Math.cos(angle)}
                      stroke={isMajor ? themeStyles.accent : themeStyles.border}
                      strokeWidth={isMajor ? 2 : 1}
                    />
                  );
                })}
              </Svg>
            </Animated.View>

            <View style={styles.arrowContainer}>
              <Animated.View style={[styles.arrow, {
                transform: [{ rotate: `${arrowRotation}deg` }]
              }]}>
                <Svg width={120} height={120} viewBox="0 0 80 80">
                  <Path
                    d="M40 5 L52 35 L40 30 L28 35 Z"
                    fill={isAligned ? '#4caf50' : themeStyles.accent}
                  />
                  <Path
                    d="M40 75 L48 40 L40 43 L32 40 Z"
                    fill={themeStyles.border}
                  />
                  <Circle cx="40" cy="40" r="5" fill={themeStyles.bg} stroke={themeStyles.accent} strokeWidth="2" />
                </Svg>
              </Animated.View>

              <View style={styles.kaabaIcon}>
                <Text style={styles.kaabaText}>🕋</Text>
              </View>
            </View>
          </View>

          <View style={styles.infoContainer}>
            <Text style={[styles.alignedText, { color: isAligned ? '#4caf50' : themeStyles.accent }]}>
              {isAligned ? '✅ أنت متجه نحو القبلة' : '🧭 حرك موبايلك باتجاه السهم'}
            </Text>
            <Text style={[styles.angleText, { color: themeStyles.subText }]}>
              درجة القبلة بموقعك: {Math.round(qiblaAngle)}°
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 30 },
  loading: { fontSize: 16 },
  error: { fontSize: 16 },
  compassContainer: { width: 280, height: 280, alignItems: 'center', justifyContent: 'center' },
  fullCompass: { position: 'absolute', width: 280, height: 280 },
  arrowContainer: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  arrow: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  kaabaIcon: { position: 'absolute' },
  kaabaText: { fontSize: 22 },
  infoContainer: { marginTop: 40, alignItems: 'center', gap: 10 },
  alignedText: { fontSize: 18, fontWeight: 'bold' },
  angleText: { fontSize: 14 },
});
