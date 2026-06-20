// quranData.ts

export interface Surah {
  number: number;
  name: string;
  startPage: number;
  versesCount: number;
  type: 'مكية' | 'مدنية';
}

export interface QuranIndexItem {
  number: number;
  name: string;
  page: number;
}

export const SURAHS: Surah[] = [
  { number: 1, name: "الفاتحة", startPage: 1, versesCount: 7, type: "مكية" },
  { number: 2, name: "البقرة", startPage: 2, versesCount: 286, type: "مدنية" },
  { number: 3, name: "آل عمران", startPage: 50, versesCount: 200, type: "مدنية" },
  { number: 4, name: "النساء", startPage: 77, versesCount: 176, type: "مدنية" },
  { number: 5, name: "المائدة", startPage: 106, versesCount: 120, type: "مدنية" },
  { number: 6, name: "الأنعام", startPage: 128, versesCount: 165, type: "مكية" },
  { number: 7, name: "الأعراف", startPage: 151, versesCount: 206, type: "مكية" },
  { number: 8, name: "الأنفال", startPage: 177, versesCount: 75, type: "مدنية" },
  { number: 9, name: "التوبة", startPage: 187, versesCount: 129, type: "مدنية" },
  { number: 10, name: "يونس", startPage: 208, versesCount: 109, type: "مكية" },
  { number: 11, name: "هود", startPage: 221, versesCount: 123, type: "مكية" },
  { number: 12, name: "يوسف", startPage: 235, versesCount: 111, type: "مكية" },
  { number: 13, name: "الرعد", startPage: 249, versesCount: 43, type: "مدنية" },
  { number: 14, name: "إبراهيم", startPage: 255, versesCount: 52, type: "مكية" },
  { number: 15, name: "الحجر", startPage: 262, versesCount: 99, type: "مكية" },
  { number: 16, name: "النحل", startPage: 267, versesCount: 128, type: "مكية" },
  { number: 17, name: "الإسراء", startPage: 282, versesCount: 111, type: "مكية" },
  { number: 18, name: "الكهف", startPage: 293, versesCount: 110, type: "مكية" },
  { number: 19, name: "مريم", startPage: 305, versesCount: 98, type: "مكية" },
  { number: 20, name: "طه", startPage: 312, versesCount: 135, type: "مكية" },
  { number: 21, name: "الأنبياء", startPage: 322, versesCount: 112, type: "مكية" },
  { number: 22, name: "الحج", startPage: 332, versesCount: 78, type: "مدنية" },
  { number: 23, name: "المؤمنون", startPage: 342, versesCount: 118, type: "مكية" },
  { number: 24, name: "النور", startPage: 350, versesCount: 64, type: "مدنية" },
  { number: 25, name: "الفرقان", startPage: 359, versesCount: 77, type: "مكية" },
  { number: 26, name: "الشعراء", startPage: 367, versesCount: 227, type: "مكية" },
  { number: 27, name: "النمل", startPage: 377, versesCount: 93, type: "مكية" },
  { number: 28, name: "القصص", startPage: 385, versesCount: 88, type: "مكية" },
  { number: 29, name: "العنكبوت", startPage: 396, versesCount: 69, type: "مكية" },
  { number: 30, name: "الروم", startPage: 404, versesCount: 60, type: "مكية" },
  { number: 31, name: "لقمان", startPage: 411, versesCount: 34, type: "مكية" },
  { number: 32, name: "السجدة", startPage: 415, versesCount: 30, type: "مكية" },
  { number: 33, name: "الأحزاب", startPage: 418, versesCount: 73, type: "مدنية" },
  { number: 34, name: "سبأ", startPage: 428, versesCount: 54, type: "مكية" },
  { number: 35, name: "فاطر", startPage: 434, versesCount: 45, type: "مكية" },
  { number: 36, name: "يس", startPage: 440, versesCount: 83, type: "مكية" },
  { number: 37, name: "الصافات", startPage: 446, versesCount: 182, type: "مكية" },
  { number: 38, name: "ص", startPage: 453, versesCount: 88, type: "مكية" },
  { number: 39, name: "الزمر", startPage: 458, versesCount: 75, type: "مكية" },
  { number: 40, name: "غافر", startPage: 467, versesCount: 85, type: "مكية" },
  { number: 41, name: "فصلت", startPage: 477, versesCount: 54, type: "مكية" },
  { number: 42, name: "الشورى", startPage: 483, versesCount: 53, type: "مكية" },
  { number: 43, name: "الزخرف", startPage: 489, versesCount: 89, type: "مكية" },
  { number: 44, name: "الدخان", startPage: 496, versesCount: 59, type: "مكية" },
  { number: 45, name: "الجاثية", startPage: 499, versesCount: 37, type: "مكية" },
  { number: 46, name: "الأحقاف", startPage: 502, versesCount: 35, type: "مكية" },
  { number: 47, name: "محمد", startPage: 507, versesCount: 38, type: "مدنية" },
  { number: 48, name: "الفتح", startPage: 511, versesCount: 29, type: "مدنية" },
  { number: 49, name: "الحجرات", startPage: 515, versesCount: 18, type: "مدنية" },
  { number: 50, name: "ق", startPage: 518, versesCount: 45, type: "مكية" },
  { number: 51, name: "الذاريات", startPage: 520, versesCount: 60, type: "مكية" },
  { number: 52, name: "الطور", startPage: 523, versesCount: 49, type: "مكية" },
  { number: 53, name: "النجم", startPage: 526, versesCount: 62, type: "مكية" },
  { number: 54, name: "القمر", startPage: 528, versesCount: 55, type: "مكية" },
  { number: 55, name: "الرحمن", startPage: 531, versesCount: 78, type: "مدنية" },
  { number: 56, name: "الواقعة", startPage: 534, versesCount: 96, type: "مكية" },
  { number: 57, name: "الحديد", startPage: 537, versesCount: 29, type: "مدنية" },
  { number: 58, name: "المجادلة", startPage: 542, versesCount: 22, type: "مدنية" },
  { number: 59, name: "الحشر", startPage: 545, versesCount: 24, type: "مدنية" },
  { number: 60, name: "الممتحنة", startPage: 549, versesCount: 13, type: "مدنية" },
  { number: 61, name: "الصف", startPage: 551, versesCount: 14, type: "مدنية" },
  { number: 62, name: "الجمعة", startPage: 553, versesCount: 11, type: "مدنية" },
  { number: 63, name: "المنافقون", startPage: 554, versesCount: 11, type: "مدنية" },
  { number: 64, name: "التغابن", startPage: 556, versesCount: 18, type: "مدنية" },
  { number: 65, name: "الطلاق", startPage: 558, versesCount: 12, type: "مدنية" },
  { number: 66, name: "التحريم", startPage: 560, versesCount: 12, type: "مدنية" },
  { number: 67, name: "الملك", startPage: 562, versesCount: 30, type: "مكية" },
  { number: 68, name: "القلم", startPage: 564, versesCount: 52, type: "مكية" },
  { number: 69, name: "الحاقة", startPage: 566, versesCount: 52, type: "مكية" },
  { number: 70, name: "المعارج", startPage: 568, versesCount: 44, type: "مكية" },
  { number: 71, name: "نوح", startPage: 570, versesCount: 28, type: "مكية" },
  { number: 72, name: "الجن", startPage: 572, versesCount: 28, type: "مكية" },
  { number: 73, name: "المزمل", startPage: 574, versesCount: 20, type: "مكية" },
  { number: 74, name: "المدثر", startPage: 575, versesCount: 56, type: "مكية" },
  { number: 75, name: "القيامة", startPage: 577, versesCount: 40, type: "مكية" },
  { number: 76, name: "الإنسان", startPage: 578, versesCount: 31, type: "مدنية" },
  { number: 77, name: "المرسلات", startPage: 580, versesCount: 50, type: "مكية" },
  { number: 78, name: "النبأ", startPage: 582, versesCount: 40, type: "مكية" },
  { number: 79, name: "النازعات", startPage: 583, versesCount: 46, type: "مكية" },
  { number: 80, name: "عبس", startPage: 585, versesCount: 42, type: "مكية" },
  { number: 81, name: "التكوير", startPage: 586, versesCount: 29, type: "مكية" },
  { number: 82, name: "الانفطار", startPage: 587, versesCount: 19, type: "مكية" },
  { number: 83, name: "المطففين", startPage: 587, versesCount: 36, type: "مكية" },
  { number: 84, name: "الانشقاق", startPage: 589, versesCount: 25, type: "مكية" },
  { number: 85, name: "البروج", startPage: 590, versesCount: 22, type: "مكية" },
  { number: 86, name: "الطارق", startPage: 591, versesCount: 17, type: "مكية" },
  { number: 87, name: "الأعلى", startPage: 591, versesCount: 19, type: "مكية" },
  { number: 88, name: "الغاشية", startPage: 592, versesCount: 26, type: "مكية" },
  { number: 89, name: "الفجر", startPage: 593, versesCount: 30, type: "مكية" },
  { number: 90, name: "البلد", startPage: 594, versesCount: 20, type: "مكية" },
  { number: 91, name: "الشمس", startPage: 595, versesCount: 15, type: "مكية" },
  { number: 92, name: "الليل", startPage: 595, versesCount: 21, type: "مكية" },
  { number: 93, name: "الضحى", startPage: 596, versesCount: 11, type: "مكية" },
  { number: 94, name: "الشرح", startPage: 596, versesCount: 8, type: "مكية" },
  { number: 95, name: "التين", startPage: 597, versesCount: 8, type: "مكية" },
  { number: 96, name: "العلق", startPage: 597, versesCount: 19, type: "مكية" },
  { number: 97, name: "القدر", startPage: 598, versesCount: 5, type: "مكية" },
  { number: 98, name: "البينة", startPage: 598, versesCount: 8, type: "مدنية" },
  { number: 99, name: "الزلزلة", startPage: 599, versesCount: 8, type: "مدنية" },
  { number: 100, name: "العاديات", startPage: 599, versesCount: 11, type: "مكية" },
  { number: 101, name: "القارعة", startPage: 600, versesCount: 11, type: "مكية" },
  { number: 102, name: "التكاثر", startPage: 600, versesCount: 8, type: "مكية" },
  { number: 103, name: "العصر", startPage: 601, versesCount: 3, type: "مكية" },
  { number: 104, name: "الهمزة", startPage: 601, versesCount: 9, type: "مكية" },
  { number: 105, name: "الفيل", startPage: 601, versesCount: 5, type: "مكية" },
  { number: 106, name: "قريش", startPage: 602, versesCount: 4, type: "مكية" },
  { number: 107, name: "الماعون", startPage: 602, versesCount: 7, type: "مكية" },
  { number: 108, name: "الكوثر", startPage: 602, versesCount: 3, type: "مكية" },
  { number: 109, name: "الكافرون", startPage: 603, versesCount: 6, type: "مكية" },
  { number: 110, name: "النصر", startPage: 603, versesCount: 3, type: "مدنية" },
  { number: 111, name: "المسد", startPage: 603, versesCount: 5, type: "مكية" },
  { number: 112, name: "الإخلاص", startPage: 604, versesCount: 4, type: "مكية" },
  { number: 113, name: "الفلق", startPage: 604, versesCount: 5, type: "مكية" },
  { number: 114, name: "الناس", startPage: 604, versesCount: 6, type: "مكية" }
];

// توليد المصفوفات التلقائية للأجزاء والأحزاب والصفحات بناءً على أرقام الصفحات المتعارف عليها بالمصحف الشريف
export const JUZZES: QuranIndexItem[] = Array.from({ length: 30 }).map((_, i) => {
  const juzPages = [1, 22, 42, 62, 82, 102, 122, 142, 162, 182, 202, 222, 242, 262, 282, 302, 322, 342, 362, 382, 402, 422, 442, 462, 482, 502, 522, 542, 562, 582];
  return { number: i + 1, name: `الجزء ${i + 1}`, page: juzPages[i] };
});

export const HIZBS: QuranIndexItem[] = Array.from({ length: 60 }).map((_, i) => {
  return { number: i + 1, name: `الحزب ${i + 1}`, page: Math.round(i * 10.06) + 1 };
});

export const PAGES: QuranIndexItem[] = Array.from({ length: 604 }).map((_, i) => {
  return { number: i + 1, name: `صفحة ${i + 1}`, page: i + 1 };
});