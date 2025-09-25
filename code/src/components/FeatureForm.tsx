'use client';

import { Form, Input, Button, Card } from 'antd';

interface FeatureFormProps {
    onSubmit: (featureDescription: string) => void;
    isLoading: boolean;
}

export default function FeatureForm({ onSubmit, isLoading }: FeatureFormProps) {
    const [form] = Form.useForm();

    const onFinish = (values: { description: string }) => {
        if (!values.description?.trim() || isLoading) return;
        onSubmit(values.description);
    };

    return (
        <Card title="Describe your Feature" className="w-full">
            <Form
                form={form}
                onFinish={onFinish}
                layout="vertical"
                disabled={isLoading}
            >
                <Form.Item
                    name="description"
                    label="Feature Description"
                    rules={[{ required: true, message: 'Please describe the feature you want to estimate.' }]}
                >
                    <Input.TextArea
                        rows={5}
                        placeholder="e.g., 'As a user, I want to be able to reset my password via email...'"
                    />
                </Form.Item>
                <Form.Item>
                    <Button type="primary" htmlType="submit" loading={isLoading} block>
                        Estimate
                    </Button>
                </Form.Item>
            </Form>
        </Card>
    );
}