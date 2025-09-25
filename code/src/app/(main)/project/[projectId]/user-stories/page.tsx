'use client';

import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Space, Spin, Alert, Popconfirm, Typography, Card, Select, message } from 'antd';
import type { TableProps } from 'antd';
import { Project, UserStory } from '@/lib/db/schema';
import { useProject } from '@/contexts/ProjectContext';

const { Title, Text } = Typography;

const UserStoryPage = () => {
    const { selectedProject } = useProject();
    const [stories, setStories] = useState<UserStory[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingStory, setEditingStory] = useState<UserStory | null>(null);
    const [form] = Form.useForm();

    useEffect(() => {
        const fetchStories = async () => {
            if (!selectedProject) {
                setStories([]);
                return;
            }
            setLoading(true);
            try {
                const response = await fetch(`/api/user-stories?projectId=${selectedProject.id}`);
                if (!response.ok) throw new Error('Failed to fetch user stories');
                const data = await response.json();
                setStories(data.stories || []);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchStories();
    }, [selectedProject]);

    const handleAdd = () => {
        setEditingStory(null);
        form.resetFields();
        setIsModalVisible(true);
    };

    const handleEdit = (record: UserStory) => {
        setEditingStory(record);
        form.setFieldsValue(record);
        setIsModalVisible(true);
    };

    const handleDelete = async (id: string) => {
        try {
            const response = await fetch(`/api/user-stories/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete user story');
            setStories(stories.filter(s => s.id !== id));
            message.success('User story deleted successfully.');
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            const url = editingStory ? `/api/user-stories/${editingStory.id}` : '/api/user-stories';
            const method = editingStory ? 'PUT' : 'POST';

            const body = editingStory
                ? { storyText: values.story_text }
                : { storyText: values.story_text, projectId: selectedProject?.id };

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save user story');
            }

            const savedStory = await response.json();

            if (editingStory) {
                setStories(stories.map(s => s.id === savedStory.id ? savedStory : s));
            } else {
                setStories([savedStory, ...stories]);
            }

            setIsModalVisible(false);
            message.success(`User story ${editingStory ? 'updated' : 'created'} successfully.`);

        } catch (err: any) {
            setError(err.message);
        }
    };

    const columns: TableProps<UserStory>['columns'] = [
        {
            title: 'User Story',
            dataIndex: 'story_text',
            key: 'story_text',
            render: (text) => <div className="whitespace-pre-line">{text}</div>,
        },
        {
            title: 'Action',
            key: 'action',
            width: 150,
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} >
                    <Title level={2} style={{ margin: 0 }}>
                        User Stories for: {selectedProject?.name_en}
                    </Title>
                    <Button type="primary" onClick={handleAdd} disabled={!selectedProject}>
                        + Add User Story
                    </Button>
                </div>
            </Card>

            {error && <Alert message="Error" description={error} type="error" showIcon closable onClose={() => setError(null)} />}

            <Card>
                <Spin spinning={loading}>
                    <Table
                        columns={columns}
                        dataSource={stories}
                        rowKey="id"
                        locale={{ emptyText: 'No user stories found for this project.' }}
                    />
                </Spin>
            </Card>

            <Modal
                title={editingStory ? 'Edit User Story' : 'Add New User Story'}
                open={isModalVisible}
                onOk={handleOk}
                onCancel={() => setIsModalVisible(false)}
                destroyOnHidden
            >
                <Form form={form} layout="vertical" name="user_story_form" style={{ marginTop: 24 }}>
                    <Form.Item
                        name="story_text"
                        label="User Story"
                        rules={[{ required: true, message: 'Please input the user story!' }]}
                    >
                        <Input.TextArea rows={4} />
                    </Form.Item>
                </Form>
            </Modal>
        </Space>
    );
};

export default UserStoryPage;
