import React from 'react';
import '@ant-design/v5-patch-for-react-19';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { Layout } from 'antd';
import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // AuthProvider is now at the root, wrapping everything.
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AntdRegistry>
            <Layout style={{ minHeight: '100vh' }}>
              {children}
            </Layout>
          </AntdRegistry>
        </AuthProvider>
      </body>
    </html>
  );
}