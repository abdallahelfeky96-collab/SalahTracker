import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Adhan from 'adhan';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { Platform, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAppAlert } from '../../hooks/useAppAlert';
import AppAlert from '../AppAlert';

const PRAYERS = [
  { key: 'fajr', name: 'الفجر', icon: '🌙' },
  { key: 'sunrise', name: 'الشروق', icon: '🌅' },
  { key: 'duha', name: 'الضحى', icon: '☀️' },
  { key: 'dhuhr', name: 'الظهر', icon: '☀️' },
  { key: 'asr', name: 'العصر', icon: '🌤️' },
  { key: 'maghrib', name: 'المغرب', icon: '🌇' },
  { key: 'isha', name: 'العشاء', icon: '🌃' },
];

const DEFAULT_ADHAN_ASSETS: { [key: string]: any } = {
  fajr: require('../../assets/adhan/fajr.mp3'),
  dhuhr: require('../../assets/adhan/dhuhr.mp3'),
  asr: require('../../assets/adhan/asr.mp3'),
  maghrib: require('../../assets/adhan/maghrib.mp3'),
  isha: require('../../assets/adhan/ishaa.mp3'),
};

const ADHAN_DIR = FileSystem.documentDirectory + 'adhan/';

function formatTime(date: Date) {
  return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function HomeScreen() {
  const { themeStyles, isDarkMode } = useTheme();
  const [times, setTimes] = useState<any>(null);
  const [nextPrayer, setNextPrayer] = useState<string>('');
  const [cityName, setCityName] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSheikh, setSelectedSheikh] = useState<string>('default');
  const [downloadedSheikh, setDownloadedSheikh] = useState<string | null>(null);
  const { visible, message, type, showAlert, hideAlert } = useAppAlert();

  useEffect(() => {
    getPrayerTimes();
    loadAdhanSettings();
    setupNotificationChannel();
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

  async function loadAdhanSettings() {
    try {
      const settingsData = await AsyncStorage.getItem('user_settings');
      const settings = settingsData ? JSON.parse(settingsData) : {};
      setSelectedSheikh(settings.selectedSheikh || 'default');
      const saved = await AsyncStorage.getItem('downloaded_adhan_sheikh');
      if (saved) setDownloadedSheikh(saved);
    } catch (e) {}
  }

  async function getPrayerTimes() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      let lat = 30.0444, lng = 31.2357;

      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        lat = location.coords.latitude;
        lng = location.coords.longitude;
        const geocode = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        if (geocode.length > 0) {
          const { city, region } = geocode[0];
          setCityName(`${city || ''} - ${region || ''}`);
        }
      }

      const coords = new Adhan.Coordinates(lat, lng);
      const params = Adhan.CalculationMethod.Egyptian();
      const prayerTimes = new Adhan.PrayerTimes(coords, new Date(), params);
      setTimes(prayerTimes);
      setNextPrayer(prayerTimes.nextPrayer());

      const settingsData = await AsyncStorage.getItem('user_settings');
      const settings = settingsData ? JSON.parse(settingsData) : {};
      const isNotifyPrayerEnabled = settings.notifyPrayer ?? true;
      const isNotifyAthkarEnabled = settings.notifyAthkar ?? true;
      const isNotifyWirdEnabled = settings.notifyWird ?? true;
      const sheikh = settings.selectedSheikh || 'default';
      const downloaded = await AsyncStorage.getItem('downloaded_adhan_sheikh');

      await Notifications.cancelAllScheduledNotificationsAsync();

      if (isNotifyAthkarEnabled) {
        await scheduleDuhaNotification(prayerTimes.sunrise);
      }
      if (isNotifyPrayerEnabled) {
        await schedulePrayerNotifications(prayerTimes, sheikh, downloaded);
      }
      if (isNotifyWirdEnabled) {
        await scheduleWirdNotification();
      }
    } catch (e) {
      showAlert('حدث خطأ في تحديد المواقيت', 'error');
    }
  }

  async function getAdhanSoundUri(prayerKey: string, sheikhKey: string): Promise<string | null> {
    try {
      if (sheikhKey === 'default') {
        const asset = Asset.fromModule(DEFAULT_ADHAN_ASSETS[prayerKey]);
        await asset.downloadAsync();
        if (asset.localUri) {
          const dest = FileSystem.cacheDirectory + `adhan_${prayerKey}.mp3`;
          const info = await FileSystem.getInfoAsync(dest);
          if (!info.exists) {
            await FileSystem.copyAsync({ from: asset.localUri, to: dest });
          }
          return dest;
        }
      } else {
        const localPath = ADHAN_DIR + sheikhKey + '/' + prayerKey + '.mp3';
        const info = await FileSystem.getInfoAsync(localPath);
        if (info.exists) return localPath;
      }
    } catch (e) {
      console.log('Error getting adhan sound:', e);
    }
    return null;
  }

  async function schedulePrayerNotifications(prayerTimes: any, sheikhKey: string, downloadedSheikh: string | null) {
    try {
      await Notifications.requestPermissionsAsync();
      const corePrayers = [
        { key: 'fajr', name: 'الفجر' },
        { key: 'dhuhr', name: 'الظهر' },
        { key: 'asr', name: 'العصر' },
        { key: 'maghrib', name: 'المغرب' },
        { key: 'isha', name: 'العشاء' },
      ];
      const now = new Date();

      for (const prayer of corePrayers) {
        const prayerDate = prayerTimes[prayer.key];
        if (prayerDate && prayerDate > now) {
          let soundConfig: any = true;
          let bodyText = `أقم صلاتك تنعم بحياتك، موعد الأذان حسب توقيتك المحلي.`;

          if (sheikhKey === 'default') {
            const adhanUri = await getAdhanSoundUri(prayer.key, 'default');
            if (adhanUri) {
              soundConfig = adhanUri;
              bodyText = `🎵 أذان الافتراضي - حان وقت صلاة ${prayer.name}`;
            }
          } else if (sheikhKey === downloadedSheikh) {
            const adhanUri = await getAdhanSoundUri(prayer.key, sheikhKey);
            if (adhanUri) {
              soundConfig = adhanUri;
              bodyText = `🎵 أذان ${getSheikhLabel(sheikhKey)} - حان وقت صلاة ${prayer.name}`;
            } else {
              bodyText = `⚠️ أذان ${getSheikhLabel(sheikhKey)} غير محمل. حمله من الإعدادات.`;
            }
          } else if (sheikhKey !== 'default') {
            bodyText = `⚠️ أذان ${getSheikhLabel(sheikhKey)} غير محمل. حمله من الإعدادات.`;
          }

          await Notifications.scheduleNotificationAsync({
            content: {
              title: `🕌 حان الآن موعد صلاة ${prayer.name}`,
              body: bodyText,
              sound: soundConfig,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: prayerDate,
              channelId: 'prayer-alerts',
            } as any,
          });
        }
      }
    } catch (e) {
      console.error('Error scheduling core prayers: ', e);
    }
  }

  function getSheikhLabel(key: string): string {
    const labels: { [key: string]: string } = {
      'default': 'الافتراضي',
      'mishary': 'مشاري راشد العفاسي',
      'makkah': 'مكة المكرمة',
      'madinah': 'المدينة المنورة',
    };
    return labels[key] || key;
  }

  async function scheduleDuhaNotification(sunrise: Date) {
    try {
      await Notifications.requestPermissionsAsync();
      const duhaTime = new Date(sunrise.getTime() + 15 * 60 * 1000);
      const now = new Date();
      if (duhaTime > now) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🌅 وقت صلاة الضحى',
            body: 'صلاة الضحى تجزئ وتعادل 360 صدقه',
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: duhaTime,
            channelId: 'prayer-alerts',
          } as any,
        });
      }
    } catch (e) {}
  }

  async function scheduleWirdNotification() {
    try {
      await Notifications.requestPermissionsAsync();
      const wirdTime = new Date();
      wirdTime.setHours(8, 0, 0, 0);
      const now = new Date();
      if (wirdTime <= now) {
        wirdTime.setDate(wirdTime.getDate() + 1);
      }
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📖 وقت الورد اليومي',
          body: 'لا تنسَ قراءة وردك اليومي من القرآن الكريم',
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: wirdTime,
          channelId: 'prayer-alerts',
        } as any,
      });
    } catch (e) {}
  }

  async function onRefresh() {
    setRefreshing(true);
    await getPrayerTimes();
    setRefreshing(false);
  }

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
      <Text style={[styles.title, { color: themeStyles.accent }]}>🕌 صلاتي</Text>
      <Text style={[styles.date, { color: themeStyles.subText }]}>
        {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </Text>

      {cityName ? <Text style={[styles.city, { color: themeStyles.accent }]}>📍 {cityName}</Text> : null}

      {selectedSheikh !== 'default' && (
        <View style={[styles.adhanBadge, { backgroundColor: themeStyles.card, borderColor: themeStyles.border }]}>
          <Text style={[styles.adhanBadgeText, { color: themeStyles.text }]}>
            🎵 الأذان المختار: {getSheikhLabel(selectedSheikh)} {selectedSheikh === downloadedSheikh ? '✅ (محمل)' : '⚠️ (غير محمل)'}
          </Text>
        </View>
      )}

      <View style={styles.prayersContainer}>
        {times && PRAYERS.map((prayer) => {
          const time = prayer.key === 'duha' 
            ? new Date(times.sunrise.getTime() + 15 * 60 * 1000)
            : times[prayer.key];

          const isNext = nextPrayer === prayer.key;
          const isDuha = prayer.key === 'duha';

          return (
            <View key={prayer.key} style={[
              styles.prayerRow, 
              { backgroundColor: themeStyles.card, borderColor: themeStyles.border },
              isNext && { borderColor: themeStyles.accent, backgroundColor: isDarkMode ? '#1f2e1a' : '#e8f5e9' }, 
              isDuha && { borderColor: themeStyles.accent + '44', borderStyle: 'dashed' }
            ]}>
              <Text style={styles.prayerIcon}>{prayer.icon}</Text>
              <Text style={[styles.prayerName, { color: isNext ? themeStyles.accent : themeStyles.text }, isNext && { fontWeight: 'bold' }]}>{prayer.name}</Text>
              <Text style={[styles.prayerTime, { color: isNext ? themeStyles.accent : themeStyles.subText }, isNext && { fontWeight: 'bold' }]}>
                {time ? formatTime(time) : '--:--'}
              </Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { alignItems: 'center', paddingTop: 60, paddingBottom: 100 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 8 },
  date: { fontSize: 14, marginBottom: 8 },
  city: { fontSize: 14, marginBottom: 20 },
  adhanBadge: { width: '90%', borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 1, alignItems: 'center' },
  adhanBadgeText: { fontSize: 13, fontWeight: 'bold' },
  prayersContainer: { width: '90%' },
  prayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  prayerIcon: { fontSize: 24, marginLeft: 12 },
  prayerName: { flex: 1, fontSize: 18, textAlign: 'right' },
  prayerTime: { fontSize: 16 },
});