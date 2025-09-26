'use client';

import { useEffect, useState, useCallback } from 'react';
import { Table, Typography, Alert, Spin, Breadcrumb, Button, Modal, Form, Input, message, Space, Popconfirm, Select } from 'antd';
import type { TableProps } from 'antd';
import { format } from 'date-fns';
import { useApi } from '@/hooks/useApi';
import Link from 'next/link';

const { Title } = Typography;
const { TextArea } = Input;

interface Organization {
    id: string;
    name_th: string;
    name_en: string;
    description: string;
    created_at: string;
    userCount: number;
    projectCount: number;
}

const OrganizationManagementPage = () => {
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isAddUserModalVisible, setIsAddUserModalVisible] = useState(false);
    const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
    const [form] = Form.useForm();
    const [addUserForm] = Form.useForm();
    const [selectedOrgForUser, setSelectedOrgForUser] = useState<Organization | null>(null);
    const { apiFetch, loading, error } = useApi();

    const isEditMode = !!editingOrg;

    const fetchOrganizations = useCallback(async () => {
        const data = await apiFetch<Organization[]>('/api/admin/organizations');
        if (data) {
            setOrganizations(data);
        }
        // Error handling is done by the useApi hook
    }, [apiFetch]);

    useEffect(() => {
        fetchOrganizations();
    }, [fetchOrganizations]);

    const handleModalSubmit = async () => {
        try {
            const values = await form.validateFields();

            const url = isEditMode ? `/api/admin/organizations/${editingOrg.id}` : '/api/admin/organizations';
            const method = isEditMode ? 'PUT' : 'POST';

            const savedOrg = await apiFetch<Organization>(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });

            if (savedOrg) {
                message.success(`Organization ${isEditMode ? 'updated' : 'created'} successfully!`);
                setIsModalVisible(false);
                form.resetFields();
                fetchOrganizations();
            }
        } catch (err: unknown) {
            message.error(err instanceof Error ? err.message : 'An error occurred.');
        }
    };

    const handleDelete = async (orgId: string) => {
        try {
            const result = await apiFetch(`/api/admin/organizations/${orgId}`, {
                method: 'DELETE',
            });

            if (result === null) { // DELETE returns 204 No Content
                message.success('Organization deleted successfully!');
                fetchOrganizations();
            }
        } catch (err: unknown) {
            message.error(err instanceof Error ? err.message : 'An error occurred.');
        }
    };

    const showAddUserModal = (org: Organization) => {
        setSelectedOrgForUser(org);
        setIsAddUserModalVisible(true);
    };

    const handleAddUser = async () => {
        try {
            const values = await addUserForm.validateFields();
            const payload = {
                ...values,
                organization_id: selectedOrgForUser?.id,
            };

            const newUser = await apiFetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (newUser) {
                message.success(`User created and assigned to ${selectedOrgForUser?.name_en} successfully!`);
                setIsAddUserModalVisible(false);
                addUserForm.resetFields();
            }
        } catch (err: unknown) {
            message.error(err instanceof Error ? err.message : 'An error occurred while creating the user.');
        }
    };

    const showModal = (org: Organization | null = null) => {
        setEditingOrg(org);
        if (org) {
            form.setFieldsValue(org);
        } else {
            form.resetFields();
        }
        setIsModalVisible(true);
    };

    const handleModalCancel = () => {
        setIsModalVisible(false);
        setEditingOrg(null);
    };

    const columns: TableProps<Organization>['columns'] = [
        {
            title: 'Organization Name (EN)',
            dataIndex: 'name_en',
            key: 'name_en',
            render: (text, record) => <Link href={`/admin/organizations/${record.id}`}>{text}</Link>,
        },
        { title: 'Organization Name (TH)', dataIndex: 'name_th', key: 'name_th' },
        { title: 'Users', dataIndex: 'userCount', key: 'userCount', align: 'center' },
        { title: 'Projects', dataIndex: 'projectCount', key: 'projectCount', align: 'center' },
        { title: 'Description', dataIndex: 'description', key: 'description' },
        {
            title: 'Created At',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (date: string) => format(new Date(date), 'dd MMM yyyy, HH:mm'),
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Space size="middle">
                    <Button type="link" size="small" onClick={() => showAddUserModal(record)}>Add User</Button>
                    <Button type="link" size="small" onClick={() => showModal(record)}>Edit</Button>
                    <Popconfirm title="Delete this organization?" description="Are you sure you want to delete this organization?" onConfirm={() => handleDelete(record.id)} okText="Yes" cancelText="No">
                        <Button type="link" size="small" danger>Delete</Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: '24px' }}>
            <Breadcrumb
                style={{ marginBottom: 16 }}
                items={[
                    { title: <Link href="/admin">Admin</Link> },
                    { title: 'Organization Management' },
                ]}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={2} style={{ margin: 0 }}>Organization Management</Title>
                <Button type="primary" onClick={() => showModal()}>Create Organization</Button>
            </div>
            {error && <Alert message="Error" description={error} type="error" showIcon style={{ marginBottom: 16 }} />}
            <Spin spinning={loading}>
                <Table columns={columns} dataSource={organizations} rowKey="id" />
            </Spin>
            <Modal
                title={isEditMode ? 'Edit Organization' : 'Create New Organization'}
                open={isModalVisible}
                onOk={handleModalSubmit}
                onCancel={handleModalCancel}
                confirmLoading={loading}
                okText={isEditMode ? 'Save' : 'Create'}
                cancelText="Cancel"
            >
                <Form form={form} layout="vertical" name="create_org_form">
                    <Form.Item name="name_th" label="Organization Name (TH)" rules={[{ required: true, message: 'Please enter the Thai name.' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="name_en" label="Organization Name (EN)" rules={[{ required: true, message: 'Please enter the English name.' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="description" label="Description">
                        <TextArea rows={4} />
                    </Form.Item>
                </Form>
            </Modal>
            <Modal
                title={`Add New User to ${selectedOrgForUser?.name_en}`}
                open={isAddUserModalVisible}
                onOk={handleAddUser}
                onCancel={() => setIsAddUserModalVisible(false)}
                confirmLoading={loading}
                okText="Create User"
                cancelText="Cancel"
            >
                <Form form={addUserForm} layout="vertical" name="add_user_to_org_form">
                    <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Please enter a valid email.' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Password is required.' }, { min: 6, message: 'Password must be at least 6 characters long.' }]}>
                        <Input.Password />
                    </Form.Item>
                    <Form.Item name="role" label="Role" rules={[{ required: true, message: 'Role is required.' }]}>
                        <Select placeholder="Select a role">
                            {['admin', 'user'].map(role => (
                                <Select.Option key={role} value={role}>{role.toUpperCase()}</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default OrganizationManagementPage;
