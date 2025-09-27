'use client';

import React, { useEffect, useState } from 'react';
import { Table, Input, Spin, Alert, Typography, Modal, Space, Button, Popconfirm, Divider, Card, Form, InputNumber, Empty, Tooltip } from 'antd';
import { EditOutlined, CopyOutlined, DeleteOutlined } from '@ant-design/icons';
import { TableProps } from 'antd';
import { EstimationHistory } from '@/lib/db/schema';
import { useHistoryPage } from '@/hooks/useHistoryPage';
import { useProject } from '@/contexts/ProjectContext';

import { SubTask } from '@/lib/services/geminiService';
const { Title, Paragraph, Text } = Typography;
const { Search } = Input;

interface EditableCellProps {
    editing: boolean;
    dataIndex: string;
    title: string;
    inputType: 'number' | 'text';
    record: SubTask;
    children?: React.ReactNode;
}

const EditableCell: React.FC<React.PropsWithChildren<EditableCellProps>> = ({
    editing,
    dataIndex,
    title,
    inputType,
    record,
    children,
}) => {
    const inputNode = inputType === 'number' ? <InputNumber step="0.1" style={{ width: '100%' }} /> : <Input.TextArea autoSize={{ minRows: 1 }} />;

    return (
        <td>
            {editing ? (
                <Form.Item
                    name={dataIndex}
                    style={{ margin: 0 }}
                    rules={[
                        {
                            required: true,
                            message: `Please Input ${title}!`,
                        },
                    ]}
                >
                    {inputNode}
                </Form.Item>
            ) : (
                children
            )}
        </td>
    );
};

