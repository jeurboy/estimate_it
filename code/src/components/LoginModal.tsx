'use client';

import { useState } from 'react';
import { Form, Input, Button, Alert, Modal, Typography, Spin, Checkbox } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';

const { Title } = Typography;

interface LoginModalProps {
    open: boolean;
    onLoginSuccess: () => void;
    onCancel: () => void;
}

const errorMessages: { [key: string]: string } = {
    'Invalid email or password.': 'อีเมลหรือรหัสผ่านไม่ถูกต้อง',
    'Email and password are required.': 'กรุณากรอกอีเมลและรหัสผ่าน',
};

interface LoginFormValues {
    email: string;
    password?: string;
    rememberMe?: boolean;
}

const LoginModal = ({ open, onLoginSuccess, onCancel }: LoginModalProps) => {
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();

    const onFinish = async (values: LoginFormValues) => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });

            if (response.ok) {
                onLoginSuccess();
                form.resetFields();
            } else {
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

    const handleCancel = () => {
        form.resetFields();
        setError(null);
        onCancel();
    };

    return (
        <Modal
            title={<Title level={3} style={{ textAlign: 'center', marginBottom: 0 }}>Login</Title>}
            open={open}
            onCancel={handleCancel}
            footer={null}
            centered
        >
            <Spin spinning={loading} tip="Logging in...">
                <Form form={form} name="login_form" onFinish={onFinish} style={{ marginTop: 24 }} initialValues={{ rememberMe: true }}>
                    {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 24 }} />}
                    <Form.Item name="email" rules={[{ required: true, type: 'email', message: 'กรุณากรอกอีเมลให้ถูกต้อง!' }]}>
                        <Input prefix={<MailOutlined />} placeholder="Email" />
                    </Form.Item>
                    <Form.Item name="password" rules={[{ required: true, message: 'กรุณากรอกรหัสผ่าน!' }]}>
                        <Input.Password prefix={<LockOutlined />} placeholder="Password" />
                    </Form.Item>
                    <Form.Item>
                        <Form.Item name="rememberMe" valuePropName="checked" noStyle>
                            <Checkbox>จำฉันไว้ในระบบ</Checkbox>
                        </Form.Item>
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" style={{ width: '100%' }} disabled={loading}>
                            Log in
                        </Button>
                    </Form.Item>
                </Form>
            </Spin>
        </Modal>
    );
};

export default LoginModal;