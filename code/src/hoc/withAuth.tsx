'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Spin } from 'antd';

/**
 * A Higher-Order Component that protects a page from unauthenticated access.
 * If the user is not authenticated, they are redirected to the dashboard page.
 *
 * @param WrappedComponent The component to wrap and protect.
 */
export function withAuth<P extends object>(WrappedComponent: React.ComponentType<P>) {
    const AuthComponent = (props: P) => {
        const { isAuthenticated, isLoading } = useAuth();
        const router = useRouter();

        useEffect(() => {
            if (!isLoading && !isAuthenticated) {
                router.replace('/dashboard');
            }
        }, [isLoading, isAuthenticated, router]);

        if (isLoading || !isAuthenticated) {
            return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin size="large" tip="Authenticating..." /></div>;
        }

        return <WrappedComponent {...props} />;
    };
    return AuthComponent;
}