# 🎯 QuizArena — منصة المسابقات التفاعلية

منصة تعليمية شبيهة بـ Wordwall و Kahoot، مصممة خصيصًا للمعلمين والطلاب العرب.

---

## 📊 حالة المشروع

هذا مشروع **قيد البناء**. تم إنجاز البنية التحتية والمرحلة 1 والنصف الأول من المرحلة 2 (2أ).

### 🎯 تم إنجازه في المرحلة 2أ (الجلسة الحالية):
- ✅ `components/teacher/TimePicker.tsx` — منتقي وقت (6 خيارات سريعة + إدخال مخصص)
- ✅ `components/teacher/ChoiceEditor.tsx` — محرر خيارات (إضافة/حذف/تحديد الصحيحة)
- ✅ `components/teacher/QuestionBuilder.tsx` — محرر سؤال شامل (يدمج TimePicker + ChoiceEditor)
- ✅ `app/(teacher)/dashboard/page.tsx` — لوحة المعلم (إحصائيات + بحث + فلاتر + إنشاء/حذف)

### ⏳ ما تبقى في المرحلة 2ب:
- `app/(teacher)/builder/[id]/page.tsx` — محرر النشاط الكامل (يستخدم QuestionBuilder)
- `app/(teacher)/generator/page.tsx` — مولّد أسئلة بـ Claude API
- `app/(teacher)/host/[sessionId]/page.tsx` — شاشة تحكم المعلم
- `components/teacher/HostControls.tsx` — أزرار تحكم الجلسة

---

## ✅ ما تم إنجازه

### 1. البنية الأساسية (Foundation)
- [x] إعدادات Next.js 15 + TypeScript + Tailwind كاملة
- [x] دعم RTL واللغة العربية
- [x] خطوط Cairo, Tajawal, Space Grotesk مهيّأة
- [x] نظام ألوان موحّد في CSS variables + Tailwind tokens

### 2. قاعدة البيانات
- [x] Schema كامل بـ PostgreSQL في `supabase/migrations/20250101_initial_schema.sql`
- [x] 10 جداول (users, activities, questions, choices, live_sessions, participants, answers, results, leaderboard_cache)
- [x] Triggers تلقائية للترتيب
- [x] Views للتقارير (أصعب الأسئلة، أداء الطلاب)
- [x] Row Level Security
- [x] Realtime channels مفعّلة

### 3. Core Libraries
- [x] `lib/supabase/client.ts` — Supabase browser client
- [x] `lib/supabase/server.ts` — Supabase server client
- [x] `lib/supabase/types.ts` — TypeScript types لكل جداول DB
- [x] `lib/sound/engine.ts` — محرك صوت Web Audio API (tick, correct, wrong, winner)
- [x] `lib/scoring.ts` — محرك احتساب النقاط (مع مكافأة السرعة)
- [x] `lib/utils.ts` — دوال مساعدة (كود الجلسة، ألوان، confetti، تنسيق الوقت)

### 4. React Hooks
- [x] `hooks/useTimer.ts` — عدّاد تنازلي مع صوت tick عند آخر 5 ثواني
- [x] `hooks/useSound.ts` — إدارة الصوت
- [x] `hooks/useLiveSession.ts` — Realtime subscription للجلسة

### 5. Components
- [x] `components/shared/Navbar.tsx`
- [x] `components/shared/SoundToggle.tsx`
- [x] `components/shared/TimerRing.tsx` ← أُضيف في المرحلة 1
- [x] `components/shared/Leaderboard.tsx` ← أُضيف في المرحلة 1
- [x] `components/shared/Podium.tsx` ← أُضيف في المرحلة 1
- [x] `components/shared/QRCode.tsx` ← أُضيف في المرحلة 1

### 6. Prototypes (HTML مستقلة تعمل فورًا في المتصفح)
- [x] `prototypes/quiz-platform.html` — منصة كاملة (معلم + طالب + نتائج)
- [x] `prototypes/question-types.html` — 8 أنواع أسئلة تفاعلية
- [x] `prototypes/question-generator.html` — مولّد أسئلة ذكي بـ Claude API

### 7. Documentation
- [x] `documentation/SETUP.md` — دليل التثبيت
- [x] `documentation/MVP_PLAN.md` — خطة 6 أسابيع للـ MVP

---

## ⏳ ما لم يكتمل بعد

### صفحات التطبيق (Pages)
- [x] `app/page.tsx` — الصفحة الرئيسية (Landing) ← أُضيف في المرحلة 1
- [x] `app/(auth)/layout.tsx` — تخطيط صفحات المصادقة ← أُضيف في المرحلة 1
- [x] `app/(auth)/login/page.tsx` — تسجيل الدخول ← أُضيف في المرحلة 1
- [x] `app/(auth)/register/page.tsx` — التسجيل ← أُضيف في المرحلة 1
- [x] `app/(teacher)/dashboard/page.tsx` — لوحة المعلم ← **المرحلة 2أ ✅**
- [ ] `app/(teacher)/builder/[id]/page.tsx` — محرر الأسئلة (المرحلة 2ب)
- [ ] `app/(teacher)/generator/page.tsx` — مولّد الأسئلة الذكي (المرحلة 2ب)
- [ ] `app/(teacher)/host/[sessionId]/page.tsx` — شاشة تحكم المعلم (المرحلة 2ب)
- [ ] `app/(student)/join/page.tsx` — دخول الطالب بالكود (المرحلة 3)
- [ ] `app/(student)/play/[sessionId]/page.tsx` — شاشة اللعب (المرحلة 3)

