const bcrypt = require('bcrypt');

// --- ใส่รหัสผ่านที่ต้องการสร้าง hash ตรงนี้ ---
const myPassword = 'YourSecurePasswordHere123!';
const saltRounds = 10; // ค่ามาตรฐาน

bcrypt.hash(myPassword, saltRounds, function (err, hash) {
    if (err) {
        console.error("เกิดข้อผิดพลาดในการเข้ารหัส:", err);
        return;
    }
    console.log("Bcrypt Hash ของคุณคือ (คัดลอกบรรทัดถัดไป):");
    console.log(hash);
});