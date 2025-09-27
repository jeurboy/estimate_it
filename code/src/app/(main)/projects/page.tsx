'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Space, Spin, Alert, Popconfirm, Typography, Card, Select, Breadcrumb, message } from 'antd';
import type { TableProps } from 'antd';
import { useApi } from '@/hooks/useApi';
import { Project, Organization } from '@/lib/db/schema';
import { format } from 'date-fns';

const { Title } = Typography;

interface ProjectData extends Project {
    organizationName?: string;
}

interface CurrentUser {
    role: 'superadmin' | 'admin' | 'user';
}

const ProjectManagementPage = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [form] = Form.useForm();

    const { apiFetch, loading, error, setError } = useApi();

    const isSuperadmin = useMemo(() => currentUser?.role === 'superadmin', [currentUser]);
    const canCreate = useMemo(() => currentUser?.role === 'superadmin' || currentUser?.role === 'admin', [currentUser]);

    const fetchData = useCallback(async () => {
        try {
            const [projectsRes, orgsRes, meRes] = await Promise.all([
                apiFetch<ProjectData[]>('/api/projects'),
                apiFetch<Organization[]>('/api/admin/organizations'),
                apiFetch<{ user: CurrentUser }>('/api/auth/me'),
            ]);

            if (projectsRes) setProjects(projectsRes);
            if (orgsRes) setOrganizations(orgsRes);
            if (meRes) setCurrentUser(meRes.user);

        } catch (err: unknown) {
            // Error is handled by useApi hook
        }
    }, [apiFetch]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAdd = () => {
        setEditingProject(null);
        form.resetFields();
        setIsModalVisible(true);
    };

    const handleEdit = (record: Project) => {
        setEditingProject(record);
        form.setFieldsValue(record);
        setIsModalVisible(true);
    };

    const handleDelete = async (id: string) => {
        try {
            const result = await apiFetch(`/api/projects/${id}`, { method: 'DELETE' });
            if (result === null) { // Successful DELETE returns 204 No Content
                message.success('Project deleted successfully!');
                fetchData(); // Refresh
            }
        } catch (err: unknown) {
            // Error is handled by useApi hook, but we can show a message here if needed
            message.error('Failed to delete project.');
        }
    };

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            const url = editingProject ? `/api/projects/${editingProject.id}` : '/api/projects';
            const method = editingProject ? 'PUT' : 'POST';

            const savedProject = await apiFetch<Project>(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });

            if (savedProject) {
                message.success(`Project ${editingProject ? 'updated' : 'created'} successfully!`);
                setIsModalVisible(false);
                fetchData(); // Refresh the list
            }
        } catch (err: unknown) {
            // Error is handled by useApi hook
        }
    };

    const columns: TableProps<ProjectData>['columns'] = [
        { title: 'Project Name (TH)', dataIndex: 'name_th', key: 'name_th', sorter: (a, b) => a.name_th.localeCompare(b.name_th) },
        { title: 'Project Name (EN)', dataIndex: 'name_en', key: 'name_en', sorter: (a, b) => a.name_en.localeCompare(b.name_en) },
        { title: 'Organization', dataIndex: 'organizationName', key: 'organizationName', render: (name) => name || 'N/A', sorter: (a, b) => (a.organizationName || '').localeCompare(b.organizationName || '') },
        {
            title: 'Duration (Months)',
            dataIndex: 'duration_months',
            key: 'duration_months',
            sorter: (a, b) => Number(a.duration_months) - Number(b.duration_months),
            render: (val) => val ? parseFloat(String(val)).toFixed(2) : '0.00'
        },
        {
            title: 'Created At',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (date: string) => date ? format(new Date(date), 'dd MMM yyyy') : '-',
            sorter: (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime(),
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Space size="middle">
                    <Button type="link" size="small" onClick={() => handleEdit(record)}>Edit</Button>
                    <Popconfirm title="Sure to delete?" onConfirm={() => handleDelete(record.id)}>
                        <Button type="link" size="small" danger>Delete</Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    if (!canCreate) {
        // Remove 'Action' column for users who cannot edit/delete
        columns.pop();
    }

    return (
        <Space direction="vertical" size="large" style={{ display: 'flex' }}>
            <Card style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px' }}>
                    <Title level={2} style={{ margin: 0 }}>Project Management</Title>
                    {canCreate && (
                        <Button type="primary" onClick={handleAdd}>
                            + Add Project
                        </Button>
                    )}
                </div>
            </Card>

            {error && <Alert style={{ margin: '0 24px' }} message="Error" description={error} type="error" showIcon closable onClose={() => setError(null)} />}

            <Card style={{ margin: '0 24px' }}>
                <Spin spinning={loading}>
                    <Table columns={columns} dataSource={projects} rowKey="id" />
                </Spin>
            </Card>

            <Modal
                title={editingProject ? 'Edit Project' : 'Add New Project'}
                open={isModalVisible}
                onOk={handleOk}
                onCancel={() => setIsModalVisible(false)}
                confirmLoading={loading}
                destroyOnHidden
            >
                <Form form={form} layout="vertical" name="project_form" style={{ marginTop: 24 }}>
                    <Form.Item
                        name="name_th"
                        label="Project Name (TH)"
                        rules={[{ required: true, message: 'Please input the Thai project name!' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="name_en"
                        label="Project Name (EN)"
                        rules={[{ required: true, message: 'Please input the English project name!' }]}
                    >
                        <Input />
                    </Form.Item>
                    <Form.Item
                        name="description"
                        label="Project Description"
                        rules={[{ required: false }]}
                    >
                        <Input.TextArea rows={4} placeholder="High-level overview of the project for AI context." />
                    </Form.Item>
                    <Form.Item
                        name="duration_months"
                        label="Duration (Months)"
                        rules={[{ required: true, message: 'Please input the duration in months!' }]}
                    >
                        <InputNumber min={0} step={0.5} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item
                        name="organization_id"
                        label="Organization"
                        hidden={!isSuperadmin}
                    >
                        <Select placeholder="Assign to an organization" allowClear>
                            {organizations.map((org) => (
                                <Select.Option key={org.id} value={org.id}>{org.name_en}</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </Space>
    );
};

export default ProjectManagementPage;
