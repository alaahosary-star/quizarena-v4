# 🚀 QuizArena — Next.js + Supabase Setup Guide

دليل بناء المنصة الحقيقية من الصفر. كل الأوامر والملفات جاهزة للنسخ.

---

## 📁 هيكل المشروع

```
quizarena/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (teacher)/
│   │   ├── dashboard/page.tsx          # لوحة المعلم الرئيسية
│   │   ├── activities/
│   │   │   ├── page.tsx                # قائمة الأنشطة
│   │   │   ├── new/page.tsx            # نشاط جديد
│   │   │   └── [id]/edit/page.tsx      # تعديل نشاط + إدارة الأسئلة
│   │   ├── host/[sessionId]/page.tsx   # شاشة التحكم أثناء اللعب
│   │   └── reports/[sessionId]/page.tsx
│   ├── (student)/
│   │   ├── join/page.tsx               # إدخال الكود
│   │   └── play/[sessionId]/page.tsx   # شاشة اللعب
│   ├── api/
│   │   ├── sessions/route.ts           # POST create session
│   │   ├── sessions/[id]/start/route.ts
│   │   ├── answers/route.ts            # POST submit answer
│   │   └── leaderboard/[sessionId]/route.ts
│   ├── layout.tsx
│   ├── globals.css
│   └── page.tsx                        # الصفحة الرئيسية
├── components/
│   ├── ui/                             # shadcn components
│   ├── teacher/
│   │   ├── QuestionBuilder.tsx
│   │   ├── TimePicker.tsx
│   │   ├── ChoiceEditor.tsx
│   │   └── HostControls.tsx
│   ├── student/
│   │   ├── AnswerGrid.tsx
│   │   ├── TimerRing.tsx
│   │   └── FeedbackCard.tsx
│   ├── shared/
│   │   ├── Leaderboard.tsx
│   │   ├── Podium.tsx
│   │   ├── QRCode.tsx
│   │   └── Confetti.tsx
│   └── layout/
│       ├── Navbar.tsx
│       └── SoundToggle.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts                   # client-side
│   │   ├── server.ts                   # server-side
│   │   └── types.ts                    # generated types
│   ├── sound/
│   │   ├── engine.ts                   # Web Audio engine
│   │   └── howler.ts                   # background music
│   ├── realtime/
│   │   └── channels.ts                 # Supabase channels
│   ├── scoring.ts                      # حساب النقاط
│   └── utils.ts
├── hooks/
│   ├── useSession.ts                   # realtime session state
│   ├── useTimer.ts                     # عدّاد تنازلي
│   ├── useSound.ts                     # صوت
│   └── useLeaderboard.ts               # ترتيب لحظي
├── styles/
│   └── fonts.ts                        # Cairo + Tajawal
├── supabase/
│   ├── migrations/
│   │   └── 20250101_initial_schema.sql # انسخ محتوى schema.sql هنا
│   └── seed.sql                        # بيانات تجريبية
├── public/
│   └── sounds/                         # إذا رغبت بموسيقى خلفية
├── middleware.ts                       # حماية المسارات
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 1️⃣ إنشاء المشروع

```bash
npx create-next-app@latest quizarena --typescript --tailwind --app --src-dir=false
cd quizarena

# حزم أساسية
npm install @supabase/supabase-js @supabase/ssr
npm install howler qrcode.react
npm install framer-motion lucide-react
npm install canvas-confetti
npm install zustand                 # state management
npm install react-hook-form zod
npm install -D @types/howler @types/canvas-confetti
```

---

## 2️⃣ إعداد Supabase

### أ) أنشئ مشروع على https://supabase.com

### ب) أضف متغيرات البيئة `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...   # لـ server actions فقط
```

### ج) شغّل Schema في SQL Editor:
انسخ محتوى `schema.sql` بالكامل إلى Supabase SQL Editor وشغّله.

---

## 3️⃣ ملفات البداية الأساسية

### `lib/supabase/client.ts`
```ts
import { createBrowserClient } from '@supabase/ssr'

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
```

### `lib/supabase/server.ts`
```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const createClient = async () => {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => list.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options))
      }
    }
  )
}
```

### `lib/scoring.ts` (محرك احتساب النقاط)
```ts
export interface ScoringInput {
  isCorrect: boolean
  basePoints: number
  timeTakenMs: number
  timeLimit: number      // seconds
  speedBonus: boolean
}

