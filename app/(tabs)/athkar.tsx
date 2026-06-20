import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Adhan from 'adhan';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { Dimensions, FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const CATEGORIES = [
  { key: 'morning', label: 'أذكار الصباح', icon: '🌅' },
  { key: 'evening', label: 'أذكار المساء', icon: '🌙' },
  { key: 'prayer', label: 'أذكار الصلاة', icon: '🤲' },
  { key: 'sleep', label: 'أذكار النوم', icon: '😴' },
  { key: 'quran', label: 'أدعية قرآنية', icon: '📖' },
  { key: 'deceased', label: 'أذكار المتوفي', icon: '🕊️' },
  { key: 'travel', label: 'أذكار السفر', icon: '✈️' },
];

function isFajrOrMaghribTime() {
  const currentHour = new Date().getHours();
  return (currentHour >= 3 && currentHour <= 6) || (currentHour >= 17 && currentHour <= 20);
}

const SURAHS = [
  { text: `بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
قُلْ هُوَ اللَّهُ أَحَدٌ ۝ اللَّهُ الصَّمَدُ ۝ لَمْ يَلِدْ وَلَمْ يُولَدْ ۝ وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ`, label: 'سورة الإخلاص' },
  { text: `بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ۝ مِنْ شَرِّ مَا خَلَقَ ۝ وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ ۝ وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ ۝ وَمِنْ شَرِّ حَاسِدٍ إِذَا حَسَدَ`, label: 'سورة الفلق' },
  { text: `بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
قُلْ أَعُوذُ بِرَبِّ النَّاسِ ۝ مَلِكِ النَّاسِ ۝ إِلَهِ النَّاسِ ۝ مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ ۝ الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ ۝ مِنَ الْجِنَّةِ وَالنَّاسِ`, label: 'سورة الناس' }
];

const ATHKAR: { [key: string]: { text: string; count: number; label?: string }[] } = {
  morning: [
    { text: `أَعُوذُ بِاللهِ مِنَ الشَّيْطَانِ الرَّجِيمِ
﴿اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ...﴾`, count: 1, label: 'آية الكرسي' },
    ...SURAHS.map(s => ({ text: s.text, count: 3, label: `${s.label} (٣ مرات)` })),
    { text: `لاَ إِلَهَ إِلاَّ اللهُ وَحْدَهُ لاَ شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ يُحْيِي وَيُمِيتُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ`, count: 10, label: '١٠ مرات' },
    { text: `أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ للهِ، وَالْحَمْدُ للهِ، لاَ إِلَهَ إِلاَّ اللهُ وَحْدَهُ لاَ شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ`, count: 1 },
    { text: `اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ`, count: 1 },
    { text: `اللَّهُمَّ أَنْتَ رَبِّي لاَ إِلَهَ إِلاَّ أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ`, count: 1, label: 'سيد الاستغفار' },
    { text: `اللَّهُمَّ إِنِّي أَصْبَحْتُ أُشْهِدُكَ، وَأُشْهِدُ حَمَلَةَ عَرْشِكَ، وَمَلاَئِكَتَكَ، وَجَمِيعَ خَلْقِكَ، أَنَّكَ أَنْتَ اللهُ لاَ إِلَهَ إِلاَّ أَنْتَ وَحْدَكَ لاَ شَرِيكَ لَكَ`, count: 4, label: '٤ مرات' },
    { text: `اللَّهُمَّ مَا أَصْبَحَ بِي مِنْ نِعْمَةٍ أَوْ بِأَحَدٍ مِنْ خَلْقِكَ، فَمِنْكَ وَحْدَكَ لاَ شَرِيكَ لَكَ، فَلَكَ الْحَمْدُ وَلَكَ الشُّكْرُ`, count: 1 },
    { text: `اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي`, count: 3, label: '٣ مرات' },
    { text: `سُبْحَانَ اللهِ وَبِحَمْدِهِ`, count: 100, label: '١٠٠ مرة' },
    { text: `اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالآخِرَةِ`, count: 1 },
    { text: `بِسْمِ اللهِ الَّذِي لاَ يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الأَرْضِ وَلاَ فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ`, count: 3, label: '٣ مرات' },
    { text: `رَضِيتُ بِاللهِ رَبًّا، وَبِالإِسْلاَمِ دِينًا، وَبِمُحَمَّدٍ ﷺ نَبِيًّا`, count: 3, label: '٣ مرات' },
  ],
  evening: [
    { text: `أَعُوذُ بِاللهِ مِنَ الشَّيْطَانِ الرَّجِيمِ
﴿اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ...﴾`, count: 1, label: 'آية الكرسي' },
    ...SURAHS.map(s => ({ text: s.text, count: 3, label: `${s.label} (٣ مرات)` })),
    { text: `لاَ إِلَهَ إِلاَّ اللهُ وَحْدَهُ لاَ شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ يُحْيِي وَيُمِيتُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ`, count: 10, label: '١٠ مرات' },
    { text: `أَمْسَيْنَا وَأَمْسَى الْمُلْكُ للهِ، وَالْحَمْدُ للهِ، لاَ إِلَهَ إِلاَّ اللهُ وَحْدَهُ لاَ شَرِيكَ لَهُ`, count: 1 },
    { text: `اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ وَإِلَيْكَ الْمَصِيرُ`, count: 1 },
    { text: `اللَّهُمَّ إِنِّي أَمْسَيْتُ أُشْهِدُكَ، وَأُشْهِدُ حَمَلَةَ عَرْشِكَ، وَمَلاَئِكَتَكَ، وَجَمِيعَ خَلْقِكَ أَنَّكَ أَنْتَ اللهُ لاَ إِلَهَ إِلَّا أَنْتَ`, count: 4, label: '٤ مرات' },
    { text: `اللَّهُمَّ مَا أَمْسَى بِي مِنْ نِعْمَةٍ أَوْ بِأَحَدٍ مِنْ خَلْقِكَ فَمِنْكَ وَحْدَكَ لاَ شَرِيكَ لَكَ`, count: 1 },
    { text: `سُبْحَانَ اللهِ وَبِحَمْدِهِ`, count: 100, label: '١٠٠ مرة' },
    { text: `أَعُوذُ بِكَلِمَاتِ اللهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ`, count: 3, label: '٣ مرات' },
    { text: `بِسْمِ اللهِ الَّذِي لاَ يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الأَرْضِ وَلاَ فِي السَّمَاءِ`, count: 3, label: '٣ مرات' },
    { text: `اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالآخِرَةِ`, count: 1 },
  ],
  prayer: [
    { text: `أَسْتَغْفِرُ اللهَ`, count: 3, label: '٣ مرات' },
    { text: `اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ، تَبَارَكْتَ وَتَعَالَيْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ، أَحْيِنَا رَبَّنَا بِسَلَامٍ وَأَدْخِلْنَا الْجَنَّةَ دَارَكَ دَارَ السَّلَامِ`, count: 1 },
    { text: `لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، مَا شَاءَ اللَّهُ كَانَ وَمَا لَمْ يَشَأْ لَمْ يَكُن`, count: 1 },
    { text: `لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ، وَلَا إِلَٰهَ إِلَّا اللَّهُ وَلَا نَعْبُدُ إِلَّا إِيَّاهُ، لَهُ النِّعْمَةُ وَلَهُ الْفَضْلُ وَلَهُ الثَّنَاءُ الْحَسَنُ، لَا إِلَٰهَ إِلَّا اللَّهُ مُخْلِصِينَ لَهُ الدِّينَ وَلَوْ كَرِهَ الْكَافِرُونَ`, count: 1 },
    { text: `اللَّهُمَّ لَا مَانِعَ لِمَا أَعْطَيْتَ، وَلَا مُعْطِيَ لِمَا مَنَعْتَ، وَلَا يَنْفَعُ ذَا الْجَدِّ مِنْكَ الْجَدُّ`, count: 1 },
    { text: `سُبْحَانَ اللهِ`, count: 33, label: '٣٣ مرة' },
    { text: `الْحَمْدُ للهِ`, count: 33, label: '٣٣ مرة' },
    { text: `اللهُ أَكْبَرُ`, count: 33, label: '٣٣ مرة' },
    { text: `لاَ إِلَهَ إِلاَّ اللهُ وَحْدَهُ لاَ شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ`, count: 1, label: 'تمام المائة' },
    { text: `﴿اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۚ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ﴾`, count: 1, label: 'آية الكرسي' },
    { text: `لاَ إِلَهَ إِلاَّ اللهُ وَحْدَهُ لاَ شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ يُحْيِي وَيُمِيتُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ`, count: isFajrOrMaghribTime() ? 10 : 1, label: isFajrOrMaghribTime() ? '١٠ مرات (خاص بالفجر والمغرب)' : 'مرة واحدة' },
    ...SURAHS.map(s => ({
      text: s.text,
      count: isFajrOrMaghribTime() ? 3 : 1,
      label: isFajrOrMaghribTime() ? `${s.label} (٣ مرات للفجر/المغرب)` : `${s.label} (مرة واحدة)`
    }))
  ],
  sleep: [
    { text: `بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا`, count: 1 },
    { text: `﴿قُلْ هُوَ اللَّهُ أَحَدٌ﴾ و ﴿قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ﴾ و ﴿قُلْ أَعُوذُ بِرَبِّ النَّاسِ﴾`, count: 3, label: 'المعوذات ٣ مرات' },
    { text: `﴿اللَّهُ لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ...﴾`, count: 1, label: 'آية الكرسي' },
    { text: `سُبْحَانَ اللهِ`, count: 33, label: '٣٣ مرة' },
    { text: `الْحَمْدُ للهِ`, count: 33, label: '٣٣ مرة' },
    { text: `اللهُ أَكْبَرُ`, count: 34, label: '٣٤ مرة' },
    { text: `اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ`, count: 3, label: '٣ مرات' },
    { text: `اللَّهُمَّ بِاسْمِكَ أَحْيَا وَبِاسْمِكَ أَمُوتُ`, count: 1 },
  ],
  quran: [
    { text: `﴿رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ﴾`, count: 1 },
    { text: `﴿رَبَّنَا لَا تُزِغْ قُلُوبَنَا بَعْدَ إِذْ هَدَيْتَنَا وَهَبْ لَنَا مِن لَّدُنكَ رَحْمَةً إِنَّكَ أَنتَ الْوَهَّابُ﴾`, count: 1 },
    { text: `﴿رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي وَاحْلُلْ عُقْدَةً مِّن لِّسَانِي يَفْقَهُوا قَوْلِي﴾`, count: 1 },
    { text: `﴿رَبَّنَا اغْفِرْ لَنَا ذُنُوبَنَا وَإِسْرَافَنَا فِي أَمْرِنَا وَثَبِّتْ أَقْدَامَنَا وَانصُرْنَا عَلَى الْقَوْمِ الْكَافِرِينَ﴾`, count: 1 },
    { text: `﴿رِّبِّ إِنِّي ظَلَمْتُ نَفْسِي فَاغْفِرْ لِي﴾`, count: 1 },
    { text: `﴿لَّا إِلَهَ إِلَّا أَنتَ سُبْحَانَكَ إِنِّي كُنتُ مِنَ الظَّالِمِينَ﴾`, count: 1, label: 'دعاء يونس' },
    { text: `﴿رَبِّ أَوْزِعْنِي أَنْ أَشْكُرَ نِعْمَتَكَ الَّتِي أَنْعَمْتَ عَلَيَّ وَعَلَى وَالِدَيَّ وَأَنْ أَعْمَلَ صَالِحًا تَرْضَاهُ﴾`, count: 1 },
    { text: `﴿رَبَّنَا هَبْ لَنَا مِنْ أَزْوَاجِنَا وَذُرِّيَّاتِنَا قُرَّةَ أَعْيُنٍ وَاجْعَلْنَا لِلْمُتَّقِينَ إِمَامًا﴾`, count: 1 },
  ],
  deceased: [
    { text: `اللَّهُمَّ اغْفِرْ لَهُ وَارْحَمْهُ وَعَافِهِ وَاعْفُ عَنْهُ، وَأَكْرِمْ نُزُلَهُ، وَوَسِّعْ مُدْخَلَهُ`, count: 1 },
    { text: `اللَّهُمَّ اغْفِرْ لِحَيِّنَا وَمَيِّتِنَا، وَشَاهِدِنَا وَغَائِبِنَا، وَصَغِيرِنَا وَكَبِيرِنَا، وَذَكَرِنَا وَأُنْثَانَا`, count: 1 },
    { text: `اللَّهُمَّ مَنْ أَحْيَيْتَهُ مِنَّا فَأَحْيِهِ عَلَى الإِسْلاَمِ، وَمَنْ تَوَفَّيْتَهُ مِنَّا فَتَوَفَّهُ عَلَى الإِيمَانِ`, count: 1 },
    { text: `اللَّهُمَّ اغْفِرْ لَهُ وَارْفَعْ دَرَجَتَهُ فِي الْمَهْدِيِّينَ، وَاخْلُفْهُ فِي عَقِبِهِ فِي الْغَابِرِينَ`, count: 1 },
    { text: `اللَّهُمَّ لاَ تَحْرِمْنَا أَجْرَهُ وَلاَ تَفْتِنَّا بَعْدَهُ وَاغْفِرْ لَنَا وَلَهُ`, count: 1 },
    { text: `اللَّهُمَّ أَنْزلَهُ مَنْزِلاً مُبَارَكًا وَأَنْتَ خَيْرُ الْمُنْزِلِينَ`, count: 1 },
    { text: `اللَّهُمَّ عَبْدُكَ وَابْنُ عَبْدِكَ وَابْنُ أَمَتِكَ كَانَ يَشْهَدُ أَنْ لاَ إِلَهَ إِلاَّ أَنْتَ وَأَنَّ مُحَمَّدًا عَبْدُكَ وَرَسُولُكَ`, count: 1 },
    { text: `اللَّهُمَّ إِنْ كَانَ مُحْسِنًا فَزِدْ فِي حَسَنَاتِهِ، وَإِنْ كَانَ مُسِيئًا فَتَجَاوَزْ عَنْ سَيِّئَاتِهِ`, count: 1 },
  ],
  travel: [
    { text: `اللهُ أَكْبَرُ، اللهُ أَكْبَرُ، اللهُ أَكْبَرُ، سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ`, count: 1, label: 'دعاء السفر' },
    { text: `اللَّهُمَّ إِنَّا نَسْأَلُكَ فِي سَفَرِنَا هَذَا الْبِرَّ وَالتَّقْوَى، وَمِنَ الْعَمَلِ مَا تَرْضَى`, count: 1 },
    { text: `اللَّهُمَّ هَوِّنْ عَلَيْنَا سَفَرَنَا هَذَا وَاطْوِ عَنَّا بُعْدَهُ`, count: 1 },
    { text: `اللَّهُمَّ أَنْتَ الصَّاحِبُ فِي السَّفَرِ، وَالْخَلِيفَةُ فِي الأَهْلِ`, count: 1 },
    { text: `اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ وَعْثَاءِ السَّفَرِ، وَكَآبَةِ الْمَنْظَرِ، وَسُوءِ الْمُنْقَلَبِ فِي الْمَالِ وَالأَهْلِ`, count: 1 },
    { text: `سُبْحَانَ اللهِ وَبِحَمْدِهِ`, count: 100, label: '١٠٠ مرة' },
  ],
};

export default function AthkarScreen() {
  const { themeStyles, isDarkMode } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState<string>('morning');
  const [counters, setCounters] = useState<{ [key: string]: number }>({});
  const [done, setDone] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    initAthkarNotifications();
  }, []);

  async function initAthkarNotifications() {
    try {
      const settingsData = await AsyncStorage.getItem('user_settings');
      const settings = settingsData ? JSON.parse(settingsData) : {};
      const isNotifyAthkarEnabled = settings.notifyAthkar ?? true;

      if (!isNotifyAthkarEnabled) {
        await Notifications.cancelAllScheduledNotificationsAsync();
        return;
      }

      const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
      await Notifications.requestPermissionsAsync();

      let lat = 30.0444, lng = 31.2357;
      if (locStatus === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        lat = location.coords.latitude;
        lng = location.coords.longitude;
      }

      const coords = new Adhan.Coordinates(lat, lng);
      const params = Adhan.CalculationMethod.Egyptian();
      const times = new Adhan.PrayerTimes(coords, new Date(), params);

      await Notifications.cancelAllScheduledNotificationsAsync();
      const now = new Date();

      const morningAthkarTime = new Date(times.fajr.getTime() + 60 * 60 * 1000);
      if (morningAthkarTime > now) {
        await Notifications.scheduleNotificationAsync({
          content: { title: '🌅 أذكار الصباح', body: 'لا تنسى أذكار الصباح', sound: true },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: morningAthkarTime },
        });
      }

      const eveningAthkarTime = new Date(times.maghrib.getTime() - 60 * 60 * 1000);
      if (eveningAthkarTime > now) {
        await Notifications.scheduleNotificationAsync({
          content: { title: '🌙 أذكار المساء', body: 'لا تنسى أذكار المساء', sound: true },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: eveningAthkarTime },
        });
      }

      const PRAYERS_LIST = [
        { key: 'fajr', name: 'الفجر' },
        { key: 'dhuhr', name: 'الظهر' },
        { key: 'asr', name: 'العصر' },
        { key: 'maghrib', name: 'المغرب' },
        { key: 'isha', name: 'العشاء' },
      ];

      for (const prayer of PRAYERS_LIST) {
        const prayerTime = (times as any)[prayer.key];
        if (!prayerTime) continue;
        const athkarTime = new Date(prayerTime.getTime() + 35 * 60 * 1000);
        if (athkarTime > now) {
          await Notifications.scheduleNotificationAsync({
            content: { title: `🤲 أذكار بعد ${prayer.name}`, body: 'لا تنسى أذكار ما بعد الصلاة', sound: true },
            trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: athkarTime },
          });
        }
      }

      const sleepTime = new Date();
      sleepTime.setHours(22, 0, 0, 0);
      if (sleepTime > now) {
        await Notifications.scheduleNotificationAsync({
          content: { title: '😴 أذكار النوم', body: 'حان وقت أذكار النوم، أحسن ختام ليومك', sound: true },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: sleepTime },
        });
      }
    } catch (e) {
      console.log('Error calculating Adhan times for notifications:', e);
    }
  }

  function getKey(category: string, index: number) {
    return `${category}_${index}`;
  }

  function handlePress(index: number, maxCount: number) {
    if (!selectedCategory) return;
    const key = getKey(selectedCategory, index);
    if (done[key]) return;
    const current = counters[key] || 0;
    const next = current + 1;
    if (current === 0) {
      setTimeout(() => resetSingleCounter(key), 30 * 60 * 1000);
    }
    if (next >= maxCount) {
      setCounters(prev => ({ ...prev, [key]: next }));
      setDone(prev => ({ ...prev, [key]: true }));
    } else {
      setCounters(prev => ({ ...prev, [key]: next }));
    }
  }

  function resetSingleCounter(key: string) {
    setCounters(prev => { const updated = { ...prev }; delete updated[key]; return updated; });
    setDone(prev => { const updated = { ...prev }; delete updated[key]; return updated; });
  }

  function resetAll() {
    setCounters({});
    setDone({});
  }

  const currentAthkar = selectedCategory ? ATHKAR[selectedCategory] : [];
  const currentCategory = CATEGORIES.find(c => c.key === selectedCategory);

  return (
    <View style={[styles.container, { backgroundColor: themeStyles.bg, paddingTop: 50 }]}>
      <Text style={[styles.title, { color: themeStyles.accent }]}>📿 الأذكار والأدعية</Text>
      <View style={styles.listWrapper}>
        <FlatList
          data={CATEGORIES}
          horizontal
          showsHorizontalScrollIndicator={true}
          keyExtractor={item => item.key}
          contentContainerStyle={styles.categoriesList}
          renderItem={({ item }) => {
            const isSelected = selectedCategory === item.key;
            return (
              <TouchableOpacity
                style={[styles.categoryCard, { backgroundColor: themeStyles.card, borderColor: themeStyles.border }, isSelected && { borderColor: themeStyles.accent, backgroundColor: isDarkMode ? '#243449' : '#e8f0fe' }]}
                onPress={() => setSelectedCategory(item.key)}
              >
                <Text style={styles.categoryIcon}>{item.icon}</Text>
                <Text style={[styles.categoryLabel, { color: isSelected ? themeStyles.accent : themeStyles.subText }, isSelected && { fontWeight: 'bold' }]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>
      <View style={[styles.athkarContainer, { backgroundColor: isDarkMode ? '#131f2c' : '#f0f4f8' }]}>
        <View style={[styles.header, { backgroundColor: themeStyles.card, borderBottomColor: themeStyles.border }]}>
          <Text style={[styles.headerTitle, { color: themeStyles.accent }]}>
            {currentCategory?.icon} {currentCategory?.label}
          </Text>
          <TouchableOpacity onPress={resetAll} style={styles.resetBtn}>
            <Text style={[styles.resetText, { color: '#e74c3c' }]}>🔄 تصفير الكل</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.athkarContent} showsVerticalScrollIndicator={false}>
          {currentAthkar.map((item, index) => {
            const key = getKey(selectedCategory, index);
            const current = counters[key] || 0;
            const isDone = done[key];
            return (
              <TouchableOpacity
                key={key}
                style={[styles.card, { backgroundColor: themeStyles.card, borderColor: themeStyles.border }, isDone && { borderColor: '#4caf50', backgroundColor: isDarkMode ? '#1a2e1a' : '#e8f5e9' }]}
                onPress={() => handlePress(index, item.count)}
                activeOpacity={0.8}
              >
                {item.label ? <Text style={[styles.label, { color: themeStyles.accent }]}>{item.label}</Text> : null}
                <Text style={[styles.dhikrText, { color: themeStyles.text }]}>{item.text}</Text>
                {item.count > 1 && (
                  <View style={styles.counterRow}>
                    <View style={[styles.counterBadge, { backgroundColor: themeStyles.bg, borderColor: themeStyles.accent }, isDone && { borderColor: '#4caf50' }]}>
                      <Text style={[styles.counterText, { color: isDone ? '#4caf50' : themeStyles.accent }]}>
                        {isDone ? '✓' : `${current} / ${item.count}`}
                      </Text>
                    </View>
                    <Text style={[styles.tapHint, { color: themeStyles.subText }]}>{isDone ? 'تم ✓' : 'اضغط للعد'}</Text>
                  </View>
                )}
                {item.count === 1 && isDone && (
                  <Text style={[styles.doneText, { color: '#4caf50' }]}>تم ✓</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  listWrapper: { height: 110, marginBottom: 10 },
  categoriesList: { paddingHorizontal: 15, gap: 12, flexDirection: 'row-reverse' },
  categoryCard: { width: 100, height: 90, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, gap: 4 },
  categoryIcon: { fontSize: 26 },
  categoryLabel: { fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  athkarContainer: { flex: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 16, fontWeight: 'bold' },
  resetBtn: { padding: 6 },
  resetText: { fontSize: 14, fontWeight: 'bold' },
  athkarContent: { alignItems: 'center', paddingTop: 16, paddingBottom: 40 },
  card: { width: '90%', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1 },
  label: { fontSize: 12, textAlign: 'center', marginBottom: 6, fontWeight: 'bold' },
  dhikrText: { fontSize: 15, textAlign: 'center', lineHeight: 26, marginBottom: 6 },
  counterRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 6 },
  counterBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, borderWidth: 1 },
  counterText: { fontWeight: 'bold', fontSize: 13 },
  tapHint: { fontSize: 11 },
  doneText: { textAlign: 'center', marginTop: 4, fontWeight: 'bold' },
});