import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAudioPlayer } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  I18nManager,
  Image,
  KeyboardAvoidingView, Modal,
  Platform, ScrollView, StyleSheet, Switch, Text, TextInput,
  TouchableOpacity, View
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAppAlert } from '../../hooks/useAppAlert';
import { t, useLanguage } from '../../utils/i18n';
import AppAlert from '../AppAlert';

// FIX RTL: Prevent Android APK from forcing RTL layout
I18nManager.allowRTL(false);
I18nManager.forceRTL(false);

type Theme = 'dark' | 'light';

const DEFAULT_ADHAN: { [key: string]: any } = {
  fajr: require('../../assets/adhan/fajr.mp3'),
  dhuhr: require('../../assets/adhan/dhuhr.mp3'),
  asr: require('../../assets/adhan/asr.mp3'),
  maghrib: require('../../assets/adhan/maghrib.mp3'),
  ishaa: require('../../assets/adhan/ishaa.mp3'),
};

const ADHAN_SHEIKHS = [
  {
    key: 'mishary',
    label: 'مشاري راشد العفاسي',
    prayers: {
      fajr: 'https://download.quranicaudio.com/quran/mishaari_raashid_al-3afaasee/001.mp3',
      dhuhr: 'https://www.islamcan.com/audio/adhan/azan1.mp3',
      asr: 'https://www.islamcan.com/audio/adhan/azan1.mp3',
      maghrib: 'https://www.islamcan.com/audio/adhan/azan1.mp3',
      ishaa: 'https://www.islamcan.com/audio/adhan/azan1.mp3',
    }
  },
  {
    key: 'makkah',
    label: 'أذان مكة المكرمة',
    prayers: {
      fajr: 'https://www.islamcan.com/audio/adhan/azan2.mp3',
      dhuhr: 'https://www.islamcan.com/audio/adhan/azan2.mp3',
      asr: 'https://www.islamcan.com/audio/adhan/azan2.mp3',
      maghrib: 'https://www.islamcan.com/audio/adhan/azan2.mp3',
      ishaa: 'https://www.islamcan.com/audio/adhan/azan2.mp3',
    }
  },
  {
    key: 'madinah',
    label: 'أذان المدينة المنورة',
    prayers: {
      fajr: 'https://www.islamcan.com/audio/adhan/azan3.mp3',
      dhuhr: 'https://www.islamcan.com/audio/adhan/azan3.mp3',
      asr: 'https://www.islamcan.com/audio/adhan/azan3.mp3',
      maghrib: 'https://www.islamcan.com/audio/adhan/azan3.mp3',
      ishaa: 'https://www.islamcan.com/audio/adhan/azan3.mp3',
    }
  },
];

const PRAYERS_LIST = [
  { key: 'fajr', label: 'الفجر', icon: '🌙' },
  { key: 'dhuhr', label: 'الظهر', icon: '☀️' },
  { key: 'asr', label: 'العصر', icon: '🌤️' },
  { key: 'maghrib', label: 'المغرب', icon: '🌇' },
  { key: 'ishaa', label: 'العشاء', icon: '🌃' },
];

const ADHAN_DIR = FileSystem.documentDirectory + 'adhan/';

