'use client';

import React, { useState } from 'react';
import { Card, Table, Typography, Form, Input, InputNumber, Popconfirm, Space, Button, TableColumnType } from 'antd';
import type { TableProps } from 'antd';
import { SubTask } from '@/lib/services/geminiService';

interface ResultsTableProps {
    subTasks: SubTask[];
    cost: number;
    onSubTasksChange: (updatedTasks: SubTask[]) => void;
}

const { Text, Title } = Typography;

interface EditableCellProps {
    editing: boolean;
    dataIndex: keyof SubTask;
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
    children,
}) => {
    const inputNode = inputType === 'number' ? <InputNumber step="0.1" /> : <Input.TextArea autoSize={{ minRows: 1 }} />;

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

export default function ResultsTable({ subTasks, cost, onSubTasksChange }: ResultsTableProps) {
    const [form] = Form.useForm();
    const [editingKey, setEditingKey] = useState<React.Key>('');

    if (!subTasks || subTasks.length === 0) {
        return null;
    }

    const isEditing = (record: SubTask) => record['Sub-Task'] === editingKey;

    const edit = (record: Partial<SubTask> & { 'Sub-Task': React.Key }) => {
        form.setFieldsValue({ ...record });
        setEditingKey(record['Sub-Task']);
    };

    const cancel = () => {
        setEditingKey('');
    };

    const save = async (key: React.Key) => {
        try {
            const row = (await form.validateFields()) as SubTask;
            const newData = [...subTasks];
            const index = newData.findIndex((item) => key === item['Sub-Task']);

            if (index > -1) {
                const item = newData[index];
                newData.splice(index, 1, { ...item, ...row });
                onSubTasksChange(newData); // Propagate changes to the parent
                setEditingKey('');
            } else {
                // This case should not happen if keys are managed correctly
                setEditingKey('');
            }
        } catch (errInfo) {
            console.log('Validate Failed:', errInfo);
        }
    };

    const handleAddTask = () => {
        const newKey = `new-task-${Date.now()}`;
        const newTask: SubTask = {
            'Sub-Task': newKey,
            'Description': '',
            'Days': 0,
        };
        onSubTasksChange([...subTasks, newTask]);
        edit({ ...newTask, 'Sub-Task': newKey }); // Put the new row into edit mode
    };

    const columns: (TableColumnType<SubTask> & { editable?: boolean; dataIndex?: keyof SubTask })[] = [
        {
            title: 'Sub-Task',
            dataIndex: 'Sub-Task',
            width: '25%',
            editable: true,
        },
        {
            title: 'Description',
            dataIndex: 'Description',
            editable: true,
            render: (text: string) => <div className="whitespace-pre-line">{text}</div>,
        },
        {
            title: 'Days',
            dataIndex: 'Days',
            width: '10%',
            align: 'center',
            editable: true,
            render: (days: number) => parseFloat(String(days || '0')).toFixed(2),
        },
        {
            title: 'Action',
            key: 'action',
            width: '10%',
            align: 'center',
            render: (_: unknown, record: SubTask) => {
                const editable = isEditing(record);
                return editable ? (
                    <span>
                        <Typography.Link onClick={() => save(record['Sub-Task'])} style={{ marginRight: 8 }}>
                            Save
                        </Typography.Link>
                        <Popconfirm title="Sure to cancel?" onConfirm={cancel}>
                            <a>Cancel</a>
                        </Popconfirm>
                    </span>
                ) : (
                    <Typography.Link disabled={editingKey !== ''} onClick={() => edit(record)}>
                        Edit
                    </Typography.Link>
                );
            },
        },
    ];

    const mergedColumns = columns.map((col) => {
        if (!('editable' in col && col.editable)) {
            return col;
        }
        return {
            ...col,
            onCell: (record: SubTask) => ({
                record,
                inputType: col.dataIndex === 'Days' ? 'number' : 'text',
                dataIndex: col.dataIndex as keyof SubTask,
                title: String(col.title), // Ensure title is a string for the validation message
                editing: isEditing(record),
            }),
        };
    });

    return (
        <Form form={form} component={false}>
            <Card title={<Title level={4}>Estimation Results (Editable)</Title>} className="w-full mt-8">
                <Table
                    components={{
                        body: {
                            cell: EditableCell,
                        },
                    }}
                    columns={mergedColumns}
                    dataSource={subTasks}
                    rowKey="Sub-Task"
                    pagination={false}
                    bordered={true}
                />
                <Button onClick={handleAddTask} type="dashed" style={{ width: '100%', marginTop: 16 }}>
                    + Add New Sub-task
                </Button>
                <div className="text-right mt-4">
                    <Space>
                        <Text strong>Total Estimated Days:</Text>
                        <Text>{parseFloat(String(cost || '0')).toFixed(2)} days</Text>
                    </Space>
                </div>
            </Card>
        </Form>
    );
}