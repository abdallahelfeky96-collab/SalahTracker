import { Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

const { width } = Dimensions.get('window');

const TABS = [
  { name: 'settings', label: 'إعدادات', icon: 'settings-outline', href: '/(tabs)/settings' },
  { name: 'stats', label: 'إحصائيات', icon: 'bar-chart-outline', href: '/(tabs)/stats' },
  { name: 'athkar', label: 'أذكار', icon: 'leaf-outline', href: '/(tabs)/athkar' },
  { name: 'mawaqeet', label: 'المواقيت', icon: null, href: '/(tabs)/mawaqeet' },
  { name: 'track', label: 'متابعة', icon: 'checkmark-circle-outline', href: '/(tabs)/track' },
  { name: 'quran', label: 'المصحف', icon: 'book-outline', href: '/(tabs)/quran' },
  { name: 'qibla', label: 'القبلة', icon: 'compass-outline', href: '/(tabs)/qibla' },
];

const CENTER_X = width / 2;
const BAR_H = 75;
const CIRCLE_R = 32;
const DIP = 52;

function MinaretIcon({ color }: { color: string }) {
  return (
    <Svg width={28} height={28} viewBox="0 0 100 100">
      <Path d="M50 5 L55 20 L60 20 L60 25 L55 25 L55 30 Q70 35 70 50 L65 50 L65 75 L70 75 L70 80 L30 80 L30 75 L35 75 L35 50 L30 50 Q30 35 45 30 L45 25 L40 25 L40 20 L45 20 Z" fill={color} />
      <Path d="M25 80 L75 80 L78 90 L22 90 Z" fill={color} />
    </Svg>
  );
}

export default function CustomTabBar({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const totalH = BAR_H + insets.bottom;
  const r = CIRCLE_R + 18;

  const svgPath = `
    M0,0
    L${CENTER_X - r * 1.5},0
    C${CENTER_X - r * 0.55},0 ${CENTER_X - r * 0.9},${DIP} ${CENTER_X},${DIP}
    C${CENTER_X + r * 0.9},${DIP} ${CENTER_X + r * 0.59},0 ${CENTER_X + r * 1.5},0
    L${width},0
    L${width},${BAR_H}
    L0,${BAR_H}
    Z
  `;

  return (
    <View style={[styles.wrapper, { height: totalH }]}>
      <Svg width={width} height={BAR_H} style={styles.svg}>
        <Path d={svgPath} fill="#c9a84c" />
      </Svg>

      <View style={styles.tabs}>
        {TABS.map((tab) => {
          const isActive = pathname === `/(tabs)/${tab.name}` || (tab.name === 'mawaqeet' && pathname === '/');
          const isCenter = tab.name === 'mawaqeet';

          if (isCenter) {
            return (
              <TouchableOpacity
                key={tab.name}
                style={styles.centerTab}
                onPress={() => navigation.navigate(tab.name)}
              >
                <View style={[styles.centerCircle, { borderColor: isActive ? '#fff' : '#c9a84c55' }]}>
                  <MinaretIcon color={isActive ? '#c9a84c' : '#555'} />
                </View>
                <Text style={[styles.centerLabel, { color: isActive ? '#0f1923' : '#0f192366' }]}>
                  المواقيت
                </Text>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tab}
              onPress={() => navigation.navigate(tab.name)}
            >
              <Ionicons
                name={tab.icon as any}
                size={22}
                color={isActive ? '#0f1923' : '#0f192355'}
              />
              <Text style={[styles.label, { color: isActive ? '#0f1923' : '#0f192355' }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {insets.bottom > 0 && (
        <View style={{ height: insets.bottom, backgroundColor: '#c9a84c' }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
  },
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  tabs: {
    flexDirection: 'row',
    height: BAR_H,
    alignItems: 'flex-end',
    paddingBottom: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 15,
  },
  centerTab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 6,
  },
  centerCircle: {
    width: CIRCLE_R * 2 + 4,
    height: CIRCLE_R * 2 + 4,
    borderRadius: CIRCLE_R + 2,
    backgroundColor: '#0f1923',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    marginBottom: -DIP + 7,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  centerLabel: {
    fontSize: 9,
    marginTop: DIP - 5,
    fontWeight: '600',
  },
  label: {
    fontSize: 12,
    marginTop: 3,
    fontWeight: '600',
  },
});