import { NextResponse } from 'next/server';
import { geminiService } from '@/lib/services/geminiService';
import { createErrorResponse } from '@/lib/utils/normalize';
import { UserStory } from '@/lib/db/schema';

const SUGGEST_NEW_FEATURES_PROMPT = `
คุณคือ Product Manager ที่มีความเชี่ยวชาญสูง
จากคำอธิบายโปรเจกต์ (Project Description) และ User Stories ที่มีอยู่แล้วด้านล่างนี้
ให้ช่วยคิด User Stories ใหม่ๆ เพิ่มเติมที่น่าจะเป็นประโยชน์กับโปรเจกต์นี้

**สำคัญมาก:**
1.  **ห้าม** แนะนำ Story ที่มีอยู่แล้ว หรือมีความหมายคล้ายคลึงกับของเดิม
2.  แต่ละ Story ต้องอยู่ในรูปแบบ "ในฐานะ [ประเภทผู้ใช้] ฉันต้องการ [การกระทำ] เพื่อที่ฉันจะ [ได้รับประโยชน์]"
3.  ช่วยคิดชื่อฟีเจอร์ (featureName) ที่สั้นกระชับเป็นภาษาไทยสำหรับแต่ละ Story
4.  ตอบกลับเป็น JSON object ที่มีคีย์ "stories" ซึ่งเป็น array ของ object ที่มี "featureName" และ "storyText"

---
**Project Description:**
`;

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { projectDescription, existingStories } = body as { projectDescription: string, existingStories: UserStory[] };

        if (!projectDescription) {
            return NextResponse.json({ error: 'projectDescription is required.' }, { status: 400 });
        }

        const existingStoriesText = (existingStories || [])
            .map(s => `- ${s.feature_name}: ${s.story_text}`)
            .join('\\n');

        const fullPrompt = `${SUGGEST_NEW_FEATURES_PROMPT}${projectDescription}\\n\\n---
**User Stories ที่มีอยู่แล้ว (ห้ามแนะนำซ้ำ):**\\n${existingStoriesText}`;

        const result = await geminiService.generateStories(fullPrompt, ''); // projectDescription is already in the prompt
        return NextResponse.json(result);
    } catch (error: unknown) {
        return createErrorResponse(error, 'POST /api/suggest-features');
    }
}
