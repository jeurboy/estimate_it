'use client';

import { useRouter } from 'next/navigation';
import { Button, Dropdown, MenuProps, Modal, Skeleton, Typography, Divider } from 'antd';
import { UserOutlined, LogoutOutlined, ExclamationCircleFilled, SettingOutlined } from '@ant-design/icons';
import Link from 'next/link';

const { Text } = Typography;
const { confirm } = Modal;

interface User {
    email: string;
    role: 'superadmin' | 'admin' | 'user';
}

interface UserAuthStatusProps {
    user: User | null;
    loading: boolean;
}

const UserAuthStatus = ({ user, loading }: UserAuthStatusProps) => {
    const router = useRouter();

    const showLogoutConfirm = () => {
        confirm({
            title: 'คุณต้องการออกจากระบบใช่หรือไม่?',
            icon: <ExclamationCircleFilled />,
            okText: 'ออกจากระบบ',
            cancelText: 'ยกเลิก',
            async onOk() {
                await fetch('/api/auth/logout', { method: 'POST' });
                // ใช้ window.location.href เพื่อให้แน่ใจว่า state ทั้งหมดถูกรีเซ็ต
                window.location.href = '/login';
            },
        });
    };

    if (loading) {
        return <Skeleton.Button active size="small" style={{ width: 120 }} />;
    }

    if (!user) {
        return <Button onClick={() => router.push('/login')}>Login</Button>;
    }

    const items: MenuProps['items'] = [
        {
            key: 'profile',
            icon: <SettingOutlined />,
            label: <Link href="/account/profile">Account Settings</Link>,
        },
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: 'Logout',
            onClick: showLogoutConfirm,
        },
    ];

    return (
        <Dropdown menu={{ items }} placement="bottomRight">
            <Button icon={<UserOutlined />}><Text style={{ marginLeft: 8 }}>{user.email}</Text></Button>
        </Dropdown>
    );
};

export default UserAuthStatus;
