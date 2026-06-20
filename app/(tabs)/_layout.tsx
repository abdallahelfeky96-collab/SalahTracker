import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { ThemeProvider, useTheme } from '../../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// TABS_CONFIG ordered RTL visual: right -> left
// track (rightmost) -> athkar -> quran -> mawaqeet -> qibla -> stats -> settings (leftmost)
const TABS_CONFIG = [
  { name: "track", label: "متابعة", activeIcon: "checkmark-circle" as const, inactiveIcon: "checkmark-circle-outline" as const },
  { name: "athkar", label: "أذكار", activeIcon: "leaf" as const, inactiveIcon: "leaf-outline" as const },
  { name: "quran", label: "المصحف", activeIcon: "book" as const, inactiveIcon: "book-outline" as const },
  { name: "mawaqeet", label: "المواقيت", activeIcon: "time" as const, inactiveIcon: "time-outline" as const },
  { name: "qibla", label: "القبلة", activeIcon: "compass" as const, inactiveIcon: "compass-outline" as const },
  { name: "stats", label: "إحصائيات", activeIcon: "bar-chart" as const, inactiveIcon: "bar-chart-outline" as const },
  { name: "settings", label: "إعدادات", activeIcon: "settings" as const, inactiveIcon: "settings-outline" as const },
];

const TAB_COUNT = TABS_CONFIG.length;
const TAB_WIDTH = SCREEN_WIDTH / TAB_COUNT;

function CustomTabBar({ navigation, state }: any) {
  const insets = useSafeAreaInsets();
  const { themeStyles, isDarkMode } = useTheme();

  // state.index follows the order of <Tabs.Screen> in code (LTR)
  // TABS_CONFIG is ordered RTL visual
  // So: state.index=0 (track, rightmost visual) -> SVG should be at rightmost (SCREEN_WIDTH - TAB_WIDTH)
  // state.index=6 (settings, leftmost visual) -> SVG should be at leftmost (0)
  const activeIndex = state.index;
  const tX = (TAB_COUNT - 1 - activeIndex) * TAB_WIDTH;

  const h = 60 + insets.bottom;

  const d = `
    M 0 0
    L ${tX + (TAB_WIDTH - 70) / 2} 0
    C ${tX + (TAB_WIDTH - 75) / 2} 20, ${tX + (TAB_WIDTH - 80) / 2 + 6} 46, ${tX + TAB_WIDTH / 2} 50
    C ${tX + TAB_WIDTH - (TAB_WIDTH - 80) / 2 - 6} 46, ${tX + TAB_WIDTH - (TAB_WIDTH - 75) / 2} 20, ${tX + TAB_WIDTH - (TAB_WIDTH - 70) / 2} 0
    L ${SCREEN_WIDTH} 0
    L ${SCREEN_WIDTH} ${h}
    L 0 ${h}
    Z
  `;

  return (
    <View style={[styles.tabBarContainer, { height: h, paddingBottom: insets.bottom }]}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width={SCREEN_WIDTH} height={h} viewBox={`0 0 ${SCREEN_WIDTH} ${h}`}>
          <Path d={d} fill={themeStyles.card} stroke={themeStyles.border} strokeWidth={3} />
        </Svg>
      </View>

      <View style={styles.buttonsRow}>
        {TABS_CONFIG.map((tab, index) => {
          const isFocused = activeIndex === index;
          const circleColor = isDarkMode ? '#c9a84c' : '#0A192F';

          return (
            <TouchableOpacity
              key={tab.name}
              activeOpacity={0.8}
              style={styles.tabButton}
              onPress={() => {
                navigation.jumpTo(tab.name);
              }}
            >
              {isFocused ? (
                <View style={styles.activeWrapper}>
                  <View style={[styles.activeCircle, { backgroundColor: circleColor }]}>
                    <Ionicons name={tab.activeIcon} size={26} color={themeStyles.card} />
                    <Text style={[styles.activeLabel, { color: themeStyles.card }]}>{tab.label}</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.inactiveWrapper}>
                  <Ionicons name={tab.inactiveIcon} size={22} color={themeStyles.subText} />
                  <Text style={[styles.inactiveLabel, { color: themeStyles.subText }]}>{tab.label}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <ThemeProvider>
      <MainTabs />
    </ThemeProvider>
  );
}

function MainTabs() {
  const { themeStyles } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: themeStyles.bg }}>
      <Tabs
        initialRouteName="mawaqeet"
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        {TABS_CONFIG.map((tab) => (
          <Tabs.Screen key={tab.name} name={tab.name} options={{ href: undefined }} />
        ))}
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    overflow: 'visible',
  },
  buttonsRow: {
    flexDirection: 'row',
    width: '100%',
    height: 65,
    overflow: 'visible',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  inactiveWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 10,
  },
  inactiveLabel: {
    fontSize: 9,
    marginTop: 4,
    fontWeight: '500',
  },
  activeWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    top: -18,
    width: TAB_WIDTH,
  },
  activeCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  activeLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    marginTop: 3,
  },
});