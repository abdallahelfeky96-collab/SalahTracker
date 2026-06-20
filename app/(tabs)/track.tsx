import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Adhan from 'adhan';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { Platform, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAppAlert } from '../../hooks/useAppAlert';
import AppAlert from '../AppAlert';

const PRAYERS = [
  { key: 'fajr', name: 'الفجر', icon: '🌙' },
  { key: 'dhuhr', name: 'الظهر', icon: '☀️' },
  { key: 'asr', name: 'العصر', icon: '🌤️' },
  { key: 'maghrib', name: 'المغرب', icon: '🌇' },
  { key: 'isha', name: 'العشاء', icon: '🌃' },
];

const LOCATIONS = [
  { key: 'mosque', label: '🕌 مسجد' },
  { key: 'home', label: '🏠 بيت' },
  { key: 'work', label: '💼 شغل' },
];

type PrayerRecord = {
  done: boolean;
  onTime: boolean;
  location: string;
};

type DayRecord = {
  [key: string]: PrayerRecord;
};

export default function TrackScreen() {
  const { themeStyles, isDarkMode } = useTheme();
  const today = new Date().toISOString().split('T')[0];
  const [records, setRecords] = useState<DayRecord>({});
  const [selecting, setSelecting] = useState<string | null>(null);
  const [prayerTimes, setPrayerTimes] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { visible, message, type, showAlert, hideAlert } = useAppAlert();

  useEffect(() => {
    loadToday(today);
    setupPrayerTimes();
    setupNotificationChannel();

    const interval = setInterval(() => {
      setRecords(prev => ({ ...prev }));
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  async function setupNotificationChannel() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('prayer-alerts', {
        name: 'تنبيهات الصلاة',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        enableVibrate: true,
      });
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadToday(today);
    await setupPrayerTimes();
    setRefreshing(false);
  }

  async function loadToday(date: string) {
    try {
      const data = await AsyncStorage.getItem(`day_${date}`);
      if (data) setRecords(JSON.parse(data));
      else setRecords({});
    } catch (e) {}
  }

  async function setupPrayerTimes() {
    try {
      const settingsData = await AsyncStorage.getItem('user_settings');
      const settings = settingsData ? JSON.parse(settingsData) : {};
      const isNotifyPrayerEnabled = settings.notifyPrayer ?? true;

      if (!isNotifyPrayerEnabled) {
        await Notifications.cancelAllScheduledNotificationsAsync();
        return;
      }

      await Notifications.requestPermissionsAsync();

      const { status } = await Location.requestForegroundPermissionsAsync();
      let lat = 30.0444, lng = 31.2357;

      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
      }

      const coords = new Adhan.Coordinates(lat, lng);
      const params = Adhan.CalculationMethod.Egyptian();
      const times = new Adhan.PrayerTimes(coords, new Date(), params);
      setPrayerTimes(times);

      await scheduleNotifications(times);
    } catch (e) {}
  }

  async function scheduleNotifications(times: any) {
    await Notifications.cancelAllScheduledNotificationsAsync();

    const prayerTimeMap: { [key: string]: Date } = {
      fajr: times.fajr,
      dhuhr: times.dhuhr,
      asr: times.asr,
      maghrib: times.maghrib,
      isha: times.isha,
    };

    for (const prayer of PRAYERS) {
      const prayerTime = prayerTimeMap[prayer.key];
      if (!prayerTime) continue;
      const now = new Date();

      if (prayerTime > now) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `🕌 حان وقت ${prayer.name}`,
            body: 'حان وقت الصلاة، تقبل الله منك',
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: prayerTime,
            channelId: 'prayer-alerts',
          } as any,
        });
      }

      const reminderTime = new Date(prayerTime.getTime() + 30 * 60 * 1000);
      if (reminderTime > now) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `📝 هل صليت ${prayer.name}؟`,
            body: 'لا تنسى تسجيل صلاتك في التطبيق',
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: reminderTime,
            channelId: 'prayer-alerts',
          } as any,
        });
      }
    }
  }

  async function saveRecords(newRecords: DayRecord) {
    setRecords(newRecords);
    await AsyncStorage.setItem(`day_${today}`, JSON.stringify(newRecords));
    await AsyncStorage.setItem(`stats_${today}`, JSON.stringify(newRecords));
  }

  function isPrayerAvailable(prayerKey: string): boolean {
    if (!prayerTimes) return false;
    const prayerTimeMap: { [key: string]: Date } = {
      fajr: prayerTimes.fajr,
      dhuhr: prayerTimes.dhuhr,
      asr: prayerTimes.asr,
      maghrib: prayerTimes.maghrib,
      isha: prayerTimes.isha,
    };
    const prayerTime = prayerTimeMap[prayerKey];
    if (!prayerTime) return false;
    const diff = new Date().getTime() - prayerTime.getTime();
    return diff >= 30 * 60 * 1000;
  }

  function getPrayerColor(prayerKey: string) {
    const record = records[prayerKey];
    if (!record) return null;
    if (!record.done) return 'red';
    if (record.onTime && record.location === 'mosque') return 'green';
    return 'yellow';
  }

  function handlePrayerPress(prayerKey: string) {
    if (!isPrayerAvailable(prayerKey)) return;
    setSelecting(selecting === prayerKey ? null : prayerKey);
  }

  async function handleOption(prayerKey: string, onTime: boolean, location: string) {
    const newRecords = { ...records, [prayerKey]: { done: true, onTime, location } };
    await saveRecords(newRecords);
    setSelecting(null);
  }

  async function handleNotDone(prayerKey: string) {
    const newRecords = { ...records, [prayerKey]: { done: false, onTime: false, location: '' } };
    await saveRecords(newRecords);
    setSelecting(null);
  }

  const doneCount = PRAYERS.filter(p => records[p.key]?.done).length;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: themeStyles.bg }]}
      contentContainerStyle={[styles.content, { backgroundColor: themeStyles.bg }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={themeStyles.accent}
          colors={[themeStyles.accent]}
        />
      }
    >
      <AppAlert visible={visible} message={message} type={type} onClose={hideAlert} />
      <Text style={[styles.title, { color: themeStyles.accent }]}>✅ متابعة الصلوات</Text>
      <Text style={[styles.date, { color: themeStyles.subText }]}>
        {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </Text>

      <View style={styles.progressContainer}>
        <Text style={[styles.progressText, { color: themeStyles.accent }]}>{doneCount} / {PRAYERS.length} صلوات</Text>
        <View style={[styles.progressBar, { backgroundColor: themeStyles.card }]}>
          <View style={[styles.progressFill, { width: `${(doneCount / PRAYERS.length) * 100}%`, backgroundColor: themeStyles.accent }]} />
        </View>
      </View>

      {PRAYERS.map((prayer) => {
        const record = records[prayer.key];
        const isSelecting = selecting === prayer.key;
        const available = isPrayerAvailable(prayer.key);
        const color = getPrayerColor(prayer.key);

        const cardStyle = [
          styles.prayerRow,
          { backgroundColor: themeStyles.card, borderColor: themeStyles.border },
          color === 'green' && { borderColor: '#4caf50', backgroundColor: isDarkMode ? '#1a2e1a' : '#e8f5e9' },
          color === 'yellow' && { borderColor: '#c9a84c', backgroundColor: isDarkMode ? '#2e2a1a' : '#fff8e1' },
          color === 'red' && { borderColor: '#ff4444', backgroundColor: isDarkMode ? '#2a1a1a' : '#ffebee' },
          !available && { opacity: 0.5 },
        ];

        return (
          <View key={prayer.key} style={[styles.prayerCard, { width: '90%', marginBottom: 10 }]}>
            <TouchableOpacity style={cardStyle} onPress={() => handlePrayerPress(prayer.key)}>
              <Text style={styles.prayerIcon}>{prayer.icon}</Text>
              <Text style={[styles.prayerName, { color: themeStyles.text }]}>{prayer.name}</Text>
              {!available ? (
                <Text style={[styles.lockedText, { color: themeStyles.subText }]}>🔒 لم يحن وقتها</Text>
              ) : record?.done ? (
                <View style={styles.prayerInfo}>
                  <Text style={[styles.prayerInfoText, { color: themeStyles.accent }]}>{record.onTime ? '⏰ في وقتها' : '⌛ قضاء'}</Text>
                  <Text style={[styles.prayerInfoText, { color: themeStyles.accent }]}>{LOCATIONS.find(l => l.key === record.location)?.label}</Text>
                </View>
              ) : record?.done === false ? (
                <Text style={[styles.missedText, { color: '#ff4444' }]}>❌ لم تُصلَّ</Text>
              ) : (
                <Text style={[styles.pendingText, { color: themeStyles.subText }]}>اضغط للتسجيل</Text>
              )}
            </TouchableOpacity>

            {isSelecting && (
              <View style={[styles.optionsContainer, { backgroundColor: themeStyles.card, borderColor: themeStyles.accent + '44' }]}>
                <Text style={[styles.optionsTitle, { color: themeStyles.accent }]}>في وقتها ولا قضاء؟</Text>
                <View style={styles.optionsRow}>
                  {[true, false].map((onTime) => (
                    <View key={String(onTime)} style={styles.optionCol}>
                      <Text style={[styles.optionLabel, { color: themeStyles.text }]}>{onTime ? '⏰ في وقتها' : '⌛ قضاء'}</Text>
                      {LOCATIONS.map((loc) => (
                        <TouchableOpacity
                          key={loc.key}
                          style={[styles.optionBtn, { backgroundColor: themeStyles.bg, borderColor: themeStyles.border }]}
                          onPress={() => handleOption(prayer.key, onTime, loc.key)}
                        >
                          <Text style={[styles.optionBtnText, { color: themeStyles.text }]}>{loc.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ))}
                </View>
                <TouchableOpacity style={[styles.missedBtn, { backgroundColor: isDarkMode ? '#2a1a1a' : '#ffebee', borderColor: '#ff444444' }]} onPress={() => handleNotDone(prayer.key)}>
                  <Text style={[styles.missedBtnText, { color: '#ff4444' }]}>❌ لم أصلِّها</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { alignItems: 'center', paddingTop: 60, paddingBottom: 100 },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 8 },
  date: { fontSize: 13, marginBottom: 20 },
  progressContainer: { width: '90%', marginBottom: 20 },
  progressText: { textAlign: 'center', marginBottom: 8, fontSize: 16 },
  progressBar: { height: 8, borderRadius: 4 },
  progressFill: { height: 8, borderRadius: 4 },
  prayerCard: { width: '90%', marginBottom: 10 },
  prayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  prayerIcon: { fontSize: 24, marginLeft: 12 },
  prayerName: { flex: 1, fontSize: 18, textAlign: 'right' },
  prayerInfo: { alignItems: 'flex-end' },
  prayerInfoText: { fontSize: 11 },
  missedText: { fontSize: 13 },
  pendingText: { fontSize: 12 },
  lockedText: { fontSize: 12 },
  optionsContainer: {
    borderRadius: 12,
    padding: 16,
    marginTop: 4,
    borderWidth: 1,
  },
  optionsTitle: { textAlign: 'center', marginBottom: 12, fontSize: 15 },
  optionsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  optionCol: { alignItems: 'center', gap: 8 },
  optionLabel: { fontSize: 13, marginBottom: 4 },
  optionBtn: {
    borderRadius: 8,
    padding: 10,
    width: 120,
    alignItems: 'center',
    borderWidth: 1,
  },
  optionBtnText: { fontSize: 13 },
  missedBtn: {
    marginTop: 12,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  missedBtnText: { fontSize: 13 },
});