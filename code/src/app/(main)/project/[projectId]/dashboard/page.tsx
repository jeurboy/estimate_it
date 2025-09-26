'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Col, Row, Typography, Spin, Alert, Statistic, Table, Tag } from 'antd';
import { Line } from '@ant-design/charts';
import { FileTextOutlined, CalculatorOutlined, ClockCircleOutlined, BarChartOutlined } from '@ant-design/icons';
import { useParams, useRouter } from 'next/navigation';
import { useApi } from '@/hooks/useApi';
import { EstimationHistory } from '@/lib/db/schema';
import { format } from 'date-fns';

const { Title } = Typography;

interface TrendData {
    date: string;
    totalMandays: number;
}

interface DashboardData {
    storyCount: number;
    totalTasks: number;
    totalMandays: number;
    averageMandays: number;
    recentHistory: EstimationHistory[];
    estimationTrend: TrendData[];
}

const ProjectDashboardPage = () => {
    const params = useParams();
    const router = useRouter();
    const projectId = params.projectId as string;
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const { apiFetch, loading, error } = useApi();

    const fetchData = useCallback(async () => {
        if (!projectId) return;
        const data = await apiFetch<DashboardData>(`/api/projects/${projectId}/dashboard`);
        if (data) {
            setDashboardData(data);
        }
    }, [apiFetch, projectId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const recentHistoryColumns = [
        {
            title: 'Task / Feature Name',
            dataIndex: 'function_name',
            key: 'function_name',
        },
        {
            title: 'Estimated Man-days',
            dataIndex: 'cost',
            key: 'cost',
            render: (cost: string) => <Tag color="blue">{parseFloat(cost).toFixed(2)}</Tag>,
        },
        {
            title: 'Date',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (date: string) => format(new Date(date), 'dd MMM yyyy, HH:mm'),
        },
    ];

    if (loading) {
        return (
            <Spin size="large" tip="Loading Dashboard..." fullscreen>
                {/* This empty div is a placeholder for the fullscreen spin to work correctly without wrapping the entire page layout */}
            </Spin>
        );
    }

    if (error) {
        return <Alert message="Error" description={error} type="error" showIcon />;
    }

    if (!dashboardData) {
        return <Alert message="No data available for this project." type="info" showIcon />;
    }

    return (
        <div style={{ padding: '0 24px 24px 24px' }}>
            <Row gutter={[24, 24]}>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic title="Total User Stories" value={dashboardData.storyCount} prefix={<FileTextOutlined />} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic title="Total Estimated Tasks" value={dashboardData.totalTasks} prefix={<CalculatorOutlined />} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic title="Total Estimated Man-days" value={dashboardData.totalMandays} precision={2} prefix={<ClockCircleOutlined />} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic title="Avg. Man-days / Task" value={dashboardData.averageMandays} precision={2} prefix={<BarChartOutlined />} />
                    </Card>
                </Col>
            </Row>

            <Card style={{ marginTop: 24 }}>
                <Title level={4}>Recent Activity</Title>
                <Table
                    columns={recentHistoryColumns}
                    dataSource={dashboardData.recentHistory}
                    rowKey="id"
                    pagination={false}
                    onRow={(record) => {
                        return {
                            onClick: () => {
                                router.push(`/project/${projectId}/estimator?historyId=${record.id}`);
                            },
                            style: { cursor: 'pointer' }
                        };
                    }}
                />
            </Card>

            <Card style={{ marginTop: 24 }}>
                <Title level={4}>Man-day Estimation Trend</Title>
                {dashboardData.estimationTrend && dashboardData.estimationTrend.length > 1 ? (
                    <Line
                        data={dashboardData.estimationTrend}
                        xField="date"
                        yField="totalMandays"
                        height={300}
                        point={{ size: 4, shape: 'circle' }}
                        yAxis={{ title: { text: 'Total Man-days Estimated' } }}
                        xAxis={{ title: { text: 'Date' }, type: 'time' }}
                        tooltip={{ title: (d) => format(new Date(d), 'dd MMM yyyy') }}
                    />
                ) : (
                    <Alert message="Not enough data to display trend chart. At least two days with estimations are required." type="info" showIcon />
                )}
            </Card>
        </div>
    );
};

export default ProjectDashboardPage;