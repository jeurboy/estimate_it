'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Input, Button, Alert, Card, Typography, Spin } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';

const { Title } = Typography;

const LoginPage = () => {
    // สร้าง Object สำหรับแปลงข้อความ Error
    const errorMessages: { [key: string]: string } = {
        'Invalid email or password.': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
        'Email and password are required.': 'กรุณากรอกอีเมลและรหัสผ่าน',
    };

    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const onFinish = async (values: Record<string, string>) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: values.email,
                    password: values.password,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                const role = data.user?.role;

                // Redirect based on user role
                if (role === 'superadmin' || role === 'admin') {
                    router.replace('/admin/users'); // Redirect admins to user management
                } else {
                    router.replace('/'); // Redirect regular users to the homepage
                }
            } else {
                // ล็อกอินไม่สำเร็จ, แปลงข้อความ error ก่อนแสดงผล
                const data = await response.json();
                const apiError = data.error || 'An unknown error occurred.';
                setError(errorMessages[apiError] || 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง');
            }
        } catch (err: unknown) {
            setError('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f0f2f5' }}>
            <Card style={{ width: 400 }}>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <Title level={2}>Superadmin Login</Title>
                </div>
                <Spin spinning={loading}>
                    <Form
                        name="login_form"
                        initialValues={{ remember: true }}
                        onFinish={onFinish}
                    >
                        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 24 }} />}

                        <Form.Item
                            name="email"
                            rules={[{ required: true, type: 'email', message: 'กรุณากรอกอีเมลให้ถูกต้อง!' }]}
                        >
                            <Input prefix={<MailOutlined />} placeholder="Email" />
                        </Form.Item>

                        <Form.Item
                            name="password"
                            rules={[{ required: true, message: 'กรุณากรอกรหัสผ่าน!' }]}
                        >
                            <Input.Password prefix={<LockOutlined />} placeholder="Password" />
                        </Form.Item>

                        <Form.Item>
                            <Button type="primary" htmlType="submit" style={{ width: '100%' }} disabled={loading}>
                                Log in
                            </Button>
                        </Form.Item>
                    </Form>
                </Spin>
            </Card>
        </div>
    );
};

export default LoginPage;
