'use client';

import { useState } from 'react';
import { Form, Input, Button, Alert, Card, Typography, Spin, message, Breadcrumb, Result } from 'antd';
import Link from 'next/link';
import { useApi } from '@/hooks/useApi';

const { Title } = Typography;

const ProfilePage = () => {
    const [form] = Form.useForm();
    const { apiFetch, loading, error, setError } = useApi();

    const onFinish = async (values: Record<string, string>) => {
        setError(null);

        try {
            const result = await apiFetch('/api/account/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    currentPassword: values.currentPassword,
                    newPassword: values.newPassword,
                }),
            });

            if (result) {
                message.success('Password updated successfully!');
                form.resetFields();
            }
        } catch (err: unknown) {
            // Error is handled by useApi hook
        }
    };

    return (
        <div style={{ padding: '24px' }}>
            <Breadcrumb
                style={{ marginBottom: 16 }}
                items={[
                    { title: <Link href="/">Home</Link> },
                    { title: 'Account Settings' },
                ]} />
            <Title level={2}>Account Settings</Title>
            <Card style={{ maxWidth: 600, marginTop: 24 }}>
                <Title level={4}>Change Password</Title>
                <Spin spinning={loading}>
                    <Form
                        form={form}
                        layout="vertical"
                        name="profile_form"
                        onFinish={onFinish}
                        style={{ marginTop: 16 }}
                    >
                        {error && <Alert message={error} type="error" showIcon style={{ marginBottom: 24 }} />}

                        <Form.Item
                            name="currentPassword"
                            label="Current Password"
                            rules={[{ required: true, message: 'Please input your current password!' }]}
                        >
                            <Input.Password />
                        </Form.Item>

                        <Form.Item
                            name="newPassword"
                            label="New Password"
                            rules={[{ required: true, message: 'Please input your new password!' }, { min: 6, message: 'Password must be at least 6 characters.' }]}
                        >
                            <Input.Password />
                        </Form.Item>

                        <Form.Item
                            name="confirmPassword"
                            label="Confirm New Password"
                            dependencies={['newPassword']}
                            rules={[{ required: true, message: 'Please confirm your new password!' }, ({ getFieldValue }) => ({ validator(_, value) { if (!value || getFieldValue('newPassword') === value) { return Promise.resolve(); } return Promise.reject(new Error('The two passwords that you entered do not match!')); } })]}
                        >
                            <Input.Password />
                        </Form.Item>

                        <Form.Item>
                            <Button type="primary" htmlType="submit" disabled={loading}>
                                Update Password
                            </Button>
                        </Form.Item>
                    </Form>
                </Spin>
            </Card>
        </div>
    );
};

export default ProfilePage;
