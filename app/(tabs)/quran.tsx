import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useAppAlert } from '../../hooks/useAppAlert';
import AppAlert from '../AppAlert';

const surahsInfo = require('quran-json/dist/chapters/index.json');

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ReadingMode = 'wird' | 'khatma' | 'free' | null;
type WirdUnit = 'rub' | 'half' | 'hizb' | 'juz';
type IndexTab = 'surah' | 'juz' | 'hizb' | 'page';

const WIRD_UNITS = [
  { key: 'rub', label: 'ربع حزب', pagesPerDay: 5, days: 120 },
  { key: 'half', label: 'نصف حزب', pagesPerDay: 10, days: 60 },
  { key: 'hizb', label: 'حزب كامل', pagesPerDay: 20, days: 30 },
  { key: 'juz', label: 'جزء كامل', pagesPerDay: 20, days: 30 },
];

const KHATMA_OPTIONS = [1, 2, 3, 4];
const JUZZES = Array.from({ length: 30 }, (_, i) => ({ number: i + 1, name: `الجزء ${i + 1}` }));
const HIZBS = Array.from({ length: 60 }, (_, i) => ({ number: i + 1, name: `الحزب ${i + 1}` }));
const PAGES_LIST = Array.from({ length: 604 }, (_, i) => i + 1);
const PAGES = Array.from({ length: 604 }, (_, i) => ({ number: i + 1 }));

const SURAH_PAGES: { [key: number]: number } = {
  1: 1, 2: 2, 3: 50, 4: 77, 5: 106, 6: 128, 7: 151, 8: 177, 9: 187,
  10: 208, 11: 221, 12: 235, 13: 249, 14: 255, 15: 262, 16: 267, 17: 282,
  18: 293, 19: 305, 20: 312, 21: 322, 22: 332, 23: 342, 24: 350, 25: 359,
  26: 367, 27: 377, 28: 385, 29: 396, 30: 404, 31: 411, 32: 415, 33: 418,
  34: 428, 35: 434, 36: 440, 37: 446, 38: 453, 39: 458, 40: 467, 41: 477,
  42: 483, 43: 489, 44: 496, 45: 499, 46: 502, 47: 507, 48: 511, 49: 515,
  50: 518, 51: 520, 52: 523, 53: 526, 54: 528, 55: 531, 56: 534, 57: 537,
  58: 542, 59: 545, 60: 549, 61: 551, 62: 553, 63: 554, 64: 556, 65: 558,
  66: 560, 67: 562, 68: 564, 69: 566, 70: 568, 71: 570, 72: 572, 73: 574,
  74: 575, 75: 577, 76: 578, 77: 580, 78: 582, 79: 583, 80: 585, 81: 586,
  82: 587, 83: 587, 84: 589, 85: 590, 86: 591, 87: 591, 88: 592, 89: 593,
  90: 594, 91: 595, 92: 595, 93: 596, 94: 596, 95: 597, 96: 597, 97: 598,
  98: 598, 99: 599, 100: 599, 101: 600, 102: 600, 103: 601, 104: 601,
  105: 601, 106: 602, 107: 602, 108: 602, 109: 603, 110: 603, 111: 603,
  112: 604, 113: 604, 114: 604,
};

const JUZ_PAGES: { [key: number]: number } = {
  1: 1, 2: 22, 3: 42, 4: 62, 5: 82, 6: 102, 7: 121, 8: 142, 9: 162,
  10: 182, 11: 201, 12: 221, 13: 241, 14: 261, 15: 281, 16: 301, 17: 321,
  18: 341, 19: 361, 20: 381, 21: 401, 22: 421, 23: 441, 24: 461, 25: 481,
  26: 501, 27: 521, 28: 541, 29: 561, 30: 581,
};

