'use client';

import { useRouter } from 'next/navigation';
import { Button, Dropdown, MenuProps, Modal, Space, Typography } from 'antd';
import { UserOutlined, LogoutOutlined, ExclamationCircleFilled } from '@ant-design/icons';

const { Text } = Typography;
const { confirm } = Modal;

interface UserPayload {
    email: string;
    role: string;
}

interface AuthStatusProps {
    user: UserPayload | null;
}

export const AuthStatus = ({ user }: AuthStatusProps) => {
    const router = useRouter();

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        // ใช้ .replace เพื่อไม่ให้ผู้ใช้กด back กลับมาได้ และ .refresh() เพื่อล้าง cache ฝั่ง server
        router.replace('/login');
        router.refresh();
    };

    const showLogoutConfirm = () => {
        confirm({
            title: 'คุณต้องการออกจากระบบใช่หรือไม่?',
            icon: <ExclamationCircleFilled />,
            okText: 'ยืนยัน',
            okType: 'danger',
            cancelText: 'ยกเลิก',
            onOk() {
                handleLogout();
            },
        });
    };

    if (!user) {
        return <Button onClick={() => router.push('/login')}>Login</Button>;
    }

    const items: MenuProps['items'] = [
        {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: 'Logout',
            onClick: showLogoutConfirm,
        },
    ];

    return (
        <Dropdown menu={{ items }} placement="bottomRight">
            <a onClick={(e) => e.preventDefault()}>
                <Space>
                    <UserOutlined />
                    <Text>{user.email}</Text>
                </Space>
            </a>
        </Dropdown>
    );
};
