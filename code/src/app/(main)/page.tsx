'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Col, Row, Typography, Empty, Spin, message, Button, Divider, Space } from 'antd';
import { ReloadOutlined, AppstoreOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Bar, Line } from '@ant-design/charts';
import { EstimationHistory, Project } from '@/lib/db/schema';
import { useProject } from '@/contexts/ProjectContext';

const { Title, Paragraph, Text } = Typography;

interface ProjectManDays {
    projectName: string;
    totalMandays: number;
}

interface WeeklyTaskData {
    week: string;
    count: number;
}

const HomePage = () => {
    const router = useRouter();
    const { projects, setProjects, setSelectedProject } = useProject();
    const [chartData, setChartData] = useState<ProjectManDays[]>([]);
    const [tasksByWeekData, setTasksByWeekData] = useState<WeeklyTaskData[]>([]);
    const [loading, setLoading] = useState(true); // Combined loading state for all data on this page

    const fetchData = useCallback(async () => {
        setLoading(true); // This will now control loading for charts AND projects
        try {
            const [historyRes, projectsRes] = await Promise.all([
                fetch('/api/history'),
                fetch('/api/projects')
            ]);

            if (!historyRes.ok || !projectsRes.ok) {
                throw new Error('Failed to fetch data');
            }

            const historyData = await historyRes.json();
            const projectsData = await projectsRes.json();

            const fetchedProjects: Project[] = projectsData?.projects || [];
            const history: EstimationHistory[] = historyData?.history || [];
            setProjects(fetchedProjects); // Update the context with the fetched projects

            // --- Process data for Tasks per Week Chart ---
            const tasksByWeek: { [key: string]: number } = {};
            const getStartOfWeek = (dateStr: string | Date) => {
                const date = new Date(dateStr);
                const day = date.getDay();
                const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
                return new Date(date.setDate(diff)).toISOString().split('T')[0];
            };

            history.forEach(item => {
                if (!item.is_reference && item.created_at) {
                    const weekStart = getStartOfWeek(item.created_at);
                    tasksByWeek[weekStart] = (tasksByWeek[weekStart] || 0) + 1;
                }
            });

            const projectManDaysData = fetchedProjects
                .map(p => {
                    const totalMandays = history
                        .filter(h => h.project_id === p.id && !h.is_reference)
                        .reduce((sum, h) => sum + parseFloat(String(h.cost) || '0'), 0);
                    return {
                        projectName: p.name_en,
                        totalMandays: parseFloat(totalMandays.toFixed(2)),
                    };
                })
                .filter(p => p.totalMandays > 0) // Only include projects with estimations
                .sort((a, b) => b.totalMandays - a.totalMandays)
                .slice(0, 6); // Get top 6

            const weeklyData = Object.entries(tasksByWeek)
                .map(([week, count]) => ({ week, count }))
                .sort((a, b) => new Date(a.week).getTime() - new Date(b.week).getTime());

            setChartData(projectManDaysData);
            setTasksByWeekData(weeklyData);

        } catch (error) {
            console.error("Failed to load dashboard data:", error);
            message.error('An error occurred while loading dashboard data.');
        } finally {
            setLoading(false);
        }
    }, [setProjects]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <Spin spinning={loading} tip="Loading dashboard...">
                <Card variant="borderless" style={{ textAlign: 'center', background: 'none' }}>
                    <Title level={2}>Welcome to Estimate It!</Title>
                    <Paragraph type="secondary">
                        Select a project below to view its dashboard, or view the overall summary.
                    </Paragraph>
                </Card>

                <Title level={4} style={{ marginTop: 32, display: 'flex', alignItems: 'center' }}><AppstoreOutlined style={{ marginRight: 8 }} /> Select a Project</Title>
                <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                    {projects.map(project => (
                        <Col key={project.id} xs={24} sm={12} md={8} lg={6}>
                            <Card
                                hoverable
                                style={{ height: '100%', textAlign: 'left' }}
                                onClick={() => {
                                    setSelectedProject(project);
                                    router.push(`/project/${project.id}/dashboard`);
                                }}
                            >
                                <Title level={5}>{project.name_en}</Title>
                                <Paragraph type="secondary" ellipsis={{ rows: 3 }} style={{ whiteSpace: 'pre-wrap' }}>
                                    {project.description || 'No description available.'}
                                </Paragraph>
                            </Card>
                        </Col>
                    ))}
                    <Col xs={24} sm={12} md={8} lg={6}>
                        <Link href="/projects">
                            <Card hoverable style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', borderStyle: 'dashed' }}>
                                <Text type="secondary">+ Create or Manage Projects</Text>
                            </Card>
                        </Link>
                    </Col>
                </Row>

                <Divider />

                <Title level={3} style={{ textAlign: 'center', marginTop: 32 }}>System-wide Dashboard</Title>

                <Card style={{ marginTop: 24, textAlign: 'left' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Title level={4} style={{ margin: 0 }}>Top 6 Projects by Estimated Man-days</Title>
                        <Button icon={<ReloadOutlined />} onClick={() => fetchData()} loading={loading}>
                            Reload
                        </Button>
                    </div>
                    <Spin spinning={loading}>
                        {chartData.length > 0 ? (
                            <Bar
                                data={chartData}
                                xField="projectName"
                                yField="totalMandays"
                                seriesField="projectName"
                                legend={false}
                                height={400}
                                xAxis={{ title: { text: 'Project' } }}
                                yAxis={{ title: { text: 'Total Man-days' } }}
                            />
                        ) : (
                            !loading && <Empty description="No estimation data available to display chart." />
                        )}
                    </Spin>
                </Card>

                <Card style={{ marginTop: 24, textAlign: 'left' }}>
                    <Title level={4} style={{ margin: 0 }}>Tasks Created Per Week</Title>
                    <Spin spinning={loading}>
                        {tasksByWeekData.length > 0 ? (
                            <Line
                                data={tasksByWeekData}
                                xField="week"
                                yField="count"
                                height={300}
                                point={{ size: 5, shape: 'diamond' }}
                                yAxis={{ title: { text: 'Number of Tasks' } }}
                                xAxis={{ title: { text: 'Week Starting' } }}
                            />
                        ) : (
                            !loading && <Empty description="No task data available to display chart." />
                        )}
                    </Spin>
                </Card>
            </Spin>
        </div>
    );
};

export default HomePage;