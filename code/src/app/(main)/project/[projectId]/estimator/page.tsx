'use client';

import { useState, useEffect } from 'react';
import ResultsTable from '@/components/ResultsTable';
import SaveToHistoryForm from '@/components/SaveToHistoryForm';
import { Space, Typography, Spin, Alert, Input, Button, Card, Select, Row, Col, Steps, Modal, message, Tooltip, Table, Tag, Dropdown, MenuProps } from 'antd';
import { CheckCircleOutlined, ArrowLeftOutlined, RobotOutlined, BulbOutlined, EyeOutlined } from '@ant-design/icons';
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

const GENERATED_STORIES_KEY_PREFIX = 'generated_stories_';
const SUGGESTED_FEATURES_KEY_PREFIX = 'suggested_features_';


export default function EstimationPage() {
    // State for the new task input field, managed locally on this page.
    const [taskDescription, setTaskDescription] = useState('');
    const [isStoryModalVisible, setIsStoryModalVisible] = useState(false);
    const [modalContentSource, setModalContentSource] = useState<'generated' | 'suggested'>('generated');
    const [generatedStories, setGeneratedStories] = useState<GeneratedStory[]>([]);
    const [suggestedFeatures, setSuggestedFeatures] = useState<GeneratedStory[]>([]);
    const [isGeneratingStories, setIsGeneratingStories] = useState(false);
    const [modalTitle, setModalTitle] = useState('Generated User Stories');
    const [isSuggestingNewFeatures, setIsSuggestingNewFeatures] = useState(false);
    const [isSavingAll, setIsSavingAll] = useState(false);
    const [savedStories, setSavedStories] = useState<UserStory[]>([]);
    const [selectedStoryKeys, setSelectedStoryKeys] = useState<React.Key[]>([]);
    const [functionName, setFunctionName] = useState('');
    const [projectHistory, setProjectHistory] = useState<EstimationHistory[]>([]);
    const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
    const [isFromGeneratedStory, setIsFromGeneratedStory] = useState(false);
    const [hasStoredStories, setHasStoredStories] = useState(false);

    const { selectedProject } = useProject();

    const {
        isLoading,
        isSaving,
        messages, // This is of type ChatMessage[]
        results,
        lastPrompt,
        rawResponse,
        suggestedStory,
        setSuggestedStory,
        setSourceStoryId,
        handleEstimate,
        handleSaveToHistory,
        handleSubTasksChange,
        resetEstimation,
    } = useEstimationPage(selectedProject?.id);

    useEffect(() => {
        // Reset the flag whenever the task description changes manually
        // Only reset the story ID if the description no longer matches any saved story
        if (!savedStories.some(s => s.story_text === taskDescription)) {
            setSelectedStoryId(null);
        }
        setIsFromGeneratedStory(false);
    }, [taskDescription]);

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
            setSuggestedStory(null);
            setHasStoredStories(false);
            return;
        }

        // Load generated stories from local storage on project change
        const savedGeneratedStories = localStorage.getItem(`${GENERATED_STORIES_KEY_PREFIX}${selectedProject.id}`);
        if (savedGeneratedStories) {
            setGeneratedStories(JSON.parse(savedGeneratedStories));
        }

        // Load suggested features from local storage on project change
        const savedSuggestedFeatures = localStorage.getItem(`${SUGGESTED_FEATURES_KEY_PREFIX}${selectedProject.id}`);
        if (savedSuggestedFeatures) {
            setSuggestedFeatures(JSON.parse(savedSuggestedFeatures));
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

        // Clear previous generated stories from state and local storage before generating new ones
        setGeneratedStories([]);
        const key = `${GENERATED_STORIES_KEY_PREFIX}${selectedProject.id}`;
        localStorage.removeItem(key);

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
            setModalTitle('Generated User Stories');
            setModalContentSource('generated');
            localStorage.setItem(key, JSON.stringify(storiesWithClientIds)); // Save to local storage
            setGeneratedStories(storiesWithClientIds);
            setIsStoryModalVisible(true);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            message.error(`Error generating stories: ${errorMessage}`);
        } finally {
            setIsGeneratingStories(false);
        }
    };

    const handleSuggestNewFeatures = async () => {
        if (!selectedProject) return;
        setIsSuggestingNewFeatures(true);
        try {
            const response = await fetch('/api/suggest-features', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectDescription: selectedProject.description,
                    existingStories: savedStories,
                }),
            });
            if (!response.ok) throw new Error('Failed to suggest new features from API.');
            const data = await response.json();
            const storiesWithClientIds = (data.stories || []).map((story: { featureName: string; storyText: string; }) => ({
                ...story,
                clientId: `${story.featureName}-${Math.random()}`
            }));
            setModalTitle('Suggested New Features');
            setModalContentSource('suggested');
            const key = `${SUGGESTED_FEATURES_KEY_PREFIX}${selectedProject.id}`;
            localStorage.setItem(key, JSON.stringify(storiesWithClientIds)); // Save to local storage
            setSuggestedFeatures(storiesWithClientIds);
            setIsStoryModalVisible(true);
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            message.error(`Error suggesting new features: ${errorMessage}`);
        } finally {
            setIsSuggestingNewFeatures(false);
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
            // After saving the story, we need to find its ID and set it
            // so that the estimation can be linked to it.
            setSelectedStoryId(newStory.id);
            setSourceStoryId(newStory.id); // Explicitly set the story ID for the current estimation context
            return newStory; // Return the new story
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
            const selectedStories = (modalContentSource === 'generated' ? generatedStories : suggestedFeatures).filter(story =>
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

    const viewMenuItems: MenuProps['items'] = [];
    if (generatedStories.length > 0) {
        viewMenuItems.push({
            key: 'generated',
            label: `ดู Story ที่สร้างไว้ (${generatedStories.length})`,
            onClick: () => { setModalContentSource('generated'); setIsStoryModalVisible(true); }
        });
    }
    if (suggestedFeatures.length > 0) {
        viewMenuItems.push({
            key: 'suggested',
            label: `ดู Feature ที่แนะนำ (${suggestedFeatures.length})`,
            onClick: () => { setModalContentSource('suggested'); setIsStoryModalVisible(true); }
        });
    }

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
                    >
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text strong>Project Description</Text>
                                <Text type="secondary">Saved Stories: {savedStories.length}</Text>
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
                                    <Tooltip title={generatedStories.length > 0 ? 'Re-generate Stories' : 'Generate User Stories from Project Description'}>
                                        <Button type="primary" icon={<RobotOutlined />} onClick={handleGenerateStories} loading={isGeneratingStories} disabled={!selectedProject}>
                                            สร้าง Story
                                        </Button>
                                    </Tooltip>
                                    <Tooltip title="ให้ AI แนะนำ Feature ใหม่จาก Story ที่มีอยู่">
                                        <Button icon={<BulbOutlined />} onClick={handleSuggestNewFeatures} loading={isSuggestingNewFeatures} disabled={!selectedProject}>
                                            แนะนำ Feature
                                        </Button>
                                    </Tooltip>
                                    {viewMenuItems.length > 0 && (
                                        <Dropdown menu={{ items: viewMenuItems }} placement="bottomRight">
                                            <Button type="dashed" icon={<EyeOutlined />}>ดูผลลัพธ์ AI</Button>
                                        </Dropdown>
                                    )}
                                </Space>
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
                                const story = savedStories.find(s => s.story_text === value);
                                setTaskDescription(value || '');
                                if (!value) {
                                    setFunctionName(''); // Clear function name if story is cleared
                                    setSelectedStoryId(null);
                                } else if (story) {
                                    setFunctionName(story.feature_name);
                                    setSelectedStoryId(story.id);
                                    setSourceStoryId(story.id); // Explicitly set the story ID for the current estimation context
                                }
                            }}
                            optionRender={(option) => (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text ellipsis disabled={option.data.isEstimated} style={{ flex: 1 }}>
                                        <Text strong>[{option.data.feature_name}]</Text> {option.label}
                                    </Text>
                                    {option.data.isEstimated && <Tag color="success" style={{ marginLeft: 8 }}>ประเมินแล้ว</Tag>}
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
                                        handleEstimate(taskDescription, selectedProject.description, selectedProject.id, {
                                            isFromSavedStory: isTaskFromSavedStory(),
                                            isFromGeneratedStory: isFromGeneratedStory,
                                            storyId: selectedStoryId || undefined,
                                        });
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
                                    <Button type="link" style={{ padding: 0 }} onClick={async () => {
                                        const newStory = await handleSaveStory(suggestedStory);
                                        if (newStory) {
                                            // Update the task description to match the newly saved story
                                            setTaskDescription(newStory.story_text);
                                        }
                                    }}>+ Save as a new User Story
                                    </Button>
                                </Space>
                            </Card>
                        )}
                    </Card>
                </Col>
            </Row>

            {isLoading && (
                <Spin size="large" tip="Estimating, please wait...">
                    <div style={{ padding: '50px 0', background: 'rgba(0, 0, 0, 0.02)', borderRadius: '8px' }} />
                </Spin>
            )}
            {!isLoading && results && (
                <>
                    {!isTaskFromSavedStory() && (
                        <Alert
                            message="จำเป็นต้องดำเนินการ"
                            description="Task นี้ถูกสร้างขึ้นเอง กรุณาบันทึกเป็น User Story ผ่านการ์ด 'AI Suggestion' ด้านบนก่อนจึงจะสามารถบันทึกผลการประเมินนี้ได้"
                            type="warning"
                            showIcon
                            style={{ marginTop: 24, marginBottom: 16 }}
                        />
                    )}
                    <ResultsTable
                        subTasks={results.subTasks}
                        cost={results.cost}
                        onSubTasksChange={handleSubTasksChange}
                    />
                    {isTaskFromSavedStory() && (
                        <SaveToHistoryForm
                            functionName={functionName}
                            onSubmit={async (savedFunctionName, isReference) => {
                                const newHistoryRecord = await handleSaveToHistory(savedFunctionName, isReference, selectedProject?.id);
                                if (newHistoryRecord) {
                                    message.success('บันทึกผลการประเมินสำเร็จ!');
                                    resetEstimation();
                                    setTaskDescription('');
                                    setFunctionName('');
                                }
                            }}
                            isLoading={isSaving}
                        />
                    )}
                </>
            )}
            {!isLoading && !results && messages.length > 0 && !messages.some(m => m.type === 'error') && (
                <Alert message="Estimation complete" description="Results will be displayed here." type="info" showIcon />
            )}

            <Modal
                title={modalTitle}
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
                    dataSource={modalContentSource === 'generated' ? generatedStories : suggestedFeatures}
                    rowKey="clientId"
                    pagination={{ pageSize: 10 }}
                    size="small"
                />
            </Modal>
        </div>
    );
}