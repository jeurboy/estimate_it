'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Col, Row, Typography, Statistic, Spin, message, Button, Empty } from 'antd';
import { usePathname } from 'next/navigation';
import { useProject } from '@/contexts/ProjectContext';
import { ArrowRightOutlined, FileTextOutlined, HistoryOutlined, ArrowLeftOutlined, CalculatorOutlined, BarsOutlined, ClockCircleOutlined } from '@ant-design/icons';
import Link from 'next/link';
import { EstimationHistory } from '@/lib/db/schema';
import { Bar } from '@ant-design/charts';

const { Title, Paragraph } = Typography;

interface DistributionData {
    range: string;
    count: number;
}

const DashboardPage = () => {
    const { selectedProject, setSelectedProject, setProjects } = useProject();
    // Define a color palette for charts
    const chartColors = ['#1677ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#eb2f96'];

    const [loadingStats, setLoadingStats] = useState(false);
    const [storyCount, setStoryCount] = useState(0);
    const [taskCount, setTaskCount] = useState(0);
    const [subTaskCount, setSubTaskCount] = useState(0);
    const [totalManDays, setTotalManDays] = useState(0);
    const [taskDistributionData, setTaskDistributionData] = useState<DistributionData[]>([]);
    const [taskCostDistributionData, setTaskCostDistributionData] = useState<DistributionData[]>([]);
    const pathname = usePathname();
    const isMobile = useIsMobile();

    const fetchDashboardData = useCallback(async () => {
        if (!selectedProject) {
            setStoryCount(0);
            setTaskCount(0);
            setSubTaskCount(0);
            setTotalManDays(0);
            setTaskCostDistributionData([]);
            setTaskDistributionData([]);
            return;
        }

        setLoadingStats(true);
        try {
            // Fetch all necessary data in one go
            const [storiesRes, tasksRes] = await Promise.all([
                fetch(`/api/user-stories?projectId=${selectedProject.id}`),
                fetch(`/api/history?projectId=${selectedProject.id}`)
            ]);

            const storiesData = await storiesRes.json();
            const tasksData = await tasksRes.json();
            // Ensure we are only using tasks for the currently selected project
            const allTasks: EstimationHistory[] = tasksData.history || [];
            const projectTasks: EstimationHistory[] = allTasks.filter(h => h.project_id === selectedProject.id && !h.is_reference);

            setStoryCount(storiesData.stories?.length || 0);
            setTaskCount(projectTasks.length);

            const totalSubTasks = projectTasks.reduce((sum, task) => {
                return sum + (Array.isArray(task.sub_tasks) ? task.sub_tasks.length : 0);
            }, 0);
            setSubTaskCount(totalSubTasks);

            const calculatedTotalManDays = projectTasks.reduce((sum, task) => {
                return sum + parseFloat(String(task.cost) || '0');
            }, 0);
            setTotalManDays(calculatedTotalManDays);

            // Process data for the Sub-Task distribution chart
            const distribution = [
                { range: '0-1 วัน', count: 0 },
                { range: '1-2 วัน', count: 0 },
                { range: '2-3 วัน', count: 0 },
                { range: '3-5 วัน', count: 0 },
                { range: '5-8 วัน', count: 0 },
                { range: '> 8 วัน', count: 0 },
            ];

            // Process data for the Task Cost distribution chart
            const taskCostDistribution = [
                { range: '0-1 วัน', count: 0 },
                { range: '1-2 วัน', count: 0 },
                { range: '2-3 วัน', count: 0 },
                { range: '3-5 วัน', count: 0 },
                { range: '5-8 วัน', count: 0 },
                { range: '> 8 วัน', count: 0 },
            ];

            // Iterate through each task, and then through each sub-task within it
            projectTasks.forEach((task) => {
                if (Array.isArray(task.sub_tasks)) {
                    task.sub_tasks.forEach(subTask => {
                        const cost = parseFloat(String(subTask.Days) || '0');
                        if (cost > 0 && cost <= 1) distribution[0].count++;
                        else if (cost > 1 && cost <= 2) distribution[1].count++;
                        else if (cost > 2 && cost <= 3) distribution[2].count++;
                        else if (cost > 3 && cost <= 5) distribution[3].count++;
                        else if (cost > 5 && cost <= 8) distribution[4].count++;
                        else if (cost > 8) distribution[5].count++;
                    });
                }

                // Iterate through each task for its total cost
                const cost = parseFloat(String(task.cost) || '0');
                if (cost > 0 && cost <= 1) taskCostDistribution[0].count++;
                else if (cost > 1 && cost <= 2) taskCostDistribution[1].count++;
                else if (cost > 2 && cost <= 3) taskCostDistribution[2].count++;
                else if (cost > 3 && cost <= 5) taskCostDistribution[3].count++;
                else if (cost > 5 && cost <= 8) taskCostDistribution[4].count++;
                else if (cost > 8) taskCostDistribution[5].count++;
            });

            setTaskDistributionData(distribution);
            setTaskCostDistributionData(taskCostDistribution);

        } catch (error) {
            message.error('Failed to load project statistics.');
        } finally {
            setLoadingStats(false);
        }
    }, [selectedProject]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData, pathname]);

    if (!selectedProject) {
        // This should be handled by the layout guard, but as a fallback:
        return null;
    }

    return (
        <Row gutter={32}>
            {/* Main Content Column */}
            <Col xs={24} lg={18}>
                <Title level={2} style={{ margin: 0 }}>Dashboard: {selectedProject.name_en}</Title>
                <Card style={{ marginTop: 16 }}>
                    <Paragraph type="secondary" style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{selectedProject.description}</Paragraph>
                </Card>

                <Spin spinning={loadingStats}>
                    <Row gutter={16} style={{ marginTop: 24 }}>
                        <Col xs={24} sm={12} md={8}>
                            <Link href={`/project/${selectedProject.id}/user-stories`}><Card hoverable><Statistic title="User Stories" value={storyCount} prefix={<FileTextOutlined style={{ color: '#1677ff' }} />} /></Card></Link>
                        </Col>
                        <Col xs={24} sm={12} md={8}>
                            <Link href={`/project/${selectedProject.id}/history`}><Card hoverable><Statistic title="Tasks" value={taskCount} prefix={<HistoryOutlined style={{ color: '#fa8c16' }} />} /></Card></Link>
                        </Col>
                        <Col xs={24} sm={12} md={8}>
                            <Link href={`/project/${selectedProject.id}/history`}><Card hoverable><Statistic title="Sub-tasks" value={subTaskCount} prefix={<BarsOutlined style={{ color: '#52c41a' }} />} /></Card></Link>
                        </Col>
                    </Row>

                    <Row gutter={24} style={{ marginTop: 24 }}>
                        <Col xs={24} xl={12}>
                            <Card title={<Title level={4} style={{ margin: 0 }}>Task Estimations Distribution</Title>}>
                                {taskCostDistributionData.some(d => d.count > 0) ? (
                                    <Bar
                                        data={taskCostDistributionData}
                                        xField="range"
                                        yField="count"
                                        seriesField="range"
                                        legend={false}
                                        color={chartColors}
                                        barWidthRatio={0.5}
                                        height={300}
                                        xAxis={{ title: { text: 'ช่วงวันทำงาน (Man-day)' } }}
                                        yAxis={{ title: { text: 'จำนวน Task' } }}
                                    />
                                ) : (
                                    <Empty description="No task estimation data available to display chart." />
                                )}
                            </Card>
                        </Col>
                        <Col xs={24} xl={12} style={{ marginTop: isMobile ? 24 : 0 }}>
                            <Card title={<Title level={4} style={{ margin: 0 }}>Sub-Task Estimations Distribution</Title>}>
                                {taskDistributionData.some(d => d.count > 0) ? (
                                    <Bar
                                        data={taskDistributionData}
                                        xField="range"
                                        yField="count"
                                        seriesField="range"
                                        legend={false}
                                        color={chartColors}
                                        barWidthRatio={0.5}
                                        height={300}
                                        xAxis={{ title: { text: 'ช่วงวันทำงาน (Man-day)' } }}
                                        yAxis={{ title: { text: 'จำนวน Sub-task' } }}
                                    />
                                ) : (
                                    <Empty description="No task estimation data available to display chart." />
                                )}
                            </Card>
                        </Col>
                    </Row>
                </Spin>
            </Col>

            {/* Actions Column */}
            <Col xs={24} lg={6} style={{ marginTop: isMobile ? 24 : 0 }}>
                <Title level={2} style={{ margin: 0, visibility: 'hidden' }}>&nbsp;</Title> {/* Spacer to align with main title */}
                <div style={{ paddingTop: '20px' }}> {/* Adjust this to align with description card */}
                    <Card style={{ marginBottom: 24, textAlign: 'center' }}>
                        <Statistic title="Total Estimated Days" value={totalManDays} precision={2} suffix="days" prefix={<ClockCircleOutlined />} />
                    </Card>
                    <Title level={4} style={{ marginBottom: 24, marginTop: 32 }}>Actions</Title>
                    <Row gutter={[16, 16]}>
                        <Col xs={24} sm={8} lg={24}>
                            <Link href={`/project/${selectedProject.id}/estimator`}>
                                <Card hoverable style={{ textAlign: 'center' }}><Statistic title="Go to Estimator" value=" " prefix={<CalculatorOutlined style={{ fontSize: '2em', color: '#722ed1' }} />} /></Card>
                            </Link>
                        </Col>
                        <Col xs={24} sm={8} lg={24}>
                            <Link href={`/project/${selectedProject.id}/user-stories`}>
                                <Card hoverable style={{ textAlign: 'center' }}><Statistic title="Manage User Stories" value=" " prefix={<FileTextOutlined style={{ fontSize: '2em', color: '#1677ff' }} />} /></Card>
                            </Link>
                        </Col>
                        <Col xs={24} sm={8} lg={24}>
                            <Link href={`/project/${selectedProject.id}/history`}>
                                <Card hoverable style={{ textAlign: 'center' }}><Statistic title="Manage Tasks" value=" " prefix={<HistoryOutlined style={{ fontSize: '2em', color: '#fa8c16' }} />} /></Card>
                            </Link>
                        </Col>
                    </Row>
                </div>
            </Col>
        </Row>
    );
};

const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkScreenSize = () => {
            setIsMobile(window.innerWidth < 992); // Ant Design's 'lg' breakpoint
        };

        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);

        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    return isMobile;
};

export default DashboardPage;
