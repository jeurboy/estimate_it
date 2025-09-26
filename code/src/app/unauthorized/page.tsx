'use client';

import { Result, Button } from 'antd';
import { useRouter } from 'next/navigation';

const UnauthorizedPage = () => {
    const router = useRouter();

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
            <Result
                status="403"
                title="403 - Access Denied"
                subTitle="ขออภัย, คุณไม่มีสิทธิ์เข้าถึงหน้านี้"
                extra={<Button type="primary" onClick={() => router.push('/')}>กลับสู่หน้าหลัก</Button>}
            />
        </div>
    );
};

export default UnauthorizedPage;
