'use client';

import { useEffect, useState } from 'react';
import { Menu, Layout, Typography, Skeleton } from 'antd';
import Link from 'next/link';
import UserAuthStatus from './UserAuthStatus';
import { usePathname } from 'next/navigation';
import type { MenuProps } from 'antd';

const { Header } = Layout;
const { Title } = Typography;

interface User {
    email: string;
    role: 'superadmin' | 'admin' | 'user';
}

export default function AppHeader() {
    const pathname = usePathname();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const response = await fetch('/api/auth/me');
                if (response.ok) {
                    const data = await response.json();
                    setUser(data.user);
                } else {
                    setUser(null);
                }
            } catch (error) {
                setUser(null);
            } finally {
                setLoading(false);
            }
        };
        fetchUser();
    }, []);

    const getMenuItems = (): MenuProps['items'] => {
        if (!user) return [];

        const menuItems: MenuProps['items'] = [
            { label: <Link href="/projects">Projects</Link>, key: '/projects' },
            { label: <Link href="/references">References</Link>, key: '/references' },
        ];

        if (user.role === 'superadmin' || user.role === 'admin') {
            menuItems.push({ label: <Link href="/admin/users">User Management</Link>, key: '/admin/users' });
        }

        if (user.role === 'superadmin') {
            menuItems.push({ label: <Link href="/admin/organizations">Organizations</Link>, key: '/admin/organizations' });
        }

        return menuItems;
    };

    return (
        <Header style={{ display: 'flex', alignItems: 'center', backgroundColor: '#fff', borderBottom: '1px solid #f0f0f0', padding: '0 24px' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', marginRight: '24px' }}>
                <Title level={3} style={{ color: 'rgba(0, 0, 0, 0.88)', margin: 0, lineHeight: '1' }}>
                    Estimate It
                </Title>
            </Link>
            {loading ? (
                <Skeleton.Input active size="small" style={{ width: 200, margin: 'auto 0' }} />
            ) : (
                <Menu selectedKeys={[pathname]} mode="horizontal" items={getMenuItems()} style={{ flex: 1, borderBottom: 'none', minWidth: 0 }} />
            )}
            <UserAuthStatus user={user} loading={loading} />
        </Header>
    );
}