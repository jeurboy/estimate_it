'use client';

import { Menu, Layout, Typography, Divider, Space } from 'antd';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SettingOutlined } from '@ant-design/icons';

const { Header } = Layout;
const { Title } = Typography;

export default function AppHeader() {
    const pathname = usePathname();

    const adminMenuItems = [
        {
            label: <Space>
                <SettingOutlined /> Administration
            </Space>,
            key: 'administration',
            children: [
                { label: <Link href="/projects">Projects</Link>, key: '/projects' },
                { label: <Link href="/references">References</Link>, key: '/references' },
            ],
        },
    ];

    const items = [...adminMenuItems];

    return (
        <Header style={{ display: 'flex', alignItems: 'center', backgroundColor: '#fff', borderBottom: '1px solid #f0f0f0', padding: '0 24px' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', marginRight: '24px' }}>
                <Title level={3} style={{ color: 'rgba(0, 0, 0, 0.88)', margin: 0, lineHeight: '1' }}>
                    Estimate It
                </Title>
            </Link>
            <Menu selectedKeys={[pathname]} mode="horizontal" items={items} style={{ flex: 1, borderBottom: 'none', minWidth: 0 }} />
        </Header>
    );
}