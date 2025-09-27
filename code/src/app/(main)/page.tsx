'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spin } from 'antd';

const HomePage = () => {
    const router = useRouter();

    useEffect(() => {
        router.replace('/dashboard');
    }, [router]);

    // Show a loading spinner while redirecting
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><Spin size="large" /></div>;
};

export default HomePage;