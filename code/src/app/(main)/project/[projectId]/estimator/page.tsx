'use client';

import { useState, useEffect } from 'react';
import ResultsTable from '@/components/ResultsTable';
import ChatLog from '@/components/ChatLog';
import SaveToHistoryForm from '@/components/SaveToHistoryForm';
import { Space, Typography, Spin, Alert, Input, Button, Card, Select, Row, Col, Steps, Modal, message, Tooltip, Collapse, Table } from 'antd';
import { CheckCircleOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useProject } from '@/contexts/ProjectContext';
import Link from 'next/link';
import useEstimationPage from '@/hooks/useEstimationPage';
import { UserStory, EstimationHistory } from '@/lib/db/schema';

const { Title, Text } = Typography;

interface GeneratedStory {
    featureName: string;
    storyText: string;
    clientId: string; // A unique ID generated on the client
}

export default function EstimationPage() {
    // State for the new task input field, managed locally on this page.
    const [taskDescription, setTaskDescription] = useState('');
    const [isStoryModalVisible, setIsStoryModalVisible] = useState(false);
    const [generatedStories, setGeneratedStories] = useState<GeneratedStory[]>([]);
    const [isGeneratingStories, setIsGeneratingStories] = useState(false);
    const [isSavingAll, setIsSavingAll] = useState(false);
    const [savedStories, setSavedStories] = useState<UserStory[]>([]);
    const [selectedStoryKeys, setSelectedStoryKeys] = useState<React.Key[]>([]);
    const [functionName, setFunctionName] = useState('');
    const [projectHistory, setProjectHistory] = useState<EstimationHistory[]>([]);

    const { selectedProject } = useProject();

    const {
        isLoading,
        isSaving,
        messages, // This is of type ChatMessage[]
        results,
        lastPrompt,
        rawResponse,
        suggestedStory,
        handleEstimate,
        handleSaveToHistory,
        handleSubTasksChange,
        resetEstimation,
    } = useEstimationPage();

    // This effect will pre-fill the function name for the history form
    // when the AI suggests a story after a manual estimation.
    useEffect(() => {
        if (suggestedStory) {
            setFunctionName(suggestedStory.featureName);
        }
    }, [suggestedStory]);

    useEffect(() => {
        if (!selectedProject) {
            setSavedStories([]);
            setProjectHistory([]);
            setGeneratedStories([]); // Clear generated stories when project changes
            return;
        }

        const fetchProjectData = async () => {
            // Fetch saved user stories
            try {
                const storiesRes = await fetch(`/api/user-stories?projectId=${selectedProject.id}`);
                if (storiesRes.ok) {
                    const data = await storiesRes.json();
                    setSavedStories(data.stories || []);
                }
            } catch (error) {
                console.error("Failed to fetch saved stories:", error);
                message.error("Could not load saved user stories.");
            }

            // Fetch estimation history for the project
            try {
                const historyRes = await fetch(`/api/history`); // Fetches all history
                if (historyRes.ok) {
                    const data = await historyRes.json();
                    const filteredHistory = (data.history || []).filter(
                        (h: EstimationHistory) => h.project_id === selectedProject.id && !h.is_reference
                    );
                    setProjectHistory(filteredHistory);
                }
            } catch (error) {
                console.error("Failed to fetch project history:", error);
            }
        };

        fetchProjectData();
    }, [selectedProject]);

    const handleGenerateStories = async () => {
        if (!selectedProject) return;
        setIsGeneratingStories(true);
        try {
            const response = await fetch('/api/generate-stories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectDescription: selectedProject.description }),
            });
            if (!response.ok) throw new Error('Failed to generate stories from API.');
            const data = await response.json();
            // Augment stories with a unique client-side ID for the key
            const storiesWithClientIds = (data.stories || []).map((story: { featureName: string; storyText: string; }) => ({
                ...story,
                clientId: `${story.featureName}-${Math.random()}`
            }));
            setGeneratedStories(storiesWithClientIds);
            setIsStoryModalVisible(true);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            message.error(`Error generating stories: ${errorMessage}`);
        } finally {
            setIsGeneratingStories(false);
        }
    };

    const handleSaveStory = async (story: Omit<GeneratedStory, 'clientId'>) => {
        if (!selectedProject) return;
        try {
            const response = await fetch('/api/user-stories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectId: selectedProject.id, storyText: story.storyText, featureName: story.featureName }),
            });
            if (!response.ok) throw new Error('Failed to save story.');
            const newStory = await response.json();
            setSavedStories(prev => [...prev, newStory]);
            message.success('User story saved!');
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            message.error(`Error saving story: ${errorMessage}`);
        }
    };

    const handleSaveSelectedStories = async () => {
        if (!selectedProject || selectedStoryKeys.length === 0) return;
        setIsSavingAll(true);
        try {
            // Find the full story objects from the selected keys
            const selectedStories = generatedStories.filter(story =>
                selectedStoryKeys.includes(story.clientId)
            );

            // Filter out stories with feature names that already exist
            const newStoriesToSave = selectedStories.filter(
                genStory => !savedStories.some(saved => saved.feature_name === genStory.featureName)
            );

            if (newStoriesToSave.length === 0) {
                message.info('All selected stories already have existing feature names. Nothing to save.');
                return;
            }

            const promises = newStoriesToSave.map(story =>
                fetch('/api/user-stories', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ projectId: selectedProject.id, storyText: story.storyText, featureName: story.featureName }),
                })
            );

            const responses = await Promise.all(promises);
            const newStories: UserStory[] = [];

            for (const response of responses) {
                if (response.ok) {
                    newStories.push(await response.json());
                }
            }

            setSavedStories(prev => [...prev, ...newStories]);
            const skippedCount = selectedStories.length - newStoriesToSave.length;
            let successMessage = `Successfully saved ${newStories.length} new user stories.`;
            if (skippedCount > 0) {
                successMessage += ` Skipped ${skippedCount} stories with duplicate feature names.`;
            }
            message.success(successMessage);
            setSelectedStoryKeys([]); // Clear selection
            setIsStoryModalVisible(false);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            message.error(`Error saving all stories: ${errorMessage}`);
        } finally {
            setIsSavingAll(false);
        }
    };

    const isFeatureNameDuplicate = (featureName: string): boolean => {
        return savedStories.some(story => story.feature_name === featureName);
    };

    const isTaskFromSavedStory = (): boolean => {
        return savedStories.some(story => story.story_text === taskDescription);
    };

    const isStoryEstimated = (story: UserStory): boolean => {
        return projectHistory.some(historyItem => historyItem.function_name === story.feature_name);
    };

    const generatedStoriesColumns = [
        {
            title: 'Feature Name',
            dataIndex: 'featureName',
            key: 'featureName',
            width: '30%',
        },
        {
            title: 'User Story',
            dataIndex: 'storyText',
            key: 'storyText',
        },
        {
            title: 'Actions',
            key: 'actions',
            width: '20%',
            render: (_: unknown, record: GeneratedStory) => (
                <Space>
                    <Button onClick={() => {
                        setTaskDescription(record.storyText);
                        setFunctionName(record.featureName);
                        setIsStoryModalVisible(false);
                    }}>Use</Button>
                    {isFeatureNameDuplicate(record.featureName) ? (
                        <Tooltip title="A story with this feature name already exists.">
                            <Button disabled>Saved</Button>
                        </Tooltip>
                    ) : (
                        <Button onClick={() => handleSaveStory(record)}>Save</Button>
                    )}
                </Space>
            ),
        },
    ];

    const rowSelection = {
        selectedRowKeys: selectedStoryKeys,
        onChange: (newSelectedRowKeys: React.Key[]) => {
            setSelectedStoryKeys(newSelectedRowKeys);
        },
        getCheckboxProps: (record: GeneratedStory) => ({
            disabled: isFeatureNameDuplicate(record.featureName), // Disable checkbox if story is already saved
        }),
    };

    return (
        <div>
            <Title level={2} style={{ marginBottom: 24 }}>Feature Estimator</Title>

            <Steps
                current={results ? 2 : (taskDescription ? 1 : 0)}
                items={[
                    { title: 'Configuration' },
                    { title: 'Estimate Task' },
                    { title: 'Review Results' },
                ]}
                style={{ marginBottom: 24 }}
            />

            <Row gutter={24}>
                <Col xs={24} md={12}>
                    <Card
                        title={<Title level={4} style={{ margin: 0 }}>1. Project Context</Title>}
                        style={{ height: '100%' }}
                        extra={
                            <Space>
                                <a href="/projects" target="_blank" rel="noopener noreferrer">Manage Project</a>
                                <a href="/user-stories" target="_blank" rel="noopener noreferrer">Manage Stories</a>
                            </Space>
                        }
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <div style={{ marginBottom: '8px' }}>
                                <Text strong>Project Description</Text>
                            </div>
                            <div
                                style={{
                                    flex: 1,
                                    marginBottom: 16,
                                    padding: '8px 12px',
                                    border: '1px solid #d9d9d9',
                                    borderRadius: '6px',
                                    backgroundColor: '#fafafa',
                                    overflowY: 'auto',
                                    whiteSpace: 'pre-wrap', // This preserves newlines and spacing
                                }}
                            >
                                <Typography.Paragraph style={{ margin: 0 }}>
                                    {selectedProject?.description || 'No project selected. Please choose a project from the header.'}
                                </Typography.Paragraph>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Space>
                                    <Button onClick={handleGenerateStories} loading={isGeneratingStories} disabled={!selectedProject}>
                                        {generatedStories.length > 0 ? 'Re-generate Stories' : 'Generate User Stories'}
                                    </Button>
                                    {generatedStories.length > 0 && (
                                        <Button onClick={() => setIsStoryModalVisible(true)}>
                                            View Generated Stories ({generatedStories.length})
                                        </Button>
                                    )}
                                </Space>
                                <Text type="secondary">Saved Stories: {savedStories.length}</Text>
                            </div>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} md={12}>
                    <Card title={<Title level={4} style={{ margin: 0 }}>2. Task to Estimate</Title>} style={{ height: '100%' }}>
                        <Select
                            showSearch
                            placeholder="Or select a saved user story..."
                            style={{ width: '100%', marginBottom: 16 }}
                            onChange={(value: string | undefined) => {
                                setTaskDescription(value || ''); // Ensure value is a string
                                if (!value) {
                                    setFunctionName(''); // Clear function name if story is cleared
                                }
                                const story = savedStories.find(s => s.story_text === value);
                                if (story) setFunctionName(story.feature_name);
                            }}
                            optionRender={(option) => (
                                <div style={{ backgroundColor: option.data.isEstimated ? '#f6ffed' : 'transparent' }}>
                                    <Space>
                                        {`[${option.data.feature_name}] ${option.label}`}
                                        {option.data.isEstimated && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
                                    </Space>
                                </div>
                            )}
                            options={savedStories.map(s => ({
                                value: s.story_text,
                                label: s.story_text, // The text part for searching
                                feature_name: s.feature_name, // Custom data
                                isEstimated: isStoryEstimated(s), // Custom data
                            }))}
                            filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                            allowClear
                        />
                        <Input.TextArea value={taskDescription} onChange={(e) => setTaskDescription(e.target.value)} rows={10} placeholder="Describe the specific task you want to estimate now." />
                        <Space style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                            <Button onClick={() => setTaskDescription('')} disabled={!taskDescription.trim()}>Clear</Button>
                            <Button
                                type="primary"
                                onClick={() => {
                                    if (selectedProject) {
                                        handleEstimate(taskDescription, selectedProject.description, selectedProject.id, isTaskFromSavedStory());
                                    }
                                }}
                                loading={isLoading}
                                disabled={!taskDescription.trim()}
                            >
                                Estimate Task &rarr;
                            </Button>
                        </Space>
                        {!isLoading && suggestedStory && (
                            <Card size="small" style={{ marginTop: 16, background: '#e6f4ff' }}>
                                <Space direction="vertical" style={{ width: '100%' }}>
                                    <Text strong>AI Suggestion: Convert this task to a User Story?</Text>
                                    <Card size="small">
                                        <Typography.Text strong>{suggestedStory.featureName}</Typography.Text>
                                        <Typography.Paragraph>{suggestedStory.storyText}</Typography.Paragraph>
                                    </Card>
                                    <Button type="link" style={{ padding: 0 }} onClick={() => handleSaveStory(suggestedStory)}>
                                        + Save as a new User Story
                                    </Button>
                                </Space>
                            </Card>
                        )}
                    </Card>
                </Col>
            </Row>

            {messages.length > 0 && (
                <Collapse
                    style={{ marginTop: 24 }}
                    items={[{
                        key: '1',
                        label: 'View AI Interaction Log',
                        children: <ChatLog messages={messages} prompt={lastPrompt} rawResponse={rawResponse} />,
                    }]}
                />
            )}
            {isLoading && (
                <Spin size="large" tip="Estimating, please wait...">
                    <div style={{ padding: '50px 0', background: 'rgba(0, 0, 0, 0.02)', borderRadius: '8px' }} />
                </Spin>
            )}
            {!isLoading && results && (
                <>
                    <ResultsTable subTasks={results.subTasks} cost={results.cost} onSubTasksChange={handleSubTasksChange} />
                    <SaveToHistoryForm functionName={functionName}
                        onSubmit={async (savedFunctionName, isReference) => {
                            const newHistoryRecord = await handleSaveToHistory(savedFunctionName, isReference, selectedProject?.id);
                            if (newHistoryRecord) {
                                // Add the new record to the local state to update the UI instantly
                                setProjectHistory(prev => [newHistoryRecord, ...prev]);
                                // Reset the form and results to the initial state for the next estimation
                                resetEstimation();
                                setTaskDescription('');
                                setFunctionName('');
                            }
                        }}
                        isLoading={isSaving}
                    />
                </>
            )}
            {!isLoading && !results && messages.length > 0 && !messages.some(m => m.type === 'error') && (
                <Alert message="Estimation complete" description="Results will be displayed here." type="info" showIcon />
            )}

            <Modal
                title="Generated User Stories"
                open={isStoryModalVisible}
                onCancel={() => setIsStoryModalVisible(false)}
                footer={[
                    <Button key="close" onClick={() => setIsStoryModalVisible(false)}>
                        Close
                    </Button>,
                    <Button
                        key="saveSelected"
                        type="primary"
                        loading={isSavingAll}
                        onClick={handleSaveSelectedStories}
                        disabled={selectedStoryKeys.length === 0}
                    >
                        Save Selected ({selectedStoryKeys.length})
                    </Button>,
                ]}
                width={1200}
            >
                <Table
                    rowSelection={rowSelection}
                    columns={generatedStoriesColumns}
                    dataSource={generatedStories}
                    rowKey="clientId"
                    pagination={{ pageSize: 10 }}
                    size="small"
                />
            </Modal>
        </div>
    );
}