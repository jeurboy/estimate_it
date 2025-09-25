'use client';

import React, { useEffect, useState } from 'react';
import { Table, Input, Spin, Alert, Typography, Modal, Space, Button, Popconfirm, Divider, Card, Form, InputNumber, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { TableProps } from 'antd';
import { EstimationHistory } from '@/lib/db/schema';
import { useHistoryPage } from '@/hooks/useHistoryPage';
import { useProject } from '@/contexts/ProjectContext';

const { Title, Text } = Typography;
const { Search } = Input;

interface EditableCellProps extends React.HTMLAttributes<HTMLElement> {
    editing: boolean;
    dataIndex: string;
    title: any;
    inputType: 'number' | 'text';
    record: any;
    index: number;
}

const EditableCell: React.FC<React.PropsWithChildren<EditableCellProps>> = ({
    editing,
    dataIndex,
    title,
    inputType,
    record,
    index,
    children,
    ...restProps
}) => {
    const inputNode = inputType === 'number' ? <InputNumber step="0.1" style={{ width: '100%' }} /> : <Input.TextArea autoSize={{ minRows: 1 }} />;

    return (
        <td {...restProps}>
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

const ReferencesPage = () => {
    const {
        referenceHistory,
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
        handleSave,
    } = useHistoryPage();
    const { projects } = useProject();

    const [form] = Form.useForm();
    const [subTaskForm] = Form.useForm();
    const [editingKey, setEditingKey] = useState('');

    useEffect(() => {
        if (selectedRecord) {
            form.setFieldsValue(selectedRecord);
        }
    }, [selectedRecord, form]);

    const isEditing = (record: any) => record.key === editingKey;

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
            sorter: (a, b) => parseFloat(String(a.cost) || '0') - parseFloat(String(b.cost) || '0'),
            render: (cost: any) => `${parseFloat(String(cost || '0')).toFixed(2)}`,
        },
        {
            title: 'Source Project',
            dataIndex: 'source_project_id',
            key: 'source_project_id',
            render: (source_project_id: string | null) => {
                if (!source_project_id) return <Text type="secondary">Manual</Text>;
                const project = projects.find(p => p.id === source_project_id);
                return project ? project.name_en : <Text type="secondary">Unknown</Text>;
            },
        },
        {
            title: 'Date',
            dataIndex: 'created_at',
            key: 'created_at',
            sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
            render: (date: string) => new Date(date).toLocaleString(),
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
                    <Divider type="vertical" />
                    <Popconfirm
                        title="ลบข้อมูลอ้างอิงนี้?"
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

    const handleModalSubTasksChange = (newSubTasks: any[]) => {
        if (!selectedRecord) return;
        const newCost = newSubTasks.reduce((sum, task) => sum + (parseFloat(String(task.Days)) || 0), 0);
        setSelectedRecord({
            ...selectedRecord,
            sub_tasks: newSubTasks,
            cost: newCost,
        });
        form.setFieldsValue({ cost: newCost });
    };

    const subTaskColumns = [
        { title: 'Sub-Task', dataIndex: 'Sub-Task', key: 'sub-task', width: '25%', editable: true },
        { title: 'Description', dataIndex: 'Description', key: 'description', editable: true },
        { title: 'Days', dataIndex: 'Days', key: 'days', width: '10%', editable: true, render: (days: any) => parseFloat(String(days || '0')).toFixed(2) },
        {
            title: 'Action',
            dataIndex: 'action',
            width: '15%',
            render: (_: any, record: any) => {
                const editable = isEditing(record);
                return editable ? (
                    <span>
                        <Typography.Link onClick={() => saveSubTask(record.key)} style={{ marginRight: 8 }}>
                            บันทึก
                        </Typography.Link>
                        <Popconfirm title="ยกเลิกการแก้ไข?" onConfirm={() => setEditingKey('')}>
                            <a>ยกเลิก</a>
                        </Popconfirm>
                    </span>
                ) : (
                    <Space>
                        <Typography.Link disabled={editingKey !== ''} onClick={() => editSubTask(record)}>
                            Edit
                        </Typography.Link>
                        <Divider type="vertical" />
                        <Popconfirm title="ลบรายการย่อยนี้?" onConfirm={() => deleteSubTask(record.key)}>
                            <a style={{ color: 'red' }}>ลบ</a>
                        </Popconfirm>
                    </Space>
                );
            },
        },
    ];

    const editSubTask = (record: any) => {
        subTaskForm.setFieldsValue({ ...record });
        setEditingKey(record.key);
    };

    const deleteSubTask = (key: React.Key) => {
        const newSubTasks = selectedRecord?.sub_tasks.filter((item: any, index) => (item['Sub-Task'] || `task-${index}`) !== key) || [];
        handleModalSubTasksChange(newSubTasks);
    };

    const saveSubTask = async (key: React.Key) => {
        try {
            const row = await subTaskForm.validateFields();
            const newSubTasks = [...(selectedRecord?.sub_tasks || [])];
            const index = newSubTasks.findIndex((item: any, idx) => (item['Sub-Task'] || `task-${idx}`) === key);
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
        const newSubTask = { 'Sub-Task': newKey, Description: '', Days: 0, key: newKey };
        handleModalSubTasksChange([...(selectedRecord?.sub_tasks || []), newSubTask]);
        editSubTask(newSubTask);
    };

    return (
        <>
            <Space direction="vertical" size="large" style={{ display: 'flex' }}>
                <Card>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Title level={2} style={{ margin: 0 }}>การจัดการข้อมูลอ้างอิง</Title>
                        <Space>
                            <Search
                                placeholder="ค้นหาด้วยชื่อฟังก์ชัน..."
                                onSearch={(value) => setSearchTerm(value)}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                style={{ width: 300 }}
                                allowClear
                            />
                            <Button onClick={() => handleExportCSV(referenceHistory)} disabled={referenceHistory.length === 0}>
                                ส่งออกเป็น CSV
                            </Button>
                            <Button type="primary" onClick={handleOpenNewReferenceModal} >
                                + เพิ่มข้อมูลอ้างอิงใหม่
                            </Button>
                        </Space>
                    </div>
                </Card>
                {error && <Alert message="Error" description={error} type="error" showIcon />}
                <Card>
                    <Spin spinning={loading} tip="Loading references...">
                        <Table columns={columns} dataSource={referenceHistory} rowKey="id" pagination={{ pageSize: 10 }} />
                    </Spin>
                </Card>
            </Space>
            <Modal
                title={
                    modalMode === 'new' ? 'สร้างข้อมูลอ้างอิงใหม่' :
                        `แก้ไขรายละเอียด: ${selectedRecord?.function_name}`
                }
                open={isModalVisible}
                onCancel={handleCancelModal}
                footer={[
                    <Button key="back" onClick={handleCancelModal}>
                        ยกเลิก
                    </Button>,
                    (modalMode === 'new') ? (
                        <Button key="clone" type="primary" loading={isSaving} onClick={handleModalSave}>
                            บันทึกเป็นข้อมูลอ้างอิงใหม่
                        </Button>
                    ) : (
                        <Button key="submit" type="primary" loading={isSaving} onClick={handleModalSave} >
                            บันทึกการเปลี่ยนแปลง
                        </Button>
                    ),
                ]}
                width={1000}
                destroyOnHidden
            >
                {selectedRecord && (
                    <Form form={form} layout="vertical" initialValues={selectedRecord}>
                        <Form.Item name="function_name" label="Function Name" rules={[{ required: true }]}>
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
                                        onCell: (record: any) => ({
                                            record,
                                            inputType: col.dataIndex === 'Days' ? 'number' : 'text',
                                            dataIndex: col.dataIndex,
                                            title: col.title,
                                            editing: isEditing(record),
                                        }),
                                    };
                                })}
                                dataSource={selectedRecord.sub_tasks.map((t, i) => ({ ...t, key: t['Sub-Task'] || `task-${i}` }))}
                                pagination={false}
                                size="small"
                                bordered
                            />
                        </Form>
                        <Button onClick={addNewSubTask} style={{ marginTop: 16 }}>
                            เพิ่มงานย่อยใหม่
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

export default ReferencesPage;
