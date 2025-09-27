'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Table, Typography, Tag, Alert, Spin, Button, Modal, Form, Input, Select, message, Space, Popconfirm } from 'antd';
import type { TableProps } from 'antd';
import { format } from 'date-fns';
import { useApi } from '@/hooks/useApi';
import Link from 'next/link';

const { Title } = Typography;

interface User {
    id: number;
    email: string;
    role: 'superadmin' | 'admin' | 'user';
    organizationName?: string;
    organization_id?: string;
    createdAt: string;
}

const roleColors = {
    superadmin: 'gold',
    admin: 'blue',
    user: 'green',
};

interface Organization {
    id: string;
    name_en: string;
}

// ดึงค่า enum roles มาใช้ใน client component
const EDITABLE_ROLES_FOR_SUPERADMIN = ['superadmin', 'admin', 'user'];
const EDITABLE_ROLES_FOR_ADMIN = ['superadmin'];


const UserManagementPage = () => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);

    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0,
    });
    const [editForm] = Form.useForm();
    const [createForm] = Form.useForm();
    const { apiFetch, loading, error, setError } = useApi();

    const fetchUsers = useCallback(async () => {
        try {
            const [usersRes, meRes, orgsRes] = await Promise.all([
                apiFetch<{ users: User[], totalCount: number }>(`/api/admin/users?page=${pagination.current}&pageSize=${pagination.pageSize}`),
                apiFetch<{ user: User }>('/api/auth/me'),
                apiFetch<Organization[]>('/api/admin/organizations'),
            ]);

            if (usersRes) {
                setUsers(usersRes.users);
                // Only update total if it has changed to prevent re-renders
                if (usersRes.totalCount !== pagination.total) {
                    setPagination(prev => ({ ...prev, total: usersRes.totalCount }));
                }
            }
            if (orgsRes) {
                setOrganizations(orgsRes);
            }
            if (meRes) {
                setCurrentUser(meRes.user);
            }

        } catch (err: unknown) {
            // The useApi hook will set the error state
        }
    }, [apiFetch, pagination.current, pagination.pageSize, pagination.total]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]); // fetchUsers is now stable

    const userRolesForSelect = useMemo(() => {
        if (currentUser?.role === 'superadmin') {
            return EDITABLE_ROLES_FOR_SUPERADMIN;
        }
        return EDITABLE_ROLES_FOR_ADMIN;
    }, [currentUser]);

    const handleTableChange: TableProps<User>['onChange'] = (paginationConfig) => {
        setPagination(prev => ({ ...prev, current: paginationConfig.current!, pageSize: paginationConfig.pageSize! }));
    };


    const handleEdit = (user: User) => {
        setEditingUser(user); // The user object from the table
        editForm.setFieldsValue({ role: user.role, password: '', organization_id: user.organization_id });
        setIsEditModalVisible(true);
    };

    const handleEditModalOk = async () => {
        try {
            const values = await editForm.validateFields();

            // ไม่ส่ง password ถ้า field ว่าง
            const body: { role: User['role']; password?: string; organization_id?: string | null } = { role: values.role, organization_id: values.organization_id };
            if (values.password) {
                body.password = values.password;
            }

            const updatedUser = await apiFetch<User>(`/api/admin/users/${editingUser!.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (updatedUser) {
                message.success('User updated successfully!');
                setIsEditModalVisible(false);
                fetchUsers(); // Refresh the user list
            }
        } catch (err: unknown) {
            // The useApi hook will set the error state, but we can still show a message.
            message.error(err instanceof Error ? err.message : 'An error occurred while updating the user.');
        }
    };

    const handleCreateModalOk = async () => {
        try {
            const values = await createForm.validateFields();
            const newUser = await apiFetch<User>('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });

            if (newUser) {
                message.success('User created successfully!');
                setIsCreateModalVisible(false);
                createForm.resetFields();
                fetchUsers(); // Refresh the user list
            }
        } catch (err: unknown) {
            // The useApi hook will set the error state, but we can still show a message.
            message.error(err instanceof Error ? err.message : 'An error occurred while creating the user.');
        }
    };

    const handleDelete = async (userId: number) => {
        try {
            const result = await apiFetch(`/api/admin/users/${userId}`, {
                method: 'DELETE',
            });

            // apiFetch returns null for 204 No Content on successful DELETE
            if (result === null) {
                message.success('User deleted successfully!');
                fetchUsers(); // Refresh the user list
            }
        } catch (err: unknown) {
            // The useApi hook will set the error state, but we can still show a message.
            message.error(err instanceof Error ? err.message : 'An error occurred while deleting the user.');
        }
    };

    const columns: TableProps<User>['columns'] = [
        { title: 'Email', dataIndex: 'email', key: 'email' },
        { title: 'Organization', dataIndex: 'organizationName', key: 'organizationName', render: (name) => name || '-' },
        {
            title: 'Role',
            dataIndex: 'role',
            key: 'role',
            render: (role: User['role']) => (
                <Tag color={roleColors[role]}>{role.toUpperCase()}</Tag>
            ),
        },
        {
            title: 'Created At',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date: string) => format(new Date(date), 'dd MMM yyyy, HH:mm'),
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                (currentUser?.role === 'superadmin' || (currentUser?.role === 'admin' && record.role !== 'superadmin')) && (
                    <Space size="middle">
                        <Button type="link" size="small" onClick={() => handleEdit(record)} disabled={record.id === currentUser?.id}>
                            Edit
                        </Button>
                        {currentUser?.role === 'superadmin' && (
                            <Popconfirm title="Delete the user" description="Are you sure you want to delete this user?" onConfirm={() => handleDelete(record.id)} okText="Yes" cancelText="No" disabled={record.id === currentUser?.id}>
                                <Button type="link" size="small" danger disabled={record.id === currentUser?.id}>Delete</Button>
                            </Popconfirm>
                        )}
                    </Space>
                )
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={2} style={{ margin: 0 }}>User Management</Title>
                {currentUser?.role === 'superadmin' && (
                    <Button type="primary" onClick={() => setIsCreateModalVisible(true)}>Create New User</Button>
                )}
            </div>
            {error && <Alert message="Error" description={error} type="error" showIcon style={{ marginBottom: 16 }} />}
            <Spin spinning={loading}>
                <Table
                    columns={columns}
                    dataSource={users}
                    rowKey="id"
                    pagination={pagination}
                    onChange={handleTableChange}
                />
            </Spin>
            {editingUser && (
                <Modal
                    title={`Edit User: ${editingUser.email}`}
                    open={isEditModalVisible}
                    onOk={handleEditModalOk}
                    onCancel={() => setIsEditModalVisible(false)}
                    confirmLoading={loading}
                    okText="Save"
                    cancelText="Cancel"
                >
                    <Form form={editForm} layout="vertical" name="edit_user_form">
                        <Form.Item name="password" label="New Password (optional)" rules={[{ min: 6, message: 'Password must be at least 6 characters long.' }]}>
                            <Input.Password placeholder="Leave blank to keep current password" />
                        </Form.Item>
                        <Form.Item name="role" label="Role" rules={[{ required: true }]}>
                            <Select>
                                {userRolesForSelect.map((role) => (
                                    <Select.Option key={role} value={role}>{role.toUpperCase()}</Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                        <Form.Item name="organization_id" label="Organization">
                            <Select placeholder="Assign to an organization" allowClear>
                                {organizations.map(org => (
                                    <Select.Option key={org.id} value={org.id}>{org.name_en}</Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </Form>
                </Modal>
            )}
            <Modal
                title="Create New User"
                open={isCreateModalVisible}
                onOk={handleCreateModalOk}
                onCancel={() => setIsCreateModalVisible(false)}
                confirmLoading={loading}
                okText="Create"
                cancelText="Cancel"
            >
                <Form form={createForm} layout="vertical" name="create_user_form">
                    <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Please enter a valid email.' }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Password is required.' }, { min: 6, message: 'Password must be at least 6 characters long.' }]}>
                        <Input.Password />
                    </Form.Item>
                    <Form.Item name="role" label="Role" rules={[{ required: true, message: 'Role is required.' }]}>
                        <Select placeholder="Select a role">
                            {EDITABLE_ROLES_FOR_SUPERADMIN.filter(r => r !== 'superadmin').map((role) => (
                                <Select.Option key={role} value={role}>{role.toUpperCase()}</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item name="organization_id" label="Organization">
                        <Select placeholder="Assign to an organization" allowClear>
                            {organizations.map(org => (
                                <Select.Option key={org.id} value={org.id}>{org.name_en}</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default UserManagementPage;
