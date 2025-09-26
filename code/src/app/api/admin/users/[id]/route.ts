import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users, userRoleEnum } from '@/lib/db/schema';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { eq } from 'drizzle-orm';
import { hash } from 'bcrypt';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('Please define the JWT_SECRET environment variable inside .env.local');
}

const secret = new TextEncoder().encode(JWT_SECRET);

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
    const params = await context.params; // Await the params promise
    const userIdToUpdate = parseInt(params.id, 10);
    if (isNaN(userIdToUpdate)) {
        return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    // 1. ตรวจสอบสิทธิ์ผู้ที่ทำการร้องขอ (ต้องเป็น Superadmin)
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { payload: requestingUser } = await jwtVerify(token, secret);
        const requestingUserRole = requestingUser.role as string;
        const requestingUserOrgId = requestingUser.organization_id as string | undefined;
        if (requestingUser.role !== 'superadmin' && requestingUser.role !== 'admin') {
            return NextResponse.json({ error: 'You do not have permission to perform this action.' }, { status: 403 });
        }

        // 2. ป้องกัน Superadmin แก้ไขข้อมูลของตัวเองผ่าน API นี้
        if (requestingUser.userId === userIdToUpdate) {
            return NextResponse.json({ error: 'Cannot edit your own account via this endpoint.' }, { status: 403 });
        }

        const body = await request.json();
        const { password, role, organization_id } = body;

        if (!password && !role && organization_id === undefined) {
            return NextResponse.json({ error: 'At least one field (password, role, organization) must be provided.' }, { status: 400 });
        }

        // 3. ตรวจสอบว่าผู้ใช้ที่จะถูกแก้ไขเป็น superadmin หรือไม่
        const targetUsers = await db.select({ role: users.role, organization_id: users.organization_id }).from(users).where(eq(users.id, userIdToUpdate));
        if (targetUsers.length === 0) {
            return NextResponse.json({ error: 'User not found.' }, { status: 404 });
        }
        const targetUser = targetUsers[0];

        // 4. Admin ไม่สามารถแก้ไขข้อมูลของ Superadmin ได้
        if (requestingUserRole === 'admin' && targetUser.role === 'superadmin') {
            return NextResponse.json({ error: 'Admins cannot edit superadmin accounts.' }, { status: 403 });
        }

        // 4.1 Admin สามารถแก้ไขได้เฉพาะผู้ใช้ในองค์กรของตัวเอง
        if (requestingUserRole === 'admin' && targetUser.organization_id !== requestingUserOrgId) {
            return NextResponse.json({ error: 'You can only edit users within your own organization.' }, { status: 403 });
        }

        const valuesToUpdate: { password_hash?: string; role?: 'superadmin' | 'admin' | 'user'; organization_id?: string | null } = {};

        if (password) {
            valuesToUpdate.password_hash = await hash(password, 10);
        }

        if (role) {
            // Admin สามารถโปรโมต user เป็น superadmin ได้ แต่ไม่สามารถเปลี่ยน role อื่นๆ ได้
            if (requestingUserRole === 'admin' && role !== 'superadmin') {
                return NextResponse.json({ error: 'Admins can only promote users to superadmin.' }, { status: 403 });
            }
            if (!userRoleEnum.enumValues.includes(role)) { // Superadmin check
                return NextResponse.json({ error: 'Invalid role specified.' }, { status: 400 });
            }
            valuesToUpdate.role = role;
        }

        if (organization_id !== undefined) {
            if (requestingUserRole === 'admin' && organization_id !== requestingUserOrgId) {
                return NextResponse.json({ error: 'Admins cannot change a user\'s organization.' }, { status: 403 });
            }
            valuesToUpdate.organization_id = organization_id;
        }

        // 5. ทำการอัปเดตข้อมูลในฐานข้อมูล
        const updatedUsers = await db.update(users)
            .set(valuesToUpdate)
            .where(eq(users.id, userIdToUpdate))
            .returning({ id: users.id, email: users.email, role: users.role });

        if (updatedUsers.length === 0) {
            return NextResponse.json({ error: 'User not found.' }, { status: 404 });
        }

        return NextResponse.json(updatedUsers[0]);

    } catch (error) {
        console.error('Error updating user:', error);
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    const params = await context.params; // Await the params promise
    const userIdToDelete = parseInt(params.id, 10);
    if (isNaN(userIdToDelete)) {
        return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    // 1. Authenticate and authorize the requesting user (must be Superadmin)
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { payload: requestingUser } = await jwtVerify(token, secret);
        if (requestingUser.role !== 'superadmin') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 2. Prevent a Superadmin from deleting their own account
        if (requestingUser.userId === userIdToDelete) {
            return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 403 });
        }

        // 3. Find the user to be deleted to check their role
        const usersToDelete = await db.select({ role: users.role }).from(users).where(eq(users.id, userIdToDelete));
        if (usersToDelete.length === 0) {
            return NextResponse.json({ error: 'User not found.' }, { status: 404 });
        }
        if (usersToDelete[0].role === 'superadmin') {
            return NextResponse.json({ error: 'Cannot delete another superadmin account.' }, { status: 403 });
        }

        // 4. Perform the deletion
        await db.delete(users).where(eq(users.id, userIdToDelete));
        return new NextResponse(null, { status: 204 }); // 204 No Content is a standard response for successful deletion
    } catch (error) {
        console.error('Error deleting user:', error);
        return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
    }
}