function getCurrentSurahName(page: number): string {
  let currentSurahId = 1;
  for (const surahId in SURAH_PAGES) {
    if (page >= SURAH_PAGES[surahId]) {
      currentSurahId = parseInt(surahId);
    } else {
      break;
    }
  }
  const surah = surahsInfo.find((s: any) => s.id === currentSurahId);
  return surah ? surah.name : '';
}

export default function QuranScreen() {
  const { themeStyles, isDarkMode } = useTheme();
  const [screen, setScreen] = useState<'setup' | 'index' | 'read'>('setup');
  const [mode, setMode] = useState<ReadingMode>(null);
  const [wirdUnit, setWirdUnit] = useState<WirdUnit | null>(null);
  const [khatmaCount, setKhatmaCount] = useState<number | null>(null);
  const [progress, setProgress] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [indexTab, setIndexTab] = useState<IndexTab>('surah');
  const [isDownloaded, setIsDownloaded] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const { visible, message, type, showAlert, hideAlert } = useAppAlert();

  const flatListRef = useRef<FlatList>(null);
  const docDir = (FileSystem as any).documentDirectory || '';

  useEffect(() => { 
    loadProgress(); 
    checkDownloadStatus();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProgress();
      checkDownloadStatus();
    }, [])
  );

  // FIX: Scroll to correct page when entering read screen - use natural order (no reverse)
  useEffect(() => {
    if (screen === 'read' && flatListRef.current) {
      const index = currentPage - 1; // Natural order: page 1 = index 0
      const timer = setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index, animated: false });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [screen, currentPage]);

  async function checkDownloadStatus() {
    try {
      const status = await AsyncStorage.getItem('quran_fully_cached');
      if (status === 'true') setIsDownloaded(true);
    } catch (e) {}
  }

  async function downloadQuranFiles() {
    if (isDownloading) return;
    setIsDownloading(true);
    setDownloadProgress(0);

    const folderUri = `${docDir}quran_pages/`;

    try {
      const dirInfo = await FileSystem.getInfoAsync(folderUri);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(folderUri, { intermediates: true });
      }

      for (let i = 1; i <= 604; i++) {
        const fileUri = `${folderUri}${i}.png`;
        const fileInfo = await FileSystem.getInfoAsync(fileUri);

        if (!fileInfo.exists) {
          const remoteUrl = `https://www.searchtruth.com/quran/images/images10/${i}.png`;
          await FileSystem.downloadAsync(remoteUrl, fileUri, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
          });
        }
        setDownloadProgress(Math.round((i / 604) * 100));
      }

      await AsyncStorage.setItem('quran_fully_cached', 'true');
      setIsDownloaded(true);
      showAlert('تم حفظ جميع صفحات المصحف بنجاح!', 'success');
    } catch (error) {
      showAlert('حدثت مشكلة أثناء تحميل الصفحات.', 'error');
    } finally {
      setIsDownloading(false);
    }
  }

  async function loadProgress() {
    try {
      const data = await AsyncStorage.getItem('quran_progress');
      if (data) {
        const parsed = JSON.parse(data);
        setProgress(parsed);
        setMode(parsed.mode);
        const savedPage = parsed.currentPage || 1;
        setCurrentPage(savedPage);
        setScreen('index');
      }
    } catch (e) {}
  }

  async function startReading() {
    if (!mode) return;
    let pagesPerDay = 0;
    let wirdLabel = '';

    if (mode === 'wird' && wirdUnit) {
      const unit = WIRD_UNITS.find(u => u.key === wirdUnit)!;
      pagesPerDay = unit.pagesPerDay;
      wirdLabel = unit.label;
    } else if (mode === 'khatma' && khatmaCount) {
      pagesPerDay = Math.ceil((khatmaCount * 604) / 30);
      wirdLabel = `${khatmaCount} ختمة في الشهر`;
    } else if (mode === 'free') {
      wirdLabel = 'قراءة حرة';
      pagesPerDay = 0;
    }

    const newProgress = {
      mode, wirdUnit, khatmaCount, wirdLabel, pagesPerDay,
      currentPage: 1, currentSurah: 1,
      startDate: Date.now(), 
      completedCycles: 0,
    };

    await AsyncStorage.setItem('quran_progress', JSON.stringify(newProgress));
    await AsyncStorage.setItem('quran_stats', JSON.stringify({
      mode, wirdLabel, pagesPerDay, completedCycles: 0, currentPage: 1, currentSurah: 1,
      startDate: newProgress.startDate
    }));
    setProgress(newProgress);
    setCurrentPage(1);
    setScreen('index');
  }

  async function savePosition(page: number) {
    if (!progress) return;
    const updated = { ...progress, currentPage: page };
    await AsyncStorage.setItem('quran_progress', JSON.stringify(updated));
    await AsyncStorage.setItem('quran_stats', JSON.stringify({
      mode: updated.mode, wirdLabel: updated.wirdLabel,
      pagesPerDay: updated.pagesPerDay,
      completedCycles: updated.completedCycles,
      currentPage: page, currentSurah: updated.currentSurah,
      startDate: updated.startDate
    }));
    setProgress(updated);
  }

  async function resetProgress() {
    await AsyncStorage.removeItem('quran_progress');
    await AsyncStorage.removeItem('quran_stats');
    setProgress(null);
    setMode(null);
    setWirdUnit(null);
    setKhatmaCount(null);
    setCurrentPage(1);
    setScreen('setup');
  }

  // FIX: Natural page order - no reverse math
  const onMomentumScrollEnd = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    const page = index + 1; // Natural order: index 0 = page 1
    if (page >= 1 && page <= 604 && page !== currentPage) {
      setCurrentPage(page);
      savePosition(page);
    }
  };

  const getPageSource = (pageNum: number) => {
    if (isDownloaded) {
      return { uri: `${docDir}quran_pages/${pageNum}.png` };
    }
    return {
      uri: `https://www.searchtruth.com/quran/images/images10/${pageNum}.png`,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    };
  };

  if (screen === 'setup') {
    return (
      <ScrollView style={[styles.container, { backgroundColor: themeStyles.bg }]} contentContainerStyle={[styles.content, { backgroundColor: themeStyles.bg }]}>
        <AppAlert visible={visible} message={message} type={type} onClose={hideAlert} />
        <Text style={[styles.title, { color: themeStyles.accent }]}>📖 المصحف الكريم</Text>
        <Text style={[styles.subtitle, { color: themeStyles.subText }]}>اختر طريقة القراءة</Text>

        <View style={[styles.downloadSection, { backgroundColor: themeStyles.card, borderColor: themeStyles.border }]}>
          {isDownloaded ? (
            <Text style={[styles.downloadSuccessText, { color: '#4caf50' }]}>✅ جميع الصفحات محفوظة ومحملة للعمل بدون إنترنت</Text>
          ) : isDownloading ? (
            <View style={{ alignItems: 'center', paddingVertical: 4 }}>
              <ActivityIndicator size="small" color={themeStyles.accent} />
              <Text style={[styles.downloadProgressText, { color: themeStyles.text }]}>جاري حفظ المصحف محلياً... {downloadProgress}%</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.downloadBtn} onPress={downloadQuranFiles}>
              <Text style={[styles.downloadBtnText, { color: themeStyles.accent }]}>📥 تحميل المصحف بالكامل أوفلاين</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.modeContainer}>
          {[
            { key: 'wird', label: 'الورد اليومي', icon: '📅', desc: 'ورد منتظم يومياً' },
            { key: 'khatma', label: 'الختمة', icon: '🏆', desc: 'ختمة أو أكثر في الشهر' },
            { key: 'free', label: 'قراءة حرة', icon: '📖', desc: 'بدون ورد أو تتبع' },
          ].map((m) => (
            <TouchableOpacity
              key={m.key}
              style={[styles.modeCard, { backgroundColor: themeStyles.card, borderColor: themeStyles.border }, mode === m.key && { borderColor: themeStyles.accent, backgroundColor: isDarkMode ? '#2e2a1a' : '#fff8e1' }]}
              onPress={() => setMode(m.key as ReadingMode)}
            >
              <Text style={styles.modeIcon}>{m.icon}</Text>
              <Text style={[styles.modeLabel, { color: mode === m.key ? themeStyles.accent : themeStyles.text }, mode === m.key && { fontWeight: 'bold' }]}>{m.label}</Text>
              <Text style={[styles.modeDesc, { color: themeStyles.subText }]}>{m.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {mode === 'wird' && (
          <View style={styles.optionsContainer}>
            <Text style={[styles.optionsTitle, { color: themeStyles.accent }]}>اختر مقدار الورد</Text>
            {WIRD_UNITS.map((unit) => (
              <TouchableOpacity
                key={unit.key}
                style={[styles.optionBtn, { backgroundColor: themeStyles.card, borderColor: themeStyles.border }, wirdUnit === unit.key && { borderColor: themeStyles.accent, backgroundColor: isDarkMode ? '#2e2a1a' : '#fff8e1' }]}
                onPress={() => setWirdUnit(unit.key as WirdUnit)}
              >
                <Text style={[styles.optionLabel, { color: wirdUnit === unit.key ? themeStyles.accent : themeStyles.text }, wirdUnit === unit.key && { fontWeight: 'bold' }]}>
                  {unit.label}
                </Text>
                <Text style={[styles.optionDesc, { color: themeStyles.subText }]}>
                  {unit.pagesPerDay} صفحات يومياً • ختم في {unit.days} يوم
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {mode === 'khatma' && (
          <View style={styles.optionsContainer}>
            <Text style={[styles.optionsTitle, { color: themeStyles.accent }]}>عدد الختمات في الشهر</Text>
            <View style={styles.khatmaRow}>
              {KHATMA_OPTIONS.map((count) => (
                <TouchableOpacity
                  key={count}
                  style={[styles.khatmaBtn, { backgroundColor: themeStyles.card, borderColor: themeStyles.border }, khatmaCount === count && { borderColor: themeStyles.accent, backgroundColor: isDarkMode ? '#2e2a1a' : '#fff8e1' }]}
                  onPress={() => setKhatmaCount(count)}
                >
                  <Text style={[styles.khatmaNum, { color: khatmaCount === count ? themeStyles.accent : themeStyles.text }, khatmaCount === count && { fontWeight: 'bold' }]}>{count}</Text>
                  <Text style={[styles.khatmaLabel, { color: themeStyles.subText }]}>{Math.ceil((count * 604) / 30)} ص/يوم</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {(mode === 'free' || (mode === 'wird' && wirdUnit) || (mode === 'khatma' && khatmaCount)) && (
          <TouchableOpacity style={[styles.startBtn, { backgroundColor: themeStyles.accent }]} onPress={startReading}>
            <Text style={[styles.startBtnText, { color: isDarkMode ? '#0f1923' : '#ffffff' }]}>ابدأ القراءة 📖</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    );
  }

  if (screen === 'index') {
    return (
      <View style={[styles.container, { backgroundColor: themeStyles.bg }]}>
        <AppAlert visible={visible} message={message} type={type} onClose={hideAlert} />
        <View style={[styles.header, { backgroundColor: themeStyles.card, borderBottomColor: themeStyles.border }]}>
          <TouchableOpacity style={[styles.headerResetBtn, { backgroundColor: isDarkMode ? '#d32f2f22' : '#ffebee', borderColor: '#d32f2f' }]} onPress={resetProgress}>
            <Text style={[styles.headerResetText, { color: '#ff5252' }]}>🔄 ضبط</Text>
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: themeStyles.accent }]}>📖 المصحف الكريم</Text>

          {progress ? (
            <TouchableOpacity style={[styles.continueBtn, { backgroundColor: themeStyles.accent }]} onPress={() => setScreen('read')}>
              <Text style={[styles.continueBtnText, { color: isDarkMode ? '#0f1923' : '#ffffff' }]}>متابعة ←</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 60 }} />
          )}
        </View>

        {progress && progress.mode !== 'free' && (
          <View style={[styles.progressContainer, { backgroundColor: themeStyles.card, borderBottomColor: themeStyles.border }]}>
            <Text style={[styles.progressLabel, { color: themeStyles.accent }]}>
              {progress.wirdLabel} • الصفحة {progress.currentPage} من 604
            </Text>
            <View style={[styles.progressBar, { backgroundColor: themeStyles.bg }]}>
              <View style={[styles.progressFill, { width: `${(progress.currentPage / 604) * 100}%`, backgroundColor: themeStyles.accent }]} />
            </View>
            {progress.completedCycles > 0 && (
              <Text style={[styles.progressCycles, { color: '#4caf50' }]}>✨ ختمات: {progress.completedCycles}</Text>
            )}
          </View>
        )}

        <View style={styles.indexTabs}>
          {[
            { key: 'surah', label: 'السور' },
            { key: 'juz', label: 'الأجزاء' },
            { key: 'hizb', label: 'الأحزاب' },
            { key: 'page', label: 'الصفحات' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.indexTab, { backgroundColor: themeStyles.card, borderColor: themeStyles.border }, indexTab === tab.key && { backgroundColor: themeStyles.accent, borderColor: themeStyles.accent }]}
              onPress={() => setIndexTab(tab.key as IndexTab)}
            >
              <Text style={[styles.indexTabText, { color: indexTab === tab.key ? (isDarkMode ? '#0f1923' : '#ffffff') : themeStyles.subText }, indexTab === tab.key && { fontWeight: 'bold' }]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {indexTab === 'surah' && (
          <FlatList
            data={surahsInfo}
            keyExtractor={(item: any) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }: any) => (
              <TouchableOpacity
                style={[
                  styles.surahRow,
                  { backgroundColor: themeStyles.card, borderColor: themeStyles.border },
                  progress?.currentPage === SURAH_PAGES[item.id] && { borderColor: themeStyles.accent, backgroundColor: isDarkMode ? '#2e2a1a' : '#fff8e1' }
                ]}
                onPress={() => {
                  const page = SURAH_PAGES[item.id] || 1;
                  setCurrentPage(page);
                  savePosition(page);
                  setScreen('read');
                }}
              >
                <View style={[styles.surahNum, { backgroundColor: themeStyles.accent + '22' }]}>
                  <Text style={[styles.surahNumText, { color: themeStyles.accent }]}>{item.id}</Text>
                </View>
                <View style={styles.surahInfo}>
                  <Text style={[styles.surahName, { color: themeStyles.text }]}>{item.name}</Text>
                  <Text style={[styles.surahDetails, { color: themeStyles.subText }]}>
                    {item.transliteration} • {item.total_verses} آية • ص {SURAH_PAGES[item.id]}
                  </Text>
                </View>
                <Text style={[styles.surahType, { color: themeStyles.subText }]}>{item.type === 'meccan' ? 'مكية' : 'مدنية'}</Text>
              </TouchableOpacity>
            )}
          />
        )}

        {indexTab === 'juz' && (
          <FlatList
            data={JUZZES}
            keyExtractor={(item) => item.number.toString()}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.juzRow, { backgroundColor: themeStyles.card, borderColor: themeStyles.border }]}
                onPress={() => {
                  const page = JUZ_PAGES[item.number] || 1;
                  setCurrentPage(page);
                  savePosition(page);
                  setScreen('read');
                }}
              >
                <View style={[styles.surahNum, { backgroundColor: themeStyles.accent + '22' }]}>
                  <Text style={[styles.surahNumText, { color: themeStyles.accent }]}>{item.number}</Text>
                </View>
                <View style={styles.surahInfo}>
                  <Text style={[styles.surahName, { color: themeStyles.text }]}>{item.name}</Text>
                  <Text style={[styles.surahDetails, { color: themeStyles.subText }]}>صفحة {JUZ_PAGES[item.number]}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}

        {indexTab === 'hizb' && (
          <FlatList
            data={HIZBS}
            keyExtractor={(item) => item.number.toString()}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.juzRow, { backgroundColor: themeStyles.card, borderColor: themeStyles.border }]}
                onPress={() => {
                  const page = Math.round(((item.number - 1) / 60) * 604) + 1;
                  setCurrentPage(page);
                  savePosition(page);
                  setScreen('read');
                }}
              >
                <View style={[styles.surahNum, { backgroundColor: themeStyles.accent + '22' }]}>
                  <Text style={[styles.surahNumText, { color: themeStyles.accent }]}>{item.number}</Text>
                </View>
                <Text style={[styles.juzLabel, { color: themeStyles.text }]}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        )}

        {indexTab === 'page' && (
          <FlatList
            data={PAGES}
            numColumns={5}
            keyExtractor={(item) => item.number.toString()}
            contentContainerStyle={styles.pagesGrid}
            columnWrapperStyle={{ gap: 8, marginBottom: 8 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.pageBtn,
                  { backgroundColor: themeStyles.card, borderColor: themeStyles.border },
                  progress?.currentPage === item.number && { backgroundColor: themeStyles.accent, borderColor: themeStyles.accent }
                ]}
                onPress={() => {
                  setCurrentPage(item.number);
                  savePosition(item.number);
                  setScreen('read');
                }}
              >
                <Text style={[
                  styles.pageBtnText,
                  { color: progress?.currentPage === item.number ? (isDarkMode ? '#0f1923' : '#ffffff') : themeStyles.subText },
                  progress?.currentPage === item.number && { fontWeight: 'bold' }
                ]}>{item.number}</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeStyles.bg }]}>
      <AppAlert visible={visible} message={message} type={type} onClose={hideAlert} />
      <View style={[styles.headerReading, { backgroundColor: themeStyles.card }]}>
        <TouchableOpacity onPress={() => setScreen('index')} style={[styles.backBtnLarge, { backgroundColor: themeStyles.bg, borderColor: themeStyles.border }]}>
          <Text style={[styles.backTextLarge, { color: themeStyles.accent }]}>📖 الفهرس</Text>
        </TouchableOpacity>

        <View style={[styles.pageInfoContainer, { backgroundColor: themeStyles.bg, borderColor: themeStyles.border }]}>
          <Text style={[styles.pageInfoText, { color: themeStyles.text }]}>
            {getCurrentSurahName(currentPage)} • صفحة {currentPage}
          </Text>
        </View>
      </View>

      <View style={styles.pageContainerFull}>
        <FlatList
          ref={flatListRef}
          data={PAGES_LIST}  // FIX: No reverse! Natural order [1, 2, 3, ..., 604]
          keyExtractor={(item) => item.toString()}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={currentPage - 1}  // FIX: Page 1 = index 0
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          onMomentumScrollEnd={onMomentumScrollEnd}
          renderItem={({ item: pageNum }) => (
            <View style={{ width: SCREEN_WIDTH, height: '90%' }}>
              <Image
                source={getPageSource(pageNum)}
                style={styles.pageImageFull}
                resizeMode="stretch" 
              />
            </View>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { alignItems: 'center', paddingTop: 60, paddingBottom: 100 },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 14, marginBottom: 24 },

  downloadSection: { width: '90%', borderRadius: 12, padding: 12, marginBottom: 20, borderWidth: 1 },
  downloadBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  downloadBtnText: { fontSize: 13, fontWeight: 'bold' },
  downloadSuccessText: { fontSize: 13, fontWeight: 'bold', textAlign: 'center' },
  downloadProgressText: { fontSize: 12, marginTop: 6 },

  modeContainer: { width: '90%', gap: 12, marginBottom: 24 },
  modeCard: {
    borderRadius: 14, padding: 16,
    borderWidth: 1, alignItems: 'center',
  },
  modeIcon: { fontSize: 32, marginBottom: 8 },
  modeLabel: { fontSize: 16, marginBottom: 4 },
  modeDesc: { fontSize: 12 },
  optionsContainer: { width: '90%', marginBottom: 24 },
  optionsTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  optionBtn: {
    borderRadius: 12, padding: 14,
    marginBottom: 8, borderWidth: 1,
  },
  optionLabel: { fontSize: 15, fontWeight: 'bold', textAlign: 'right' },
  optionDesc: { fontSize: 12, textAlign: 'right', marginTop: 4 },
  khatmaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  khatmaBtn: {
    flex: 1, borderRadius: 12, padding: 14,
    alignItems: 'center', borderWidth: 1,
  },
  khatmaNum: { fontSize: 24, fontWeight: 'bold' },
  khatmaLabel: { fontSize: 10, marginTop: 4 },
  startBtn: {
    width: '90%', borderRadius: 14,
    padding: 16, alignItems: 'center',
  },
  startBtnText: { fontSize: 16, fontWeight: 'bold' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 55, paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 16, fontWeight: 'bold' },
  headerResetBtn: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  headerResetText: { fontSize: 11, fontWeight: 'bold' },

  continueBtn: {
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
  },
  continueBtnText: { fontSize: 12, fontWeight: 'bold' },
  progressContainer: {
    padding: 12,
    borderBottomWidth: 1,
  },
  progressLabel: { fontSize: 12, textAlign: 'center', marginBottom: 6 },
  progressBar: { height: 6, borderRadius: 3, marginBottom: 4 },
  progressFill: { height: 6, borderRadius: 3 },
  progressCycles: { fontSize: 11, textAlign: 'center' },
  indexTabs: { flexDirection: 'row', padding: 10, gap: 6 },
  indexTab: {
    flex: 1, paddingVertical: 8, borderRadius: 10,
    alignItems: 'center', borderWidth: 1,
  },
  indexTabText: { fontWeight: 'bold', fontSize: 11 },
  listContent: { paddingHorizontal: 16, paddingBottom: 100 },
  pagesGrid: { paddingHorizontal: 16, paddingBottom: 100 },
  surahRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1,
  },
  surahNum: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center', marginLeft: 10,
  },
  surahNumText: { fontWeight: 'bold', fontSize: 12 },
  surahInfo: { flex: 1 },
  surahName: { fontSize: 16, fontWeight: 'bold', textAlign: 'right' },
  surahDetails: { fontSize: 11, textAlign: 'right', marginTop: 2 },
  surahType: { fontSize: 11 },
  juzRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, padding: 16, marginBottom: 8, borderWidth: 1,
  },
  juzLabel: { flex: 1, fontSize: 16, textAlign: 'right' },
  pageBtn: {
    flex: 1, borderRadius: 8, padding: 10,
    alignItems: 'center', borderWidth: 1,
  },
  pageBtnText: { fontSize: 13 },

  headerReading: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 50, paddingHorizontal: 20, paddingBottom: 15,
  },
  backBtnLarge: { 
    paddingVertical: 10, 
    paddingHorizontal: 18, 
    borderRadius: 8,
    borderWidth: 1,
  },
  backTextLarge: { fontSize: 16, fontWeight: 'bold' },

  pageInfoContainer: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  pageInfoText: {
    fontSize: 14,
    fontWeight: 'bold',
  },

  pageContainerFull: {
    flex: 1, 
    backgroundColor: '#f5e6c8',
  },
  pageImageFull: { width: SCREEN_WIDTH, height: '95%' },
});