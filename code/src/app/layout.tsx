import React from 'react';
import '@ant-design/v5-patch-for-react-19';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { Layout, Typography } from 'antd';
import Link from 'next/link';
import AppHeader from '@/components/AppHeader';
import { ProjectProvider } from '@/contexts/ProjectContext';

const { Title } = Typography;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ProjectProvider>
          <AntdRegistry>
            <Layout style={{ minHeight: '100vh' }}>
              <AppHeader />
              <main style={{ padding: '24px 48px' }}>{children}</main>
            </Layout>
          </AntdRegistry>
        </ProjectProvider>
      </body>
    </html>
  );
}