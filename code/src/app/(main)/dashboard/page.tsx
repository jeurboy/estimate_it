'use client';

import React, { useState, useEffect } from 'react';
import { Card, Col, Row, Typography, Statistic, Spin, message, Button } from 'antd';
import { usePathname } from 'next/navigation';
import { useProject } from '@/contexts/ProjectContext';
import { ArrowRightOutlined, FileTextOutlined, HistoryOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { EstimationHistory } from '@/lib/db/schema';

const { Title, Paragraph } = Typography;

const DashboardPage = () => {
    const { selectedProject, setSelectedProject } = useProject();
    const [loadingStats, setLoadingStats] = useState(false);
    const [storyCount, setStoryCount] = useState(0);
    const [taskCount, setTaskCount] = useState(0);
    const pathname = usePathname();

    useEffect(() => {
        if (!selectedProject) {
            setStoryCount(0);
            setTaskCount(0);
            return;
        }

        const fetchStats = async () => {
            setLoadingStats(true);
            try {
                const [storiesRes, historyRes] = await Promise.all([
                    fetch(`/api/user-stories?projectId=${selectedProject.id}`),
                    fetch(`/api/history?projectId=${selectedProject.id}`)
                ]);

                const storiesData = await storiesRes.json();
                const historyData = await historyRes.json();

                setStoryCount(storiesData.stories?.length || 0);
                setTaskCount(historyData.history?.filter((h: EstimationHistory) => !h.is_reference).length || 0);
            } catch (error) {
                message.error('Failed to load project statistics.');
            } finally {
                setLoadingStats(false);
            }
        };

        fetchStats();
    }, [selectedProject, pathname]); // Refetch when selectedProject or pathname changes

    if (!selectedProject) {
        // This should be handled by the layout guard, but as a fallback:
        return null;
    }

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <Title level={2} style={{ margin: 0 }}>Dashboard: {selectedProject.name_en}</Title>
                <Button icon={<ArrowLeftOutlined />} onClick={() => setSelectedProject(null)}>
                    กลับไปหน้ารายการโปรเจกต์
                </Button>
            </div>
            <Paragraph type="secondary">{selectedProject.description}</Paragraph>

            <Spin spinning={loadingStats}>
                <Row gutter={16} style={{ marginTop: 24 }}>
                    <Col xs={24} sm={12} md={8}>
                        <Link href="/user-stories"><Card hoverable><Statistic title="User Stories" value={storyCount} prefix={<FileTextOutlined />} /></Card></Link>
                    </Col>
                    <Col xs={24} sm={12} md={8}>
                        <Link href="/history"><Card hoverable><Statistic title="Tasks" value={taskCount} prefix={<HistoryOutlined />} /></Card></Link>
                    </Col>
                </Row>
            </Spin>

            <Title level={4} style={{ marginTop: 48 }}>Actions</Title>
            <Row gutter={16} style={{ marginTop: 16 }}>
                <Col xs={24} sm={12} md={8}>
                    <Link href="/estimator"><Button type="primary" size="large" block icon={<ArrowRightOutlined />}>Go to Estimator</Button></Link>
                </Col>
            </Row>
        </div>
    );
};

export default DashboardPage;
