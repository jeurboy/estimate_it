'use client';

import React, { useState, useMemo } from 'react';
import { Layout, Button, Avatar, Space, Typography, Dropdown, MenuProps, message, Menu, Divider } from 'antd';
import { UserOutlined, LogoutOutlined, LoginOutlined, SettingOutlined } from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import LoginModal from './LoginModal';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const { Header } = Layout;
const { Text } = Typography;

const AppHeader = () => {
    const { user, isAuthenticated, logout, checkUser } = useAuth();
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            logout(); // Clear user from context immediately
            message.success('Logged out successfully.');
            router.push('/dashboard'); // Navigate to dashboard, which will refetch data for guest
        } catch (error) {
            message.error('Logout failed.');
        }
    };

    const onLoginSuccess = async () => {
        setIsLoginModalOpen(false);
        message.success('Login successful!');
        // Re-check user status to update the header and context.
        // This will trigger useEffect in pages that depend on `isAuthenticated`.
        await checkUser();
    };

    const userMenuItems: MenuProps['items'] = [
        {
            key: 'profile',
            icon: <SettingOutlined />,
            label: <Link href="/profile">Profile</Link>,
        },
        { type: 'divider' },
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: 'Logout',
            onClick: handleLogout,
        },
    ];

    const navMenuItems = useMemo(() => {
        if (!isAuthenticated || !user) return [];

        const items: MenuProps['items'] = [
            { label: <Link href="/projects">Projects</Link>, key: '/projects' },
        ];

        if (user.role === 'superadmin' || user.role === 'admin') {
            items.push({ label: <Link href="/admin/users">User Management</Link>, key: '/admin/users' });
            items.push({ label: <Link href="/references">References</Link>, key: '/references' });
        }

        if (user.role === 'superadmin') {
            items.push({ label: <Link href="/admin/organizations">Organizations</Link>, key: '/admin/organizations' });
        }
        return items;
    }, [isAuthenticated, user]);

    return (
        <>
            <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0' }}>
                <Space>
                    <Text strong style={{ fontSize: '20px' }}><Link href="/dashboard" style={{ color: 'inherit' }}>Estimate It</Link></Text>
                    <Menu mode="horizontal" selectedKeys={[pathname]} items={navMenuItems} style={{ borderBottom: 'none', lineHeight: '62px' }} />
                </Space>
                <Space>
                    {isAuthenticated && user ? (
                        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                            <Space style={{ cursor: 'pointer' }}>
                                <Avatar icon={<UserOutlined />} />
                                <Text>{user.email}</Text>
                            </Space>
                        </Dropdown>
                    ) : (
                        <Button icon={<LoginOutlined />} onClick={() => setIsLoginModalOpen(true)}>Login</Button>
                    )}
                </Space>
            </Header>
            <LoginModal open={isLoginModalOpen} onLoginSuccess={onLoginSuccess} onCancel={() => setIsLoginModalOpen(false)} />
        </>
    );
};

export default AppHeader;