const HistoryPage = () => {
    const {
        referenceHistory,
        nonReferenceHistory,
        history,
        loading,
        isSaving,
        error,
        setSearchTerm,
        selectedRecord,
        modalMode,
        setSelectedRecord,
        isModalVisible,
        handleViewDetails,
        handleCancelModal,
        handleExportCSV,
        handleDelete,
        handleOpenNewReferenceModal,
        handleOpenCloneModal,
        handleSave,
    } = useHistoryPage();
    const { selectedProject } = useProject();

    const [form] = Form.useForm();
    const [subTaskForm] = Form.useForm(); // Create a separate form for the sub-task table
    const [editingKey, setEditingKey] = useState('');

    useEffect(() => {
        if (selectedRecord) {
            form.setFieldsValue(selectedRecord);
        }
    }, [selectedRecord, form]);

    const isEditing = (record: { key: React.Key }) => record.key === editingKey;

    const columns: TableProps<EstimationHistory>['columns'] = [
        {
            title: 'Function Name',
            dataIndex: 'function_name',
            key: 'function_name',
        },
        {
            title: 'Estimated Days',
            dataIndex: 'cost',
            key: 'cost',
            sorter: (a, b) => Number(a.cost ?? 0) - Number(b.cost ?? 0),
            render: (cost: string | number | null) => `${Number(cost ?? 0).toFixed(2)}`,
        },
        {
            title: 'Date',
            dataIndex: 'created_at',
            key: 'created_at',
            sorter: (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime(),
            render: (date: string | null) => date ? new Date(date).toLocaleString() : '-',
            defaultSortOrder: 'descend',
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Space size="middle">
                    <Tooltip title="แก้ไขรายละเอียด">
                        <Button type="text" icon={<EditOutlined />} onClick={() => handleViewDetails(record)}>
                            แก้ไข
                        </Button>
                    </Tooltip>
                    {!record.is_reference && (
                        <>
                            <Divider type="vertical" />
                            <Tooltip title="คัดลอกไปเป็นข้อมูลอ้างอิง">
                                <Button type="text" icon={<CopyOutlined />} onClick={() => handleOpenCloneModal(record)}>
                                    เพิ่มเป็นข้อมูลอ้างอิง
                                </Button>
                            </Tooltip>
                        </>
                    )}
                    <Divider type="vertical" />
                    <Popconfirm
                        title="ลบรายการประเมินนี้?"
                        description="คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้? การกระทำนี้ไม่สามารถย้อนกลับได้"
                        onConfirm={() => handleDelete(record.id)}
                        okText="ใช่, ลบ"
                        cancelText="ยกเลิก"
                    >
                        <Tooltip title="ลบรายการ">
                            <Button type="text" icon={<DeleteOutlined />} danger>
                                ลบ
                            </Button>
                        </Tooltip>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const handleModalSave = async () => {
        try {
            const values = await form.validateFields();
            if (selectedRecord) {
                handleSave({ ...selectedRecord, ...values });
            }
        } catch (errInfo) {
            console.log('Validate Failed:', errInfo);
        }
    };

    const handleModalSubTasksChange = (newSubTasks: (SubTask & { key?: React.Key })[]) => {
        if (!selectedRecord) return;
        const newCost = newSubTasks.reduce((sum, task) => sum + (parseFloat(String(task.Days)) || 0), 0);
        setSelectedRecord({
            ...selectedRecord,
            sub_tasks: newSubTasks,
            cost: String(newCost),
        });
        form.setFieldsValue({ cost: newCost });
    };

    const subTaskColumns = [
        { title: 'Sub-Task', dataIndex: 'Sub-Task', key: 'sub-task', width: '25%', editable: true },
        { title: 'Description', dataIndex: 'Description', key: 'description', editable: true },
        { title: 'Days', dataIndex: 'Days', key: 'days', width: '10%', editable: true, render: (days: number | string) => parseFloat(String(days || '0')).toFixed(2) },
        {
            title: 'Action',
            dataIndex: 'action',
            width: '15%',
            render: (_: unknown, record: SubTask & { key: React.Key }) => {
                const editable = isEditing(record);
                return editable ? (
                    <span>
                        <Typography.Link onClick={() => saveSubTask(record.key)} style={{ marginRight: 8 }}>
                            Save
                        </Typography.Link>
                        <Popconfirm title="Sure to cancel?" onConfirm={() => setEditingKey('')}>
                            <a>Cancel</a>
                        </Popconfirm>
                    </span>
                ) : (
                    <Space>
                        <Typography.Link disabled={editingKey !== ''} onClick={() => editSubTask(record)}>
                            Edit
                        </Typography.Link>
                        <Divider type="vertical" />
                        <Popconfirm title="Sure to delete?" onConfirm={() => deleteSubTask(record.key)}>
                            <a style={{ color: 'red' }}>Delete</a>
                        </Popconfirm>
                    </Space>
                );
            },
        },
    ];

    const editSubTask = (record: SubTask & { key: React.Key }) => {
        subTaskForm.setFieldsValue({ ...record }); // Use the sub-task form
        setEditingKey(String(record.key));
    };

    const deleteSubTask = (key: React.Key) => {
        const newSubTasks = (selectedRecord?.sub_tasks as (SubTask & { key?: React.Key })[])?.filter(item => item.key !== key) || [];
        handleModalSubTasksChange(newSubTasks); // This will update the state
    };

    const saveSubTask = async (key: React.Key) => {
        try {
            const row = await subTaskForm.validateFields(); // Validate the sub-task form
            const newSubTasks: (SubTask & { key?: React.Key })[] = [...(selectedRecord?.sub_tasks || [])];
            const index = newSubTasks.findIndex((item: SubTask & { key?: React.Key }) => item.key === key);
            if (index > -1) {
                newSubTasks[index] = { ...newSubTasks[index], ...row };
                handleModalSubTasksChange(newSubTasks);
                setEditingKey('');
            }
        } catch (errInfo) {
            console.log('Validate Failed:', errInfo);
        }
    };

    const addNewSubTask = () => {
        const newKey = `new-task-${Date.now()}`;
        const newSubTask: SubTask & { key: React.Key } = { 'Sub-Task': newKey, Description: '', Days: 0, key: newKey };
        handleModalSubTasksChange([...(selectedRecord?.sub_tasks || []), newSubTask]);
        editSubTask(newSubTask);
    };

    return (
        <>
            <Space direction="vertical" size="large" style={{ display: 'flex' }}>
                {error && <Alert message="Error" description={error} type="error" showIcon />}
                <Card>
                    <Spin spinning={loading} tip="Loading history...">
                        <Table
                            columns={columns}
                            dataSource={nonReferenceHistory.filter(h => h.project_id === selectedProject?.id)}
                            rowKey="id"
                            pagination={{ pageSize: 10 }}
                            locale={{
                                emptyText: selectedProject ? 'No history found for this project.' : 'Please select a project to view its history.'
                            }}
                        />
                    </Spin>
                </Card>
            </Space>
            <Modal
                title={
                    modalMode === 'clone' ? `Clone to Reference: ${selectedRecord?.function_name}` :
                        `Edit Details: ${selectedRecord?.function_name}`
                }
                open={isModalVisible}
                onCancel={handleCancelModal}
                footer={[
                    <Button key="back" onClick={handleCancelModal}>
                        Cancel
                    </Button>,
                    (modalMode === 'clone') ? (
                        <Button key="clone" type="primary" loading={isSaving} onClick={handleModalSave}>
                            Save as New Reference
                        </Button>
                    ) : (
                        <Button key="submit" type="primary" loading={isSaving} onClick={handleModalSave}>
                            Save Changes
                        </Button>
                    ),
                ]}
                width={1000}
                destroyOnHidden
            >
                {selectedRecord && (
                    <Form form={form} layout="vertical" initialValues={selectedRecord}>
                        <Form.Item name="function_name" label="Function Name" rules={[{ required: true }]} >
                            <Input />
                        </Form.Item>
                        <Form.Item name="feature_description" label="Feature Description" rules={[{ required: true }]}>
                            <Input.TextArea rows={4} />
                        </Form.Item>
                        <Title level={5} style={{ marginTop: '16px' }}>Sub-Tasks Breakdown</Title>
                        <Form form={subTaskForm} component={false}>
                            <Table
                                components={{
                                    body: {
                                        cell: EditableCell,
                                    },
                                }}
                                columns={subTaskColumns.map(col => {
                                    if (!('editable' in col && col.editable)) return col;
                                    return {
                                        ...col,
                                        onCell: (record: SubTask & { key: React.Key }) => ({
                                            record,
                                            inputType: col.dataIndex === 'Days' ? 'number' : 'text',
                                            dataIndex: col.dataIndex,
                                            title: col.title,
                                            editing: isEditing(record),
                                        }),
                                    };
                                })}
                                dataSource={selectedRecord.sub_tasks.map((t, i) => ({ ...t, key: t['Sub-Task'] || `task-${i}` }))}
                                rowKey="key"
                                pagination={false}
                                size="small"
                                bordered
                            />
                        </Form>
                        <Button onClick={addNewSubTask} style={{ marginTop: 16 }}>
                            Add New Sub-task
                        </Button>
                        <div className="text-right mt-4">
                            <Text strong>Total Estimated Days: </Text>
                            <Form.Item name="cost" noStyle>
                                <InputNumber step="0.1" readOnly variant="borderless" formatter={(value) => `${value} days`} />
                            </Form.Item>
                        </div>
                    </Form>
                )}
            </Modal>
        </>
    );
};

export default HistoryPage;
