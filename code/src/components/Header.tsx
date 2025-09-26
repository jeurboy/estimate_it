import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { AuthStatus } from './AuthStatus';

interface UserPayload {
    userId: number;
    email: string;
    role: string;
    iat: number;
    exp: number;
}

async function getUserSession(): Promise<UserPayload | null> {
    const token = (await cookies()).get('auth_token')?.value;
    if (!token) return null;

    try {
        const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
        const { payload } = await jwtVerify<UserPayload>(token, secret);
        return payload;
    } catch (e) {
        return null;
    }
}

export async function Header() {
    const user = await getUserSession();

    return (
        <header style={{ display: 'flex', justifyContent: 'flex-end', padding: '1rem 2rem', borderBottom: '1px solid #f0f0f0', background: 'white' }}>
            <AuthStatus user={user} />
        </header>
    );
}
