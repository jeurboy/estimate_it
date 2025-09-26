import { db } from '@/lib/db';
import { hash } from 'bcrypt';
import * as dotenv from 'dotenv';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

// โหลด environment variables จาก .env.local
dotenv.config({ path: '.env.local' });

async function main() {
    const superadminEmail = process.env.SUPERADMIN_EMAIL;
    const superadminPassword = process.env.SUPERADMIN_PASSWORD;

    if (!superadminEmail || !superadminPassword) {
        console.error('กรุณากำหนด SUPERADMIN_EMAIL และ SUPERADMIN_PASSWORD ในไฟล์ .env.local');
        process.exit(1);
    }

    console.log(`กำลังสร้าง Superadmin ด้วยอีเมล: ${superadminEmail}...`);

    try {
        // ตรวจสอบว่ามีผู้ใช้นี้อยู่แล้วหรือไม่ (Using Drizzle syntax)
        const existingUsers = await db.select({ id: users.id }).from(users).where(eq(users.email, superadminEmail));
        if (existingUsers.length > 0) {
            console.log('Superadmin ที่มีอีเมลนี้มีอยู่แล้วในระบบ');
            return;
        }

        // เข้ารหัสรหัสผ่าน
        const passwordHash = await hash(superadminPassword, 10);

        // เพิ่มผู้ใช้ลงในฐานข้อมูล (Using Drizzle syntax)
        await db.insert(users).values({
            email: superadminEmail,
            password_hash: passwordHash,
            role: 'superadmin',
        });

        console.log('✅ สร้าง Superadmin สำเร็จ!');
        console.log('👉 คุณสามารถล็อกอินด้วยอีเมลและรหัสผ่านที่กำหนดไว้ได้เลย');

    } catch (error) {
        console.error('เกิดข้อผิดพลาดระหว่างการสร้าง Superadmin:', error);
        process.exit(1);
    } finally {
        // ปิดการเชื่อมต่อฐานข้อมูลถ้าจำเป็น
        // await db.end();
    }
}

main();
