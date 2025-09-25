import { NextResponse } from 'next/server';
import { geminiService } from '@/lib/services/geminiService';
import { createErrorResponse } from '@/lib/utils/normalize';

const USER_STORY_PROMPT = `จากคำอธิบายโปรเจกต์ต่อไปนี้ ให้สร้างรายการ User Story ที่เป็นไปได้ 5-7 เรื่อง โดยแต่ละเรื่องจะต้องมีชื่อฟีเจอร์ (feature name) ที่สั้น กระชับ มีความเฉพาะเจาะจงเป็นภาษาไทย และไม่ซ้ำกัน
User Story แต่ละเรื่องต้องอยู่ในรูปแบบ "ในฐานะ [ประเภทผู้ใช้] ฉันต้องการ [การกระทำ] เพื่อที่ฉันจะ [ได้รับประโยชน์]"
ให้ตอบกลับเป็น JSON object ที่ถูกต้อง โดยมีคีย์เดียวคือ "stories" ซึ่งเป็นอาร์เรย์ของอ็อบเจกต์ โดยแต่ละอ็อบเจกต์จะมีสองคีย์คือ "featureName" (string) และ "storyText" (string)

ตัวอย่างผลลัพธ์:
{
  "stories": [
    {
      "featureName": "การลงทะเบียนผู้ใช้",
      "storyText": "ในฐานะผู้ใช้ ฉันต้องการสมัครสมาชิก เพื่อที่ฉันจะสามารถเข้าถึงเนื้อหาส่วนตัวได้"
    },
    {
      "featureName": "การเข้าสู่ระบบ",
      "storyText": "ในฐานะผู้ใช้ ฉันต้องการเข้าสู่ระบบด้วยอีเมลและรหัสผ่าน เพื่อที่ฉันจะสามารถเข้าถึงบัญชีของฉันได้"
    }
  ]
}

คำอธิบายโปรเจกต์:
---
`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectDescription } = body;

    if (!projectDescription) {
      return NextResponse.json({ error: 'projectDescription is required.' }, { status: 400 });
    }

    const result = await geminiService.generateStories(USER_STORY_PROMPT, projectDescription);
    return NextResponse.json(result);
  } catch (error: any) {
    return createErrorResponse(error, 'POST /api/generate-stories');
  }
}