### مكونات (Components)
- [x] `components/shared/SoundToggle.tsx` ← جاهز
- [x] `components/shared/TimerRing.tsx` ← المرحلة 1
- [x] `components/shared/Leaderboard.tsx` ← المرحلة 1
- [x] `components/shared/Podium.tsx` ← المرحلة 1
- [x] `components/shared/QRCode.tsx` ← المرحلة 1
- [x] `components/teacher/QuestionBuilder.tsx` ← **المرحلة 2أ ✅**
- [x] `components/teacher/TimePicker.tsx` ← **المرحلة 2أ ✅**
- [x] `components/teacher/ChoiceEditor.tsx` ← **المرحلة 2أ ✅**
- [ ] `components/teacher/HostControls.tsx` (المرحلة 2ب)
- [ ] `components/student/AnswerGrid.tsx` (المرحلة 3)
- [ ] `components/student/FeedbackCard.tsx` (المرحلة 3)

### API Routes
- [ ] `app/api/sessions/route.ts` — إنشاء جلسة
- [ ] `app/api/sessions/[id]/start/route.ts` — بدء الجلسة
- [ ] `app/api/sessions/[id]/next/route.ts` — السؤال التالي
- [ ] `app/api/answers/route.ts` — استقبال إجابة + حساب النقاط
- [ ] `app/api/generate/route.ts` — توليد أسئلة بـ Claude (ينادي Anthropic API)

### أخرى
- [ ] `middleware.ts` — حماية مسارات المعلم
- [ ] `.gitignore`
- [ ] أيقونة favicon

---

## 🚀 كيف تكمل البناء

في محادثة جديدة مع Claude، ارفع ملف المشروع هذا واكتب:

> "أكمل بناء المشروع. اقرأ README.md لترى ما تم إنجازه وما المتبقي، ثم ابدأ ببناء الصفحات والمكونات المطلوبة."

Claude سيتمكن من:
1. قراءة كل الملفات الموجودة لفهم السياق
2. إكمال الصفحات والمكونات المتبقية
3. تسليم النتيجة كـ zip محدّث

---

## 📂 هيكل المشروع

```
quizarena/
├── app/                           # Next.js App Router
│   ├── (auth)/                    # صفحات المصادقة
│   ├── (teacher)/                 # صفحات المعلم
│   ├── (student)/                 # صفحات الطالب
│   ├── api/                       # API routes
│   ├── globals.css                ✅ موجود
│   └── layout.tsx                 ✅ موجود
├── components/
│   ├── shared/Navbar.tsx          ✅ موجود
│   ├── teacher/                   ⏳ فارغ
│   ├── student/                   ⏳ فارغ
│   └── ui/                        ⏳ فارغ
├── hooks/
│   ├── useTimer.ts                ✅ موجود
│   ├── useSound.ts                ✅ موجود
│   └── useLiveSession.ts          ✅ موجود
├── lib/
│   ├── supabase/                  ✅ كامل
│   ├── sound/engine.ts            ✅ موجود
│   ├── scoring.ts                 ✅ موجود
│   └── utils.ts                   ✅ موجود
├── supabase/
│   └── migrations/
│       └── 20250101_initial_schema.sql  ✅ موجود
├── prototypes/                    ✅ 3 ملفات HTML تجريبية
├── documentation/                 ✅ SETUP + MVP_PLAN
├── .env.example                   ✅ موجود
├── package.json                   ✅ موجود
├── tsconfig.json                  ✅ موجود
├── next.config.js                 ✅ موجود
├── tailwind.config.ts             ✅ موجود
└── postcss.config.js              ✅ موجود
```

---

## 💻 التشغيل المحلي (عندما يكتمل)

```bash
# 1. تثبيت التبعيات
npm install

# 2. إعداد البيئة
cp .env.example .env.local
# املأ قيم Supabase في .env.local

# 3. تشغيل migration على Supabase
# انسخ محتوى supabase/migrations/20250101_initial_schema.sql
# والصقه في SQL Editor على لوحة Supabase

# 4. تشغيل المشروع
npm run dev
# افتح http://localhost:3000
```

---

## 🎨 هوية التصميم

- **الخلفية:** داكنة `#0B0B1E` مع تدرجات purple/pink
- **الألوان الرئيسية:** Pink `#FF3366` — Green `#00E676` — Yellow `#FFD700`
- **الخطوط:** Cairo (عناوين) + Tajawal (نصوص) + Space Grotesk (أرقام)
- **الحركة:** عدّاد نابض، وميض أحمر عند آخر 5 ثوانٍ، confetti عند الفوز
- **الأصوات:** مولّدة برمجيًا (لا ملفات خارجية)

---

## 🔐 للمؤلف (أستاذ علاء)

المدرسة: مدرسة سمو الشيخ محمد بن خليفة — قسم العلوم
المرحلة المستهدفة: الصف الثاني الإعدادي
