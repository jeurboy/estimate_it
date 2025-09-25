'use client';

import React from 'react';
import { Layout } from 'antd';

const { Content } = Layout;

export default function MainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <Layout style={{ minHeight: '100vh' }}>
            <Content style={{ padding: '24px' }}>{children}</Content>
        </Layout>
    );
}
