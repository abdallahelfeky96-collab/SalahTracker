import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

const PRAYERS = [
  { key: 'fajr', name: 'الفجر', icon: '🌙' },
  { key: 'dhuhr', name: 'الظهر', icon: '☀️' },
  { key: 'asr', name: 'العصر', icon: '🌤️' },
  { key: 'maghrib', name: 'المغرب', icon: '🌇' },
  { key: 'isha', name: 'العشاء', icon: '🌃' },
];

type PrayerRecord = { done: boolean; onTime: boolean; location: string };
type DayRecord = { [key: string]: PrayerRecord };
type CycleStats = {
  totalPrayers: number;
  donePrayers: number;
  onTimePrayers: number;
  mosquePrayers: number;
  missedPrayers: number;
  daysCompleted: number;
  prayerStats: { [key: string]: { done: number; onTime: number; mosque: number; missed: number } };
};

type QuranAdvancedStats = {
  isDelayed: boolean;
  delayedPages: number;
  extraDaysNeeded: number;
  avgWeek: number;
  avgMonth: number;
  avgYear: number;
  todayTime: number;
};

function getLocalDateString(dateObj: Date): string {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getScore(stats: CycleStats): { score: number; grade: string; color: string } {
  if (stats.totalPrayers === 0) return { score: 0, grade: 'لا يوجد بيانات', color: '#888' };
  const score = Math.round((stats.donePrayers / stats.totalPrayers) * 100);
  if (score >= 95) return { score, grade: 'ممتاز 🌟', color: '#4caf50' };
  if (score >= 80) return { score, grade: 'جيد جداً ✨', color: '#c9a84c' };
  if (score >= 60) return { score, grade: 'جيد 👍', color: '#ff9800' };
  return { score, grade: 'يحتاج تحسين 💪', color: '#ff4444' };
}

export default function StatsScreen() {
  const { themeStyles, isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState<'prayer' | 'quran'>('prayer');
  const [stats, setStats] = useState<CycleStats | null>(null);
  const [cycleDay, setCycleDay] = useState(0);
  const [cycleStart, setCycleStart] = useState('');
  const [quranProgress, setQuranProgress] = useState<any>(null);
  const [quranAdvanced, setQuranAdvanced] = useState<QuranAdvancedStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [])
  );

  async function loadAll() {
    await loadPrayerStats();
    await loadQuranStats();
  }

  async function loadPrayerStats() {
    try {
      const todayObj = new Date();
      todayObj.setHours(0, 0, 0, 0);
      const todayStr = getLocalDateString(todayObj);

      let startDate = await AsyncStorage.getItem('cycle_start');
      if (!startDate) {
        startDate = todayStr;
        await AsyncStorage.setItem('cycle_start', startDate);
      }

      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      const diffTime = todayObj.getTime() - start.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
      const currentDay = Math.min(diffDays, 40);

      setCycleStart(startDate);
      setCycleDay(currentDay > 0 ? currentDay : 1);

      if (diffDays > 40) {
        const newStart = todayStr;
        await AsyncStorage.setItem('cycle_start', newStart);
        setCycleStart(newStart);
        setCycleDay(1);
      }

      const cycleStats: CycleStats = {
        totalPrayers: 0, donePrayers: 0, onTimePrayers: 0,
        mosquePrayers: 0, missedPrayers: 0, daysCompleted: 0,
        prayerStats: {},
      };

      PRAYERS.forEach(p => {
        cycleStats.prayerStats[p.key] = { done: 0, onTime: 0, mosque: 0, missed: 0 };
      });

      for (let i = 0; i < (diffDays > 40 ? 1 : currentDay); i++) {
        const loopDate = new Date(start);
        loopDate.setDate(start.getDate() + i);
        const dateStr = getLocalDateString(loopDate);

        const data = await AsyncStorage.getItem(`stats_${dateStr}`);
        const isToday = dateStr === todayStr;

        if (data) {
          const dayRecord: DayRecord = JSON.parse(data);
          let dayDoneCount = 0;

          PRAYERS.forEach(prayer => {
            const record = dayRecord[prayer.key];
            if (record) {
              cycleStats.totalPrayers++;
              if (record.done) {
                cycleStats.donePrayers++;
                cycleStats.prayerStats[prayer.key].done++;
                dayDoneCount++;
                if (record.onTime) { cycleStats.onTimePrayers++; cycleStats.prayerStats[prayer.key].onTime++; }
                if (record.location === 'mosque') { cycleStats.mosquePrayers++; cycleStats.prayerStats[prayer.key].mosque++; }
              } else {
                cycleStats.missedPrayers++;
                cycleStats.prayerStats[prayer.key].missed++;
              }
            } else {
              if (!isToday) {
                cycleStats.totalPrayers++;
                cycleStats.missedPrayers++;
                cycleStats.prayerStats[prayer.key].missed++;
              }
            }
          });

          if (dayDoneCount === 5) cycleStats.daysCompleted++;
        } else {
          if (!isToday) {
            PRAYERS.forEach(prayer => {
              cycleStats.totalPrayers++;
              cycleStats.missedPrayers++;
              cycleStats.prayerStats[prayer.key].missed++;
            });
          }
        }
      }
      setStats({ ...cycleStats });
    } catch (e) {
      console.error(e);
    }
  }

  async function loadQuranStats() {
    try {
      const progressData = await AsyncStorage.getItem('quran_progress');
      const timeData = await AsyncStorage.getItem('quran_time_history');

      let progress = progressData ? JSON.parse(progressData) : null;
      const timeHistory = timeData ? JSON.parse(timeData) : {};

      if (progress) {
        const todayObj = new Date();
        todayObj.setHours(0, 0, 0, 0);

        const dailyPages = progress.pagesPerDay || 0;

        if (progress.lastReadDate) {
          const lastRead = new Date(Number(progress.lastReadDate));
          lastRead.setHours(0, 0, 0, 0);
          const inactiveDays = Math.floor((todayObj.getTime() - lastRead.getTime()) / (1000 * 60 * 60 * 24));

          if (inactiveDays >= 7 && progress.mode !== 'free') {
            progress = {
              ...progress,
              currentPage: 1,
              startDate: Date.now(),
              lastReadDate: Date.now()
            };
            await AsyncStorage.setItem('quran_progress', JSON.stringify(progress));
          }
        }

        let isDelayed = false;
        let delayedPages = 0;
        let extraDaysNeeded = 0;

        if (progress.mode !== 'free' && progress.startDate) {
          const start = new Date(Number(progress.startDate));
          start.setHours(0, 0, 0, 0);

          const daysPassed = Math.floor((todayObj.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
          const targetPage = Math.min((daysPassed * dailyPages), 604);

          if (progress.currentPage < targetPage) {
            isDelayed = true;
            delayedPages = targetPage - progress.currentPage;
            extraDaysNeeded = dailyPages > 0 ? Math.ceil(delayedPages / dailyPages) : 0;
          }
        }

        const todayStrLocal = getLocalDateString(new Date());
        const todayTime = timeHistory[todayStrLocal] || 0;

        const calculateAverage = (daysCount: number) => {
          let totalMin = 0;
          const today = new Date();
          for (let i = 0; i < daysCount; i++) {
            const d = new Date();
            d.setDate(today.getDate() - i);
            const dStr = getLocalDateString(d);
            totalMin += timeHistory[dStr] || 0;
          }
          return Math.round((totalMin / daysCount / 60) * 10) / 10;
        };

        setQuranProgress(progress);
        setQuranAdvanced({
          isDelayed,
          delayedPages,
          extraDaysNeeded,
          todayTime,
          avgWeek: calculateAverage(7),
          avgMonth: calculateAverage(30),
          avgYear: calculateAverage(365),
        });
      } else {
        setQuranProgress(null);
        setQuranAdvanced(null);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  }

  function getQuranFinishDate() {
    if (!quranProgress || quranProgress.mode === 'free' || !quranAdvanced) return null;

    const dailyPages = quranProgress.pagesPerDay || 0;
    if (dailyPages === 0) return null;

    const pagesLeft = 604 - quranProgress.currentPage + 1;
    const daysLeft = Math.ceil(pagesLeft / dailyPages) + quranAdvanced.extraDaysNeeded;

    const finishDate = new Date();
    finishDate.setDate(finishDate.getDate() + daysLeft);

    return finishDate.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  const scoreData = stats ? getScore(stats) : null;
  const quranPct = quranProgress ? Math.round((quranProgress.currentPage / 604) * 100) : 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: themeStyles.bg }]}
      contentContainerStyle={[styles.content, { backgroundColor: themeStyles.bg }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={themeStyles.accent} colors={[themeStyles.accent]} />
      }
    >
      <Text style={[styles.title, { color: themeStyles.accent }]}>📊 الإحصائيات</Text>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, { backgroundColor: themeStyles.card, borderColor: themeStyles.border }, activeTab === 'prayer' && { backgroundColor: themeStyles.accent, borderColor: themeStyles.accent }]}
          onPress={() => setActiveTab('prayer')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'prayer' ? (isDarkMode ? '#0f1923' : '#ffffff') : themeStyles.subText }, activeTab === 'prayer' && { fontWeight: 'bold' }]}>🕌 الصلاة</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, { backgroundColor: themeStyles.card, borderColor: themeStyles.border }, activeTab === 'quran' && { backgroundColor: themeStyles.accent, borderColor: themeStyles.accent }]}
          onPress={() => setActiveTab('quran')}
        >
          <Text style={[styles.tabText, { color: activeTab === 'quran' ? (isDarkMode ? '#0f1923' : '#ffffff') : themeStyles.subText }, activeTab === 'quran' && { fontWeight: 'bold' }]}>📖 القرآن</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'prayer' && (
        <>
          <View style={[styles.cycleCard, { backgroundColor: themeStyles.card, borderColor: themeStyles.border }]}>
            <Text style={[styles.cycleTitle, { color: themeStyles.accent }]}>🔄 دورة الـ ٤٠ يوم</Text>
            <Text style={[styles.cycleDay, { color: themeStyles.text }]}>اليوم {cycleDay} من ٤٠</Text>
            <View style={[styles.progressBar, { backgroundColor: themeStyles.bg }]}>
              <View style={[styles.progressFill, { width: `${(cycleDay / 40) * 100}%`, backgroundColor: themeStyles.accent }]} />
            </View>
            <Text style={[styles.cycleStart, { color: themeStyles.subText }]}>بدأت في: {cycleStart}</Text>
          </View>

          {scoreData && stats && (
            <View style={[styles.scoreCard, { backgroundColor: themeStyles.card, borderColor: scoreData.color }]}>
              <Text style={[styles.scoreLabel, { color: themeStyles.subText }]}>التقييم العام</Text>
              <Text style={[styles.scoreNumber, { color: scoreData.color }]}>{scoreData.score}%</Text>
              <Text style={[styles.scoreGrade, { color: scoreData.color }]}>{scoreData.grade}</Text>
              <Text style={{ color: themeStyles.subText, marginTop: 5, fontSize: 13, textAlign: 'center' }}>
                صليت {stats.donePrayers} من أصل {stats.totalPrayers} صلاة مفروضة
              </Text>
            </View>
          )}

          {stats && (
            <View style={styles.quickStats}>
              <View style={[styles.statBox, { backgroundColor: themeStyles.card, borderColor: themeStyles.border }]}>
                <Text style={[styles.statNumber, { color: themeStyles.accent }]}>{stats.donePrayers}</Text>
                <Text style={[styles.statLabel, { color: themeStyles.subText }]}>صلاة أُديت</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: themeStyles.card, borderColor: themeStyles.border }]}>
                <Text style={[styles.statNumber, { color: '#ff4444' }]}>{stats.missedPrayers}</Text>
                <Text style={[styles.statLabel, { color: themeStyles.subText }]}>صلاة فائتة</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: themeStyles.card, borderColor: themeStyles.border }]}>
                <Text style={[styles.statNumber, { color: '#4caf50' }]}>{stats.daysCompleted}</Text>
                <Text style={[styles.statLabel, { color: themeStyles.subText }]}>يوم كامل</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: themeStyles.card, borderColor: themeStyles.border }]}>
                <Text style={[styles.statNumber, { color: themeStyles.accent }]}>{stats.mosquePrayers}</Text>
                <Text style={[styles.statLabel, { color: themeStyles.subText }]}>في المسجد</Text>
              </View>
            </View>
          )}

          {stats && (
            <View style={[styles.prayerStatsCard, { backgroundColor: themeStyles.card, borderColor: themeStyles.border }]}>
              <Text style={[styles.sectionTitle, { color: themeStyles.accent }]}>تفاصيل كل صلاة</Text>
              {PRAYERS.map(prayer => {
                const ps = stats.prayerStats[prayer.key];
                const pct = cycleDay > 0 ? Math.round((ps.done / cycleDay) * 100) : 0;
                return (
                  <View key={prayer.key} style={styles.prayerStatRow}>
                    <View style={styles.prayerStatHeader}>
                      <Text style={[styles.prayerStatName, { color: themeStyles.text }]}>{prayer.icon} {prayer.name}</Text>
                      <Text style={[styles.prayerStatPct, {
                        color: pct >= 80 ? '#4caf50' : pct >= 50 ? '#c9a84c' : '#ff4444'
                      }]}>{pct}%</Text>
                    </View>
                    <View style={[styles.miniProgressBar, { backgroundColor: themeStyles.bg }]}>
                      <View style={[styles.miniProgressFill, {
                        width: `${pct}%`,
                        backgroundColor: pct >= 80 ? '#4caf50' : pct >= 50 ? '#c9a84c' : '#ff4444'
                      }]} />
                    </View>
                    <View style={styles.prayerStatDetails}>
                      <Text style={[styles.detailText, { color: themeStyles.subText }]}>✅ {ps.done} أُديت</Text>
                      <Text style={[styles.detailText, { color: themeStyles.subText }]}>⏰ {ps.onTime} في وقتها</Text>
                      <Text style={[styles.detailText, { color: themeStyles.subText }]}>🕌 {ps.mosque} مسجد</Text>
                      <Text style={[styles.detailText, { color: themeStyles.subText }]}>❌ {ps.missed} فائتة</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}

      {activeTab === 'quran' && (
        <>
          {!quranProgress ? (
            <View style={[styles.emptyCard, { backgroundColor: themeStyles.card, borderColor: themeStyles.border }]}>
              <Text style={styles.emptyText}>📖</Text>
              <Text style={[styles.emptyLabel, { color: themeStyles.accent }]}>لم تبدأ قراءة القرآن بعد</Text>
            </View>
          ) : (
            <>
              {quranProgress.mode !== 'free' && quranAdvanced && (
                <View style={[styles.quranCard, { backgroundColor: themeStyles.card, borderColor: themeStyles.border }, quranAdvanced.isDelayed ? { borderColor: '#ff4444' } : null]}>
                  <Text style={[styles.quranTitle, { color: themeStyles.accent }]}>📊 حالة الالتزام بالورد</Text>
                  {quranAdvanced.isDelayed ? (
                    <View style={{ alignItems: 'center' }}>
                      <Text style={[styles.delayBadge, { backgroundColor: '#ff444422', color: '#ff4444' }]}>⚠️ متأخر عن الورد</Text>
                      <Text style={[styles.delayDetails, { color: themeStyles.text }]}>متأخر بمقدار: <Text style={{ color: '#ff4444', fontWeight: 'bold' }}>{quranAdvanced.delayedPages}</Text> صفحة</Text>
                      <Text style={[styles.delayDetails, { color: themeStyles.text }]}>الأيام الزائدة لإتمام الختمة: <Text style={{ color: '#ff4444', fontWeight: 'bold' }}>{quranAdvanced.extraDaysNeeded}</Text> يوم</Text>
                    </View>
                  ) : (
                    <Text style={[styles.delayBadge, { backgroundColor: '#4caf5022', color: '#4caf50' }]}>✅ ملتزم بالخطة ومستمر</Text>
                  )}
                </View>
              )}

              <View style={[styles.quranCard, { backgroundColor: themeStyles.card, borderColor: themeStyles.accent + '44' }]}>
                <Text style={[styles.quranTitle, { color: themeStyles.accent }]}>{quranProgress.wirdLabel || 'قراءة حرة'}</Text>
                <Text style={[styles.quranPct, { color: themeStyles.accent }]}>{quranPct}%</Text>
                <Text style={[styles.quranSubtitle, { color: themeStyles.subText }]}>من المصحف الكريم</Text>

                <View style={[styles.progressBar, { backgroundColor: themeStyles.bg }]}>
                  <View style={[styles.progressFill, { width: `${quranPct}%`, backgroundColor: themeStyles.accent }]} />
                </View>

                <View style={styles.quranStats}>
                  <View style={[styles.quranStatBox, { backgroundColor: themeStyles.bg, borderColor: themeStyles.border }]}>
                    <Text style={[styles.quranStatNum, { color: themeStyles.accent }]}>{quranProgress.currentPage}</Text>
                    <Text style={[styles.quranStatLabel, { color: themeStyles.subText }]}>الصفحة الحالية</Text>
                  </View>
                  <View style={[styles.quranStatBox, { backgroundColor: themeStyles.bg, borderColor: themeStyles.border }]}>
                    <Text style={[styles.quranStatNum, { color: themeStyles.accent }]}>{Math.max(0, 604 - quranProgress.currentPage)}</Text>
                    <Text style={[styles.quranStatLabel, { color: themeStyles.subText }]}>صفحة متبقية</Text>
                  </View>
                </View>

                {getQuranFinishDate() && (
                  <Text style={[styles.finishDate, { color: themeStyles.accent }]}>🏁 موعد الختم المتوقع: {getQuranFinishDate()}</Text>
                )}
              </View>

              {quranAdvanced && (
                <View style={[styles.quranCard, { backgroundColor: themeStyles.card, borderColor: themeStyles.accent + '44' }]}>
                  <Text style={[styles.quranTitle, { color: themeStyles.accent }]}>⏱️ تتبع وقت القراءة</Text>
                  <Text style={{ color: themeStyles.text, fontSize: 18, marginBottom: 15 }}>قراءة اليوم: {quranAdvanced.todayTime} دقيقة</Text>

                  <View style={styles.timeRow}>
                    <View style={[styles.timeBox, { backgroundColor: themeStyles.bg, borderColor: themeStyles.border }]}>
                      <Text style={[styles.timeValue, { color: themeStyles.accent }]}>{quranAdvanced.avgWeek} س</Text>
                      <Text style={[styles.timeLabel, { color: themeStyles.subText }]}>متوسط الأسبوع</Text>
                    </View>
                    <View style={[styles.timeBox, { backgroundColor: themeStyles.bg, borderColor: themeStyles.border }]}>
                      <Text style={[styles.timeValue, { color: themeStyles.accent }]}>{quranAdvanced.avgMonth} س</Text>
                      <Text style={[styles.timeLabel, { color: themeStyles.subText }]}>متوسط الشهر</Text>
                    </View>
                    <View style={[styles.timeBox, { backgroundColor: themeStyles.bg, borderColor: themeStyles.border }]}>
                      <Text style={[styles.timeValue, { color: themeStyles.accent }]}>{quranAdvanced.avgYear} س</Text>
                      <Text style={[styles.timeLabel, { color: themeStyles.subText }]}>متوسط السنة</Text>
                    </View>
                  </View>
                </View>
              )}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { alignItems: 'center', paddingTop: 60, paddingBottom: 100 },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 20 },
  tabs: { flexDirection: 'row', marginBottom: 20, gap: 10 },
  tab: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  tabText: { fontSize: 14, fontWeight: 'bold' },
  cycleCard: { width: '90%', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1 },
  cycleTitle: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  cycleDay: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  progressBar: { height: 10, borderRadius: 5, marginBottom: 8, width: '100%' },
  progressFill: { height: 10, borderRadius: 5 },
  cycleStart: { fontSize: 12, textAlign: 'center' },
  scoreCard: { width: '90%', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 2, alignItems: 'center' },
  scoreLabel: { fontSize: 14, marginBottom: 8 },
  scoreNumber: { fontSize: 48, fontWeight: 'bold', marginBottom: 4 },
  scoreGrade: { fontSize: 18, fontWeight: 'bold' },
  quickStats: { width: '90%', flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16, justifyContent: 'space-between' },
  statBox: { width: '47%', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1 },
  statNumber: { fontSize: 28, fontWeight: 'bold' },
  statLabel: { fontSize: 12, marginTop: 4 },

  prayerStatsCard: { width: '90%', borderRadius: 16, padding: 16, borderWidth: 1 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 },
  prayerStatRow: { marginBottom: 16 },
  prayerStatHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  prayerStatName: { fontSize: 15 },
  prayerStatPct: { fontSize: 15, fontWeight: 'bold' },
  miniProgressBar: { height: 6, borderRadius: 3, marginBottom: 8, width: '100%' },
  miniProgressFill: { height: 6, borderRadius: 3 },
  prayerStatDetails: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap' },
  detailText: { fontSize: 11 },

  emptyCard: { width: '90%', borderRadius: 16, padding: 40, alignItems: 'center', borderWidth: 1 },
  emptyText: { fontSize: 48, marginBottom: 12 },
  emptyLabel: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  quranCard: { width: '90%', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, alignItems: 'center' },
  quranTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  quranPct: { fontSize: 52, fontWeight: 'bold' },
  quranSubtitle: { fontSize: 13, marginBottom: 12 },
  quranStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', width: '100%', marginTop: 16, marginBottom: 12 },
  quranStatBox: { width: '47%', borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1 },
  quranStatNum: { fontSize: 22, fontWeight: 'bold' },
  quranStatLabel: { fontSize: 11, marginTop: 4 },
  finishDate: { fontSize: 14, fontWeight: 'bold', marginTop: 12, textAlign: 'center' },
  delayBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, fontSize: 14, fontWeight: 'bold', marginBottom: 10, overflow: 'hidden' },
  delayDetails: { fontSize: 14, marginTop: 4 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', gap: 8 },
  timeBox: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center', borderWidth: 1 },
  timeValue: { fontSize: 16, fontWeight: 'bold' },
  timeLabel: { fontSize: 10, marginTop: 4 }
});