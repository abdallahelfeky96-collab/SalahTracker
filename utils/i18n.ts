import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback } from 'react';

export type Lang = 'ar' | 'en';

const translations: Record<Lang, Record<string, string>> = {
  ar: {
    settings: 'الإعدادات',
    profile: 'البروفايل',
    theme: 'المظهر',
    darkMode: 'الوضع الداكن',
    lightMode: 'الوضع الفاتح',
    adhan: 'صوت الأذان',
    notifications: 'التنبيهات',
    notifyPrayer: 'تنبيهات الصلاة',
    notifyAthkar: 'تنبيهات الأذكار',
    notifyWird: 'تنبيه الورد اليومي',
    language: 'اللغة',
    arabic: 'العربية',
    english: 'English',
    reset: 'إعادة ضبط البيانات',
    resetConfirm: 'هل أنت متأكد من مسح جميع البيانات؟ لا يمكن التراجع.',
    resetSuccess: 'تم مسح جميع البيانات بنجاح',
    resetError: 'حدث خطأ أثناء مسح البيانات',
    save: 'حفظ',
    cancel: 'إلغاء',
    close: 'إغلاق',
    success: 'نجاح',
    error: 'خطأ',
    ok: 'حسناً',
    downloadSuccess: 'تم التحميل بنجاح',
    downloadError: 'فشل التحميل، تأكد من الاتصال بالإنترنت',
    playError: 'تعذر تشغيل الصوت',
    offlineReady: 'جاهز للاستخدام بدون إنترنت',
    quranDownloadSuccess: 'تم حفظ جميع صفحات المصحف بنجاح',
    quranDownloadError: 'حدثت مشكلة أثناء تحميل الصفحات',
    confirm: 'تأكيد',
    warning: 'تحذير',
  },
  en: {
    settings: 'Settings',
    profile: 'Profile',
    theme: 'Theme',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    adhan: 'Adhan Sound',
    notifications: 'Notifications',
    notifyPrayer: 'Prayer Notifications',
    notifyAthkar: 'Athkar Notifications',
    notifyWird: 'Daily Wird Notification',
    language: 'Language',
    arabic: 'Arabic',
    english: 'English',
    reset: 'Reset All Data',
    resetConfirm: 'Are you sure you want to delete all data? This cannot be undone.',
    resetSuccess: 'All data has been reset successfully',
    resetError: 'An error occurred while resetting data',
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
    success: 'Success',
    error: 'Error',
    ok: 'OK',
    downloadSuccess: 'Download completed successfully',
    downloadError: 'Download failed, check your internet connection',
    playError: 'Could not play audio',
    offlineReady: 'Ready for offline use',
    quranDownloadSuccess: 'All pages saved successfully',
    quranDownloadError: 'An error occurred while downloading pages',
    confirm: 'Confirm',
    warning: 'Warning',
  }
};

let currentLang: Lang = 'ar';

export async function loadLanguage() {
  try {
    const settings = await AsyncStorage.getItem('user_settings');
    if (settings) {
      const parsed = JSON.parse(settings);
      if (parsed.language && (parsed.language === 'ar' || parsed.language === 'en')) {
        currentLang = parsed.language;
      }
    }
  } catch (e) {}
}

export function t(key: string): string {
  return translations[currentLang][key] || key;
}

export function useLanguage() {
  const [lang, setLangState] = useState<Lang>(currentLang);

  const setLang = useCallback(async (newLang: Lang) => {
    currentLang = newLang;
    setLangState(newLang);
    try {
      const current = await AsyncStorage.getItem('user_settings');
      const settings = current ? JSON.parse(current) : {};
      await AsyncStorage.setItem('user_settings', JSON.stringify({ ...settings, language: newLang }));
    } catch (e) {}
  }, []);

  useEffect(() => {
    loadLanguage().then(() => setLangState(currentLang));
  }, []);

  return { lang, setLang, t };
}
