'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Layout } from 'antd';
import AppHeader from '@/components/AppHeader';
import { ProjectProvider } from '@/contexts/ProjectContext';
import DynamicBreadcrumb from '@/components/DynamicBreadcrumb';

const { Content } = Layout;

export default function MainLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname();
    // Hide dynamic breadcrumb on pages that provide their own, or where it's not needed.
    // Currently, we want it on most pages.
    // Example of hiding on a specific page: const hideOn = ['/some/path'];
    // const showDynamicBreadcrumb = !hideOn.some(path => pathname.startsWith(path));
    const showDynamicBreadcrumb = true;

    return (
        <ProjectProvider>
            <Layout style={{ minHeight: '100vh' }}>
                <AppHeader />
                <Content style={{ padding: '0 24px' }}>
                    {showDynamicBreadcrumb && <DynamicBreadcrumb />}
                    {children}
                </Content>
            </Layout>
        </ProjectProvider>
    );
}