export function calculateScore(input: ScoringInput): {
  total: number
  base: number
  bonus: number
} {
  if (!input.isCorrect) return { total: 0, base: 0, bonus: 0 }

  const timeUsedRatio = Math.min(input.timeTakenMs / (input.timeLimit * 1000), 1)
  const speedMultiplier = 1 - (timeUsedRatio * 0.5) // 50% max penalty for slow
  const base = Math.round(input.basePoints * speedMultiplier)
  const bonus = input.speedBonus
    ? Math.round(input.basePoints * 0.5 * (1 - timeUsedRatio))
    : 0

  return { total: base + bonus, base, bonus }
}
```

### `lib/sound/engine.ts` (محرك الصوت)
```ts
class SoundEngine {
  private ctx: AudioContext | null = null
  public muted = false

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
    return this.ctx
  }

  private tone(freq: number, dur = 0.15, type: OscillatorType = 'sine', vol = 0.2) {
    if (this.muted) return
    const ctx = this.init()
    if (!ctx) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    gain.gain.value = vol
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur)
    osc.connect(gain); gain.connect(ctx.destination)
    osc.start(); osc.stop(ctx.currentTime + dur)
  }

  click()   { this.tone(800, 0.06, 'square', 0.12) }
  select()  { this.tone(600, 0.10, 'sine', 0.15) }
  tick()    { this.tone(1200, 0.05, 'square', 0.1) }
  correct() {
    this.tone(523.25, 0.12); setTimeout(() => this.tone(659.25, 0.12), 120)
    setTimeout(() => this.tone(783.99, 0.2), 240)
  }
  wrong() {
    this.tone(220, 0.15, 'sawtooth')
    setTimeout(() => this.tone(180, 0.25, 'sawtooth'), 150)
  }
  winner() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5]
    notes.forEach((n, i) => setTimeout(() => this.tone(n, 0.18, 'triangle', 0.25), i * 140))
  }
  toggle() { this.muted = !this.muted; return this.muted }
}

export const sfx = new SoundEngine()
```

### `hooks/useTimer.ts` (عدّاد قابل لإعادة الاستخدام)
```ts
import { useState, useEffect, useRef } from 'react'
import { sfx } from '@/lib/sound/engine'

export function useTimer(totalSeconds: number, onEnd: () => void) {
  const [left, setLeft] = useState(totalSeconds)
  const [running, setRunning] = useState(false)
  const ref = useRef<NodeJS.Timeout | null>(null)

  const start = () => {
    setLeft(totalSeconds); setRunning(true)
  }
  const stop = () => {
    if (ref.current) clearInterval(ref.current)
    setRunning(false)
  }

  useEffect(() => {
    if (!running) return
    ref.current = setInterval(() => {
      setLeft(prev => {
        const next = prev - 1
        if (next <= 5 && next > 0) sfx.tick()
        if (next <= 0) { stop(); onEnd(); return 0 }
        return next
      })
    }, 1000)
    return () => { if (ref.current) clearInterval(ref.current) }
  }, [running])

  return {
    left,
    running,
    start,
    stop,
    phase: left <= 5 ? 'danger' : left <= 10 ? 'warning' : 'ok',
    percent: left / totalSeconds
  }
}
```

### `hooks/useSession.ts` (Realtime session)
```ts
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useLiveSession(sessionId: string) {
  const [session, setSession] = useState<any>(null)
  const [participants, setParticipants] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    // Initial fetch
    supabase.from('live_sessions').select('*').eq('id', sessionId).single()
      .then(({ data }) => setSession(data))
    supabase.from('participants').select('*').eq('session_id', sessionId)
      .then(({ data }) => setParticipants(data || []))

    // Subscribe to changes
    const channel = supabase.channel(`session:${sessionId}`)
      .on('postgres_changes',
          { event: '*', schema: 'public', table: 'live_sessions', filter: `id=eq.${sessionId}` },
          (payload) => setSession(payload.new))
      .on('postgres_changes',
          { event: '*', schema: 'public', table: 'participants', filter: `session_id=eq.${sessionId}` },
          () => {
            supabase.from('participants').select('*').eq('session_id', sessionId)
              .order('total_score', { ascending: false })
              .then(({ data }) => setParticipants(data || []))
          })
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [sessionId])

  return { session, participants }
}
```

### `app/api/answers/route.ts` (معالجة الإجابة)
```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { calculateScore } from '@/lib/scoring'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { session_id, participant_id, question_id, choice_id, time_taken_ms } = body

  const supabase = await createClient()

  // Fetch question + choices
  const { data: question } = await supabase
    .from('questions')
    .select('*, choices(*)')
    .eq('id', question_id)
    .single()

  if (!question) return NextResponse.json({ error: 'Question not found' }, { status: 404 })

  const chosen = question.choices.find((c: any) => c.id === choice_id)
  const isCorrect = chosen?.is_correct || false

  const { total, base, bonus } = calculateScore({
    isCorrect,
    basePoints: question.points,
    timeTakenMs: time_taken_ms,
    timeLimit: question.time_limit,
    speedBonus: question.speed_bonus
  })

  const { data: answer } = await supabase.from('answers').insert({
    session_id, participant_id, question_id, choice_id,
    is_correct: isCorrect,
    time_taken_ms,
    points_earned: total,
    speed_bonus: bonus
  }).select().single()

  return NextResponse.json({ answer, score: { total, base, bonus }, isCorrect })
}
```

### `middleware.ts` (حماية المسارات)
```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => list.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options))
      }
    }
  )
  const { data: { user } } = await supabase.auth.getUser()

  if (!user && request.nextUrl.pathname.startsWith('/teacher')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  return response
}

export const config = {
  matcher: ['/teacher/:path*', '/api/:path*']
}
```

---

## 4️⃣ التشغيل

```bash
npm run dev
# افتح http://localhost:3000
```

---

## 5️⃣ نشر على Vercel

```bash
vercel deploy
# أضف متغيرات البيئة في لوحة Vercel
```
