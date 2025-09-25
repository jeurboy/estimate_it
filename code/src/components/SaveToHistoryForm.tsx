'use client';

import { useState, useEffect } from 'react';
import { Input, Button, Space, Typography, Checkbox } from 'antd';
import { CheckboxChangeEvent } from 'antd/es/checkbox';

const { Text } = Typography;

interface SaveToHistoryFormProps {
    onSubmit: (functionName: string, isReference: boolean) => void;
    functionName: string;
    isLoading: boolean;
}

export default function SaveToHistoryForm({ onSubmit, functionName: initialFunctionName, isLoading }: SaveToHistoryFormProps) {
    const [functionName, setFunctionName] = useState(initialFunctionName);
    const [isReference, setIsReference] = useState(false);

    useEffect(() => {
        setFunctionName(initialFunctionName);
    }, [initialFunctionName]);

    const handleSave = () => {
        if (functionName.trim()) {
            onSubmit(functionName.trim(), isReference);
        }
    };

    return (
        <div style={{ border: '1px solid #d9d9d9', padding: '16px', borderRadius: '8px', marginTop: '16px' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
                <Text strong>Save Estimation to History</Text>
                <Text type="secondary">Enter a name for this estimation to save it.</Text>
                <Checkbox
                    checked={isReference}
                    onChange={(e: CheckboxChangeEvent) => setIsReference(e.target.checked)}
                    disabled={isLoading}
                >Save as a reference for future AI estimations</Checkbox>
                <Space.Compact style={{ width: '100%' }}>
                    <Input
                        placeholder="e.g., 'User Login Function' or 'Payment Gateway Integration'"
                        value={functionName}
                        onChange={(e) => setFunctionName(e.target.value)}
                        disabled={isLoading}
                    />
                    <Button type="primary" onClick={handleSave} loading={isLoading} disabled={!functionName.trim()}>
                        Save to History
                    </Button>
                </Space.Compact>
            </Space>
        </div>
    );
}