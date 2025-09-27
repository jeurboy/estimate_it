'use client';

import React from 'react';
import { Form, Input, Button, Card, Typography, message, Alert } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useApi } from '@/hooks/useApi';
import { withAuth } from '@/hoc/withAuth';

const { Title } = Typography;

interface ChangePasswordFormValues {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

const ProfilePage = () => {
    const [form] = Form.useForm();
    const { apiFetch, loading, error, setError } = useApi();

    const onFinish = async (values: ChangePasswordFormValues) => {
        if (values.newPassword !== values.confirmPassword) {
            setError("New passwords do not match.");
            return;
        }

        const result = await apiFetch('/api/profile/password', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                currentPassword: values.currentPassword,
                newPassword: values.newPassword,
            }),
        });

        // apiFetch returns null on success (204 No Content)
        if (result === null && !error) {
            message.success('Password updated successfully!');
            form.resetFields();
        }
        // If there's an error, the useApi hook will set the error state and it will be displayed.
    };

    return (
        <div style={{ maxWidth: '500px', margin: 'auto', paddingTop: '2rem' }}>
            <Card>
                <Title level={3} style={{ textAlign: 'center' }}>Change Password</Title>
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    style={{ marginTop: '24px' }}
                >
                    {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 24 }} />}
                    <Form.Item name="currentPassword" label="Current Password" rules={[{ required: true, message: 'Please input your current password!' }]}>
                        <Input.Password prefix={<LockOutlined />} placeholder="Current Password" />
                    </Form.Item>
                    <Form.Item name="newPassword" label="New Password" rules={[{ required: true, message: 'Please input your new password!' }, { min: 6, message: 'Password must be at least 6 characters.' }]}>
                        <Input.Password prefix={<LockOutlined />} placeholder="New Password" />
                    </Form.Item>
                    <Form.Item name="confirmPassword" label="Confirm New Password" dependencies={['newPassword']} rules={[{ required: true, message: 'Please confirm your new password!' }, ({ getFieldValue }) => ({ validator(_, value) { if (!value || getFieldValue('newPassword') === value) { return Promise.resolve(); } return Promise.reject(new Error('The two passwords that you entered do not match!')); }, })]}>
                        <Input.Password prefix={<LockOutlined />} placeholder="Confirm New Password" />
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit" loading={loading} block>Update Password</Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default withAuth(ProfilePage);
