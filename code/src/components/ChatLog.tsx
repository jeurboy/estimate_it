'use client';

import { useState } from 'react';
import { Space, Typography, Button, Modal, Alert } from 'antd';

const { Text, Paragraph, Title } = Typography;

export interface ChatMessage {
    type: 'status' | 'error' | 'result';
    text: string;
}

export interface ChatLogProps {
    messages: ChatMessage[];
    prompt?: string | null;
    rawResponse?: string | null;
}

// Helper to format JSON strings for display
const formatJson = (jsonString: string) => {
    try {
        const parsed = JSON.parse(jsonString);
        return JSON.stringify(parsed, null, 2);
    } catch (e) {
        // Return the original string if it's not valid JSON
        return jsonString;
    }
};

export default function ChatLog({ messages, prompt, rawResponse }: ChatLogProps) {
    const [isModalVisible, setIsModalVisible] = useState(false);

    const showModal = () => setIsModalVisible(true);
    const handleCancel = () => setIsModalVisible(false);

    const hasLogData = prompt && rawResponse;

    return (
        <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #f0f0f0', padding: '8px', borderRadius: '4px', background: '#fafafa' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
                {messages.map((msg, index) => (
                    <Text key={index} type={msg.type === 'error' ? 'danger' : 'secondary'}>
                        {`[${msg.type.toUpperCase()}] ${msg.text}`}
                    </Text>
                ))}
            </Space>
            {hasLogData && (
                <div style={{ marginTop: '16px', textAlign: 'right' }}>
                    <Button onClick={showModal}>View AI Interaction Log</Button>
                </div>
            )}
            <Modal
                title="AI Interaction Log"
                open={isModalVisible}
                onCancel={handleCancel}
                footer={[
                    <Button key="close" onClick={handleCancel}>
                        Close
                    </Button>,
                ]}
                width={800}
            >
                <Title level={5}>System Prompt Sent to AI</Title>
                <Paragraph copyable={{ tooltips: ['Copy prompt', 'Copied!'] }}>
                    <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>{prompt}</pre>
                </Paragraph>

                <Title level={5}>Raw JSON Response from AI</Title>
                <Paragraph copyable={{ tooltips: ['Copy response', 'Copied!'] }}>
                    <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
                        {formatJson(rawResponse || '')}
                    </pre>
                </Paragraph>
            </Modal>
        </div>
    );
}
