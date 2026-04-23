import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topic, subject, grade, difficulty, count, questionTypes, extraInstructions } = body;

    if (!topic?.trim()) {
      return NextResponse.json({ error: 'topic is required' }, { status: 400 });
    }

    const difficultyMap: Record<string, string> = {
      easy: 'سهل — مناسب للطلاب الأضعف أو للمراجعة السريعة',
      medium: 'متوسط — يناسب المستوى الأساسي للصف',
      hard: 'صعب — يتحدى الطلاب المتميزين ويتطلب تفكيرًا عميقًا',
    };

    const typesDesc = (questionTypes as string[])
      .map((t: string) => ({ mcq: 'اختيار من متعدد (4 خيارات)', true_false: 'صح / خطأ (خياران)', fill_blank: 'أكمل الفراغ (إجابة نصية واحدة)' }[t]))
      .filter(Boolean)
      .join('، ');

    const prompt = `أنت خبير تربوي متخصص في بناء الاختبارات الإلكترونية للمناهج العربية.

**المطلوب:** توليد ${count} سؤال تعليمي عن: **${topic}**

**معلومات:**
- المادة: ${subject}
- الصف: ${grade}
- المستوى: ${difficultyMap[difficulty] ?? difficulty}
- أنواع الأسئلة المطلوبة: ${typesDesc}
${extraInstructions ? `- تعليمات إضافية: ${extraInstructions}` : ''}

**تعليمات مهمة:**
1. وزّع الأسئلة على الأنواع المطلوبة بشكل متوازن
2. اجعل الأسئلة واضحة وباللغة العربية الفصحى
3. تأكد أن كل سؤال له إجابة صحيحة واحدة فقط (إلا إذا طُلب غير ذلك)
4. للأسئلة من نوع mcq: اجعل الخيارات الخاطئة معقولة (لا تكون واضحة الخطأ)
5. للأسئلة من نوع true_false: اجعلها تتطلب فهمًا لا مجرد تخمين

**أعد JSON فقط، بدون أي نص آخر، بهذا الشكل:**
{
  "questions": [
    {
      "question_text": "نص السؤال",
      "question_type": "mcq" | "true_false" | "fill_blank",
      "time_limit": 20 | 30 | 45 | 60,
      "points": 500 | 1000 | 1500 | 2000,
      "speed_bonus": true | false,
      "explanation": "شرح مختصر للإجابة الصحيحة (اختياري)",
      "choices": [
        { "choice_text": "نص الخيار", "is_correct": true | false }
      ]
    }
  ]
}

- لـ mcq: 4 خيارات (واحد صحيح)
- لـ true_false: خياران: "صح" (is_correct بناءً على المحتوى) و"خطأ"
- لـ fill_blank: خيار واحد is_correct=true يحتوي الإجابة النموذجية
- time_limit: 20 للسهل، 30 للمتوسط، 45-60 للصعب
- points: 500 للسهل، 1000 للمتوسط، 1500-2000 للصعب`;

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });

    const rawText = message.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; text: string }).text)
      .join('');

    // Strip potential markdown fences
    const jsonStr = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();

    const parsed = JSON.parse(jsonStr);

    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      throw new Error('Invalid response structure from AI');
    }

    return NextResponse.json(parsed);
  } catch (err: unknown) {
    console.error('Generate API error:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