export default function SettingsScreen() {
  const { theme, toggleTheme, themeStyles, isDarkMode } = useTheme();
  const { lang, setLang } = useLanguage();
  const { visible, message, type, showAlert, hideAlert } = useAppAlert();

  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [tempUsername, setTempUsername] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [selectedSheikh, setSelectedSheikh] = useState('default');
  const [notifyPrayer, setNotifyPrayer] = useState(true);
  const [notifyAthkar, setNotifyAthkar] = useState(true);
  const [notifyWird, setNotifyWird] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadedSheikh, setDownloadedSheikh] = useState<string | null>(null);
  const [downloadingSheikhKey, setDownloadingSheikhKey] = useState<string | null>(null);
  const [playingPrayer, setPlayingPrayer] = useState<string | null>(null);
  const [playingSheikh, setPlayingSheikh] = useState<string | null>(null);
  const [resetConfirmVisible, setResetConfirmVisible] = useState(false);

  // FIX AUDIO: Create player WITHOUT source, use replace() later
  const player = useAudioPlayer();
  const currentPlayingRef = useRef<{ sheikh: string | null; prayer: string | null }>({ sheikh: null, prayer: null });

  useEffect(() => {
    loadSettings();
    checkDownloadedAdhan();
    setupNotifications();
  }, []);

  // FIX NOTIFICATIONS: Setup Android channel + request permissions
  async function setupNotifications() {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('prayer-adhan', {
        name: 'Prayer Adhan',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#c9a84c',
      });
      await Notifications.setNotificationChannelAsync('athkar-reminder', {
        name: 'Athkar Reminders',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
      });
    }
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      console.log('Notification permissions not granted');
    }
  }

  async function loadSettings() {
    try {
      const data = await AsyncStorage.getItem('user_settings');
      if (data) {
        const s = JSON.parse(data);
        setUsername(s.username || '');
        setAvatar(s.avatar || null);
        setSelectedSheikh(s.selectedSheikh || 'default');
        setNotifyPrayer(s.notifyPrayer ?? true);
        setNotifyAthkar(s.notifyAthkar ?? true);
        setNotifyWird(s.notifyWird ?? true);
      }
    } catch (e) {}
  }

  async function saveSettings(updates: any) {
    try {
      const current = await AsyncStorage.getItem('user_settings');
      const settings = current ? JSON.parse(current) : {};
      await AsyncStorage.setItem('user_settings', JSON.stringify({ ...settings, ...updates }));
    } catch (e) {}
  }

  async function checkDownloadedAdhan() {
    try {
      const saved = await AsyncStorage.getItem('downloaded_adhan_sheikh');
      if (saved) setDownloadedSheikh(saved);
    } catch (e) {}
  }

  async function downloadAdhan(sheikhKey: string) {
    setDownloading(true);
    setDownloadingSheikhKey(sheikhKey);
    setDownloadProgress(0);
    try {
      await FileSystem.makeDirectoryAsync(ADHAN_DIR + sheikhKey + '/', { intermediates: true });
      const sheikh = ADHAN_SHEIKHS.find(s => s.key === sheikhKey)!;

      let i = 0;
      for (const [prayer, url] of Object.entries(sheikh.prayers)) {
        const localPath = ADHAN_DIR + sheikhKey + '/' + prayer + '.mp3';
        const info = await FileSystem.getInfoAsync(localPath);
        if (!info.exists) {
          await FileSystem.downloadAsync(url, localPath);
        }
        i++;
        setDownloadProgress(Math.round((i / 5) * 100));
      }

      await AsyncStorage.setItem('downloaded_adhan_sheikh', sheikhKey);
      setDownloadedSheikh(sheikhKey);
      setSelectedSheikh(sheikhKey);
      await saveSettings({ selectedSheikh: sheikhKey });
      showAlert(t('offlineReady'), 'success');
    } catch (e) {
      showAlert(t('downloadError'), 'error');
    }
    setDownloading(false);
    setDownloadingSheikhKey(null);
  }

  // FIX AUDIO: Use replace() instead of re-creating player
  async function handlePlayAdhan(sheikhKey: string | 'default', prayerKey: string) {
    try {
      const currentlyPlaying = currentPlayingRef.current;

      // If same button clicked, pause
      if (currentlyPlaying.sheikh === sheikhKey && currentlyPlaying.prayer === prayerKey) {
        await player.pause();
        currentPlayingRef.current = { sheikh: null, prayer: null };
        setPlayingPrayer(null);
        setPlayingSheikh(null);
        return;
      }

      let source: any;

      if (sheikhKey === 'default') {
        source = DEFAULT_ADHAN[prayerKey];
      } else {
        const localPath = ADHAN_DIR + sheikhKey + '/' + prayerKey + '.mp3';
        const info = await FileSystem.getInfoAsync(localPath);
        if (info.exists) {
          source = { uri: localPath };
        } else {
          const sheikh = ADHAN_SHEIKHS.find(s => s.key === sheikhKey);
          const onlineUrl = sheikh?.prayers[prayerKey as keyof typeof sheikh.prayers];
          if (onlineUrl) {
            source = { uri: onlineUrl };
          }
        }
      }

      if (!source) {
        showAlert(t('playError'), 'error');
        return;
      }

      // Pause current first
      await player.pause();

      // Replace source and play
      await player.replace(source);
      await player.play();

      currentPlayingRef.current = { sheikh: sheikhKey, prayer: prayerKey };
      setPlayingPrayer(prayerKey);
      setPlayingSheikh(sheikhKey);
    } catch (e) {
      console.error('Audio play error:', e);
      showAlert(t('playError'), 'error');
    }
  }

  async function closeAdhanModal() {
    try {
      await player.pause();
    } catch (e) {}
    currentPlayingRef.current = { sheikh: null, prayer: null };
    setPlayingPrayer(null);
    setPlayingSheikh(null);
    setActiveModal(null);
  }

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (!result.canceled) {
      setAvatar(result.assets[0].uri);
      await saveSettings({ avatar: result.assets[0].uri });
    }
  }

  async function resetAll() {
    setResetConfirmVisible(false);
    try {
      await AsyncStorage.removeItem('quran_progress');
      await AsyncStorage.removeItem('quran_stats');
      await AsyncStorage.removeItem('quran_fully_cached');
      await AsyncStorage.removeItem('quran_time_history');
      await AsyncStorage.removeItem('cycle_start');

      const keys = await AsyncStorage.getAllKeys();
      const keysToRemove = keys.filter(k => k.startsWith('day_') || k.startsWith('stats_') || k.startsWith('quran_'));
      await AsyncStorage.multiRemove(keysToRemove);

      await AsyncStorage.clear();

      const adhanDir = FileSystem.documentDirectory + 'adhan/';
      const quranDir = FileSystem.documentDirectory + 'quran_pages/';
      try { await FileSystem.deleteAsync(adhanDir, { idempotent: true }); } catch (e) {}
      try { await FileSystem.deleteAsync(quranDir, { idempotent: true }); } catch (e) {}

      await Notifications.cancelAllScheduledNotificationsAsync();

      await toggleTheme('dark');
      await setLang('ar');
      setUsername('');
      setAvatar(null);
      setSelectedSheikh('default');
      setDownloadedSheikh(null);
      setNotifyPrayer(true);
      setNotifyAthkar(true);
      setNotifyWird(true);

      showAlert(t('resetSuccess'), 'success');
    } catch (e) {
      showAlert(t('resetError'), 'error');
    }
  }

  async function handleToggleNotify(key: 'Prayer' | 'Athkar' | 'Wird', value: boolean) {
    const newValue = !value;
    const setter = key === 'Prayer' ? setNotifyPrayer : key === 'Athkar' ? setNotifyAthkar : setNotifyWird;
    setter(newValue);
    await saveSettings({ [`notify${key}`]: newValue });
    if (!newValue) {
      await Notifications.cancelAllScheduledNotificationsAsync();
    }
  }

  async function handleSelectSheikh(sheikhKey: string) {
    setSelectedSheikh(sheikhKey);
    await saveSettings({ selectedSheikh: sheikhKey });
  }

  const SETTINGS = [
    { key: 'profile', icon: '👤', title: t('profile'), subtitle: username || 'اضغط لتعديل اسمك وصورتك', color: '#c9a84c' },
    { key: 'theme', icon: isDarkMode ? '🌙' : '☀️', title: t('theme'), subtitle: isDarkMode ? t('darkMode') : t('lightMode'), color: '#7c6cd4' },
    { key: 'adhan', icon: '🕌', title: t('adhan'), subtitle: selectedSheikh === 'default' ? 'الأذان الافتراضي' : ADHAN_SHEIKHS.find(s => s.key === selectedSheikh)?.label || 'الافتراضي', color: '#4caf50' },
    { key: 'notifications', icon: '🔔', title: t('notifications'), subtitle: 'تحكم في تنبيهات الصلاة والأذكار', color: '#ff9800' },
    { key: 'language', icon: '🌍', title: t('language'), subtitle: lang === 'ar' ? t('arabic') : t('english'), color: '#2196f3' },
    { key: 'reset', icon: '🗑️', title: t('reset'), subtitle: 'مسح كل البيانات والإحصائيات', color: '#ff4444' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: themeStyles.bg }]}>
      <AppAlert visible={visible} message={message} type={type} onClose={hideAlert} />

      <View style={[styles.fixedHeader, { backgroundColor: themeStyles.bg }]}>
        <Text style={styles.pageTitle}>⚙️ {t('settings')}</Text>
        <View style={styles.profileHeader}>
          <TouchableOpacity onPress={pickImage}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatarImg} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: themeStyles.card }]}>
                <Text style={styles.avatarPlaceholderText}>{username ? username[0].toUpperCase() : '👤'}</Text>
              </View>
            )}
            <View style={styles.editBadge}><Text style={styles.editBadgeText}>✏️</Text></View>
          </TouchableOpacity>
          <Text style={styles.profileName}>{username || 'اضغط لتعديل اسمك'}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <View style={styles.settingsList}>
          {SETTINGS.map((setting) => (
            <TouchableOpacity
              key={setting.key}
              style={[styles.settingCard, { backgroundColor: themeStyles.card, borderColor: themeStyles.border }]}
              onPress={() => {
                if (setting.key === 'reset') setResetConfirmVisible(true);
                else { setActiveModal(setting.key); if (setting.key === 'profile') setTempUsername(username); }
              }}
            >
              <View style={[styles.settingIcon, { backgroundColor: setting.color + '22' }]}>
                <Text style={styles.settingIconText}>{setting.icon}</Text>
              </View>
              <View style={styles.settingInfo}>
                <Text style={[styles.settingTitle, { color: themeStyles.text }]}>{setting.title}</Text>
                <Text style={[styles.settingSubtitle, { color: themeStyles.subText }]}>{setting.subtitle}</Text>
              </View>
              <Text style={[styles.settingArrow, { color: themeStyles.subText }]}>←</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Modal البروفايل */}
      <Modal visible={activeModal === 'profile'} transparent animationType="slide">
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: themeStyles.card }]}>
            <Text style={styles.modalTitle}>👤 {t('profile')}</Text>
            <TouchableOpacity style={styles.avatarPickerBtn} onPress={pickImage}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.modalAvatar} />
              ) : (
                <View style={[styles.modalAvatarPlaceholder, { backgroundColor: themeStyles.inputBg, borderColor: themeStyles.border }]}>
                  <Text style={{ fontSize: 40 }}>📷</Text>
                </View>
              )}
              <Text style={styles.avatarPickerText}>اضغط لاختيار صورة</Text>
            </TouchableOpacity>
            <Text style={[styles.modalLabel, { color: themeStyles.subText }]}>الاسم</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: themeStyles.inputBg, borderColor: themeStyles.border, color: themeStyles.text }]}
              value={tempUsername}
              onChangeText={setTempUsername}
              placeholder="اكتب اسمك هنا"
              placeholderTextColor={isDarkMode ? '#555' : '#888'}
              textAlign="right"
            />
            {/* FIX: Equal height buttons */}
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={async () => { setUsername(tempUsername); await saveSettings({ username: tempUsername }); setActiveModal(null); }}
              >
                <Text style={styles.modalSaveBtnText}>💾 {t('save')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalCancelBtn, { backgroundColor: themeStyles.inputBg, borderColor: themeStyles.border }]} 
                onPress={() => setActiveModal(null)}
              >
                <Text style={[styles.modalCancelBtnText, { color: themeStyles.subText }]}>{t('cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal المظهر */}
      <Modal visible={activeModal === 'theme'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: themeStyles.card }]}>
            <Text style={styles.modalTitle}>🎨 {t('theme')}</Text>
            {[
              { key: 'dark', label: t('darkMode') },
              { key: 'light', label: t('lightMode') },
            ].map((tItem) => (
              <TouchableOpacity
                key={tItem.key}
                style={[
                  styles.optionRow,
                  { backgroundColor: themeStyles.inputBg, borderColor: themeStyles.border },
                  theme === tItem.key && { borderColor: themeStyles.accent, backgroundColor: isDarkMode ? '#2e2a1a' : '#fff8e1' }
                ]}
                onPress={async () => {
                  await toggleTheme(tItem.key as Theme);
                  setActiveModal(null);
                }}
              >
                <Text style={[styles.optionLabel, { color: themeStyles.text }]}>{tItem.label}</Text>
                {theme === tItem.key ? (
                  <View style={[styles.radioSelected, { borderColor: themeStyles.accent }]}>
                    <View style={[styles.radioInner, { backgroundColor: themeStyles.accent }]} />
                  </View>
                ) : (
                  <View style={[styles.radioUnselected, { borderColor: themeStyles.border }]} />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.modalCloseBtn, { backgroundColor: themeStyles.accent }]}
              onPress={() => setActiveModal(null)}
            >
              <Text style={[styles.modalCloseBtnText, { color: isDarkMode ? '#0f1923' : '#ffffff' }]}>{t('close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal الأذان */}
      <Modal visible={activeModal === 'adhan'} transparent animationType="slide" onRequestClose={closeAdhanModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: themeStyles.card, maxHeight: '85%' }]}>
            <Text style={styles.modalTitle}>🕌 {t('adhan')}</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ marginBottom: 10 }}>
              <TouchableOpacity 
                style={[
                  styles.sheikhCard, 
                  { backgroundColor: themeStyles.inputBg, borderColor: selectedSheikh === 'default' ? themeStyles.accent : themeStyles.border },
                  selectedSheikh === 'default' && { backgroundColor: isDarkMode ? '#2e2a1a' : '#fff8e1' }
                ]}
                onPress={() => handleSelectSheikh('default')}
                activeOpacity={0.8}
              >
                <View style={styles.sheikhHeader}>
                  <Text style={[styles.sheikhName, { color: themeStyles.text }]}>🎵 الأذان الافتراضي</Text>
                  {selectedSheikh === 'default' && (
                    <View style={[styles.selectedBadge, { backgroundColor: themeStyles.accent + '22' }]}>
                      <Text style={[styles.selectedBadgeText, { color: themeStyles.accent }]}>✓ المختار</Text>
                    </View>
                  )}
                </View>
                <View style={styles.prayerBtns}>
                  {PRAYERS_LIST.map((prayer) => {
                    const isCurrentPlaying = playingPrayer === prayer.key && playingSheikh === 'default';
                    return (
                      <TouchableOpacity
                        key={prayer.key}
                        style={[styles.prayerPlayBtn, { backgroundColor: themeStyles.card, borderColor: themeStyles.border }, isCurrentPlaying && { borderColor: themeStyles.accent, backgroundColor: isDarkMode ? '#2e2a1a' : '#fff8e1' }]}
                        onPress={() => handlePlayAdhan('default', prayer.key)}
                      >
                        <Text style={styles.prayerPlayIcon}>{isCurrentPlaying ? '⏸' : '▶️'}</Text>
                        <Text style={[styles.prayerPlayLabel, { color: themeStyles.text }]}>{prayer.icon} {prayer.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </TouchableOpacity>

              {ADHAN_SHEIKHS.map((sheikh) => (
                <TouchableOpacity
                  key={sheikh.key}
                  style={[
                    styles.sheikhCard, 
                    { backgroundColor: themeStyles.inputBg, borderColor: selectedSheikh === sheikh.key ? themeStyles.accent : themeStyles.border },
                    selectedSheikh === sheikh.key && { backgroundColor: isDarkMode ? '#2e2a1a' : '#fff8e1' }
                  ]}
                  onPress={() => handleSelectSheikh(sheikh.key)}
                  activeOpacity={0.8}
                >
                  <View style={styles.sheikhHeader}>
                    <Text style={[styles.sheikhName, { color: themeStyles.text }]}>{sheikh.label}</Text>
                    {selectedSheikh === sheikh.key && (
                      <View style={[styles.selectedBadge, { backgroundColor: themeStyles.accent + '22' }]}>
                        <Text style={[styles.selectedBadgeText, { color: themeStyles.accent }]}>✓ المختار</Text>
                      </View>
                    )}
                    {downloadedSheikh === sheikh.key && selectedSheikh !== sheikh.key && (
                      <Text style={[styles.downloadedBadge, { color: '#4caf50' }]}>✅ محمل</Text>
                    )}
                  </View>

                  <View style={styles.prayerBtns}>
                    {PRAYERS_LIST.map((prayer) => {
                      const isCurrentPlaying = playingPrayer === prayer.key && playingSheikh === sheikh.key;
                      return (
                        <TouchableOpacity
                          key={prayer.key}
                          style={[styles.prayerPlayBtn, { backgroundColor: themeStyles.card, borderColor: themeStyles.border }, isCurrentPlaying && { borderColor: themeStyles.accent, backgroundColor: isDarkMode ? '#2e2a1a' : '#fff8e1' }]}
                          onPress={() => handlePlayAdhan(sheikh.key, prayer.key)}
                        >
                          <Text style={styles.prayerPlayIcon}>{isCurrentPlaying ? '⏸' : '▶️'}</Text>
                          <Text style={[styles.prayerPlayLabel, { color: themeStyles.text }]}>{prayer.icon} {prayer.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {downloading && downloadingSheikhKey === sheikh.key ? (
                    <View style={styles.downloadingContainer}>
                      <ActivityIndicator color={themeStyles.accent} />
                      <Text style={[styles.downloadingText, { color: themeStyles.accent }]}>{downloadProgress}%</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.downloadBtn, { backgroundColor: themeStyles.card, borderColor: themeStyles.accent }, downloadedSheikh === sheikh.key && { borderColor: '#4caf50' }]}
                      onPress={() => downloadAdhan(sheikh.key)}
                    >
                      <Text style={[styles.downloadBtnText, { color: themeStyles.text }]}>
                        {downloadedSheikh === sheikh.key ? '🔄 إعادة تحميل الملفات' : '⬇️ تحميل للاستخدام بدون نت'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalCloseBtn, { backgroundColor: themeStyles.accent }]}
              onPress={closeAdhanModal}
            >
              <Text style={[styles.modalCloseBtnText, { color: isDarkMode ? '#0f1923' : '#ffffff' }]}>{t('close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal التنبيهات - FIXED Toggle with native Switch */}
      <Modal visible={activeModal === 'notifications'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: themeStyles.card }]}>
            <Text style={styles.modalTitle}>🔔 {t('notifications')}</Text>
            {[
              { key: 'Prayer', label: t('notifyPrayer'), value: notifyPrayer },
              { key: 'Athkar', label: t('notifyAthkar'), value: notifyAthkar },
              { key: 'Wird', label: t('notifyWird'), value: notifyWird },
            ].map((item) => (
              <View
                key={item.key}
                style={[styles.toggleRow, { backgroundColor: themeStyles.inputBg, borderColor: themeStyles.border }]}
              >
                <Text style={[styles.toggleLabel, { color: themeStyles.text }]}>{item.label}</Text>
                <Switch
                  value={item.value}
                  onValueChange={() => handleToggleNotify(item.key as any, item.value)}
                  trackColor={{ false: themeStyles.border, true: themeStyles.accent + '88' }}
                  thumbColor={item.value ? themeStyles.accent : '#f4f3f4'}
                  ios_backgroundColor={themeStyles.border}
                />
              </View>
            ))}
            <TouchableOpacity 
              style={[styles.modalCloseBtn, { backgroundColor: themeStyles.accent, marginTop: 10 }]} 
              onPress={() => setActiveModal(null)}
            >
              <Text style={[styles.modalCloseBtnText, { color: isDarkMode ? '#0f1923' : '#ffffff' }]}>{t('close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal اللغة */}
      <Modal visible={activeModal === 'language'} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: themeStyles.card }]}>
            <Text style={styles.modalTitle}>🌍 {t('language')}</Text>
            {[
              { key: 'ar', label: `🇸🇦 ${t('arabic')}` },
              { key: 'en', label: `🇬🇧 ${t('english')}` },
            ].map((l) => (
              <TouchableOpacity
                key={l.key}
                style={[
                  styles.optionRow,
                  { backgroundColor: themeStyles.inputBg, borderColor: themeStyles.border },
                  lang === l.key && { borderColor: themeStyles.accent, backgroundColor: isDarkMode ? '#2e2a1a' : '#fff8e1' }
                ]}
                onPress={async () => {
                  await setLang(l.key as 'ar' | 'en');
                  setActiveModal(null);
                }}
              >
                <Text style={[styles.optionLabel, { color: themeStyles.text }]}>{l.label}</Text>
                {lang === l.key ? (
                  <View style={[styles.radioSelected, { borderColor: themeStyles.accent }]}>
                    <View style={[styles.radioInner, { backgroundColor: themeStyles.accent }]} />
                  </View>
                ) : (
                  <View style={[styles.radioUnselected, { borderColor: themeStyles.border }]} />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.modalCloseBtn, { backgroundColor: themeStyles.accent }]} onPress={() => setActiveModal(null)}>
              <Text style={[styles.modalCloseBtnText, { color: isDarkMode ? '#0f1923' : '#ffffff' }]}>{t('close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal تأكيد مسح البيانات */}
      <Modal visible={resetConfirmVisible} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={[styles.resetConfirmCard, { backgroundColor: themeStyles.accent }]}>
            <Text style={[styles.resetConfirmTitle, { color: isDarkMode ? '#0f1923' : '#ffffff' }]}>⚠️ {t('reset')}</Text>
            <Text style={[styles.resetConfirmMessage, { color: isDarkMode ? '#0f1923' : '#ffffff' }]}>
              {t('resetConfirm')}
            </Text>
            <View style={styles.resetConfirmBtns}>
              <TouchableOpacity 
                style={[styles.resetConfirmBtn, { backgroundColor: '#d32f2f' }]} 
                onPress={resetAll}
              >
                <Text style={styles.resetConfirmBtnText}>✓ {t('confirm')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.resetConfirmBtn, { backgroundColor: '#4caf50' }]} 
                onPress={() => setResetConfirmVisible(false)}
              >
                <Text style={styles.resetConfirmBtnText}>✕ {t('cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  fixedHeader: { alignItems: 'center', paddingTop: 60, paddingBottom: 10, zIndex: 10 },
  scrollContainer: { flex: 1, width: '100%' },
  scrollContent: { alignItems: 'center', paddingTop: 10, paddingBottom: 130 },
  pageTitle: { fontSize: 26, color: '#c9a84c', fontWeight: 'bold', marginBottom: 24 },
  profileHeader: { alignItems: 'center', marginBottom: 15 },
  avatarImg: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: '#c9a84c' },
  avatarPlaceholder: { width: 90, height: 90, borderRadius: 45, borderWidth: 3, borderColor: '#c9a84c', alignItems: 'center', justifyContent: 'center' },
  avatarPlaceholderText: { fontSize: 36, color: '#c9a84c' },
  editBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#c9a84c', borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  editBadgeText: { fontSize: 12 },
  profileName: { color: '#c9a84c', fontSize: 18, fontWeight: 'bold', marginTop: 10 },
  settingsList: { width: '90%', gap: 10 },
  settingCard: { flexDirection: 'row-reverse', alignItems: 'center', borderRadius: 14, padding: 16, borderWidth: 1 },
  settingIcon: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  settingIconText: { fontSize: 22 },
  settingInfo: { flex: 1, alignItems: 'flex-end' },
  settingTitle: { fontSize: 15, fontWeight: 'bold', textAlign: 'right' },
  settingSubtitle: { fontSize: 12, textAlign: 'right', marginTop: 2 },
  settingArrow: { fontSize: 16, marginLeft: 4 },
  modalOverlay: { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 30 },
  modalTitle: { color: '#c9a84c', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  modalLabel: { fontSize: 13, textAlign: 'right', marginBottom: 8 },
  modalInput: { borderRadius: 10, padding: 12, fontSize: 16, borderWidth: 1, marginBottom: 16 },
  // FIX: Equal height and aligned buttons
  modalBtns: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  modalSaveBtn: { 
    flex: 1, 
    backgroundColor: '#c9a84c', 
    borderRadius: 10, 
    paddingVertical: 14, 
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSaveBtnText: { color: '#0f1923', fontWeight: 'bold', fontSize: 15 },
  modalCancelBtn: { 
    flex: 1, 
    borderRadius: 10, 
    paddingVertical: 14, 
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 1,
  },
  modalCancelBtnText: { fontSize: 15, fontWeight: 'bold' },
  modalCloseBtn: { borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 5, elevation: 2, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84 },
  modalCloseBtnText: { fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  optionRow: { flexDirection: 'row-reverse', alignItems: 'center', borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1 },
  optionLabel: { flex: 1, fontSize: 15, textAlign: 'right' },
  radioSelected: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  radioUnselected: { width: 22, height: 22, borderRadius: 11, borderWidth: 2 },
  // FIX: Better toggle row layout using native Switch
  toggleRow: { 
    flexDirection: 'row-reverse', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    borderRadius: 10, 
    padding: 14, 
    marginBottom: 8, 
    borderWidth: 1,
  },
  toggleLabel: { fontSize: 15, fontWeight: '600' },
  avatarPickerBtn: { alignItems: 'center', marginBottom: 16 },
  modalAvatar: { width: 80, height: 80, borderRadius: 40, marginBottom: 8 },
  modalAvatarPlaceholder: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 8, borderWidth: 1 },
  avatarPickerText: { color: '#c9a84c', fontSize: 13 },
  sheikhCard: { borderRadius: 12, padding: 14, marginBottom: 12, borderWidth: 1 },
  sheikhHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sheikhName: { fontSize: 15, fontWeight: 'bold' },
  selectedBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  selectedBadgeText: { fontSize: 12, fontWeight: 'bold' },
  downloadedBadge: { fontSize: 12 },
  prayerBtns: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  prayerPlayBtn: { flexDirection: 'row-reverse', alignItems: 'center', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, gap: 4 },
  prayerPlayIcon: { fontSize: 12 },
  prayerPlayLabel: { fontSize: 11 },
  downloadBtn: { borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1 },
  downloadBtnText: { fontSize: 13, fontWeight: 'bold' },
  downloadingContainer: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 10 },
  downloadingText: { fontSize: 14 },
  alertOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  resetConfirmCard: { width: '85%', borderRadius: 16, padding: 24, alignItems: 'center' },
  resetConfirmTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  resetConfirmMessage: { fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  resetConfirmBtns: { flexDirection: 'row-reverse', gap: 12 },
  resetConfirmBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, minWidth: 100, alignItems: 'center' },
  resetConfirmBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
});