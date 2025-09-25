'use client';

import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Space, Spin, Alert, Popconfirm, Typography, Card } from 'antd';
import type { TableProps } from 'antd';
import { Project } from '@/lib/db/schema';

const { Title } = Typography;

const ProjectPage = () => {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [form] = Form.useForm();

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/projects');
            if (!response.ok) throw new Error('Failed to fetch projects');
            const data = await response.json();
            setProjects(data.projects);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

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
            const response = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete project');
            setProjects(projects.filter(p => p.id !== id));
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            const url = editingProject ? `/api/projects/${editingProject.id}` : '/api/projects';
            const method = editingProject ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save project');
            }

            setIsModalVisible(false);
            fetchProjects(); // Refresh the list

        } catch (err: any) {
            setError(err.message);
        }
    };

    const columns: TableProps<Project>['columns'] = [
        { title: 'Project Name (TH)', dataIndex: 'name_th', key: 'name_th', sorter: (a, b) => a.name_th.localeCompare(b.name_th) },
        { title: 'Project Name (EN)', dataIndex: 'name_en', key: 'name_en', sorter: (a, b) => a.name_en.localeCompare(b.name_en) },
        {
            title: 'Duration (Months)',
            dataIndex: 'duration_months',
            key: 'duration_months',
            sorter: (a, b) => a.duration_months - b.duration_months,
            render: (val) => parseFloat(String(val)).toFixed(2)
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Space size="middle">
                    <a onClick={() => handleEdit(record)}>Edit</a>
                    <Popconfirm title="Sure to delete?" onConfirm={() => handleDelete(record.id)}>
                        <a style={{ color: 'red' }}>Delete</a>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <Space direction="vertical" size="large" style={{ display: 'flex' }}>
            <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Title level={2} style={{ margin: 0 }}>Project Management</Title>
                    <Button type="primary" onClick={handleAdd}>
                        + Add Project
                    </Button>
                </div>
            </Card>

            {error && <Alert message="Error" description={error} type="error" showIcon closable onClose={() => setError(null)} />}

            <Card>
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
                </Form>
            </Modal>
        </Space>
    );
};

export default ProjectPage;
