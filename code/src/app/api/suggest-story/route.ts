import { NextResponse } from 'next/server';
import { geminiService } from '@/lib/services/geminiService';
import { createErrorResponse } from '@/lib/utils/normalize';

const SUGGEST_STORY_PROMPT = `จากคำอธิบาย task ต่อไปนี้ ให้ช่วยแปลงเป็น User Story ที่สมบูรณ์ในรูปแบบ "ในฐานะ [ประเภทผู้ใช้] ฉันต้องการ [การกระทำ] เพื่อที่ฉันจะ [ได้รับประโยชน์]" และช่วยคิดชื่อฟีเจอร์ (feature name) ที่สั้นกระชับเป็นภาษาไทยสำหรับ User Story นี้

ให้ตอบกลับเป็น JSON object ที่ถูกต้อง โดยมีสองคีย์คือ "featureName" (string) และ "storyText" (string)

ตัวอย่างผลลัพธ์:
{
  "featureName": "การแสดงผลโปรไฟล์",
  "storyText": "ในฐานะผู้ใช้ ฉันต้องการดูหน้าโปรไฟล์ของฉัน เพื่อที่ฉันจะสามารถแก้ไขข้อมูลส่วนตัวได้"
}

คำอธิบาย Task:
---
`;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { taskDescription } = body;

        if (!taskDescription) {
            return NextResponse.json({ error: 'taskDescription is required.' }, { status: 400 });
        }

        // Note: The method in geminiService for this is generateStories, which is generic enough.
        // We are just passing a different prompt.
        const result = await geminiService.generateStories(SUGGEST_STORY_PROMPT, taskDescription);
        return NextResponse.json(result);

    } catch (error: unknown) {
        return createErrorResponse(error, 'POST /api/suggest-story');
    }
}
