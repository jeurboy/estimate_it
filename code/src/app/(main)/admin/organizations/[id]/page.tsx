'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Table, Typography, Tag, Alert, Spin, Breadcrumb, Space, Card, Row, Col, Statistic } from 'antd';
import type { TableProps } from 'antd';
import { format } from 'date-fns';
import { HomeOutlined, UserOutlined, AppstoreOutlined } from '@ant-design/icons';
import { useApi } from '@/hooks/useApi';
import Link from 'next/link';

const { Title } = Typography;

interface User {
    id: number;
    email: string;
    role: 'superadmin' | 'admin' | 'user';
    createdAt: string;
}

interface Organization {
    id: string;
    name_th: string;
    name_en: string;
    description: string;
    created_at: string;
}

interface Project {
    id: string;
    name_th: string;
    name_en: string;
    description: string;
    duration_months: number;
    created_at: string;
    updated_at: string;
}

interface OrgDetailsData {
    organization: Organization;
    projects: Project[];
    users: User[];
}

const roleColors = {
    superadmin: 'gold',
    admin: 'blue',
    user: 'green',
};

const OrganizationDetailPage = () => {
    const params = useParams();
    const orgId = params.id as string;

    const [organization, setOrganization] = useState<Organization | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const { apiFetch, loading, error } = useApi();

    const fetchData = useCallback(async () => {
        if (!orgId) return;
        const data = await apiFetch<OrgDetailsData>(`/api/admin/organizations/${orgId}`);
        if (data) {
            setOrganization(data.organization);
            setProjects(data.projects);
            setUsers(data.users);
        }
    }, [orgId, apiFetch]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const userColumns: TableProps<User>['columns'] = [
        { title: 'Email', dataIndex: 'email', key: 'email' },
        {
            title: 'Role',
            dataIndex: 'role',
            key: 'role',
            render: (role: User['role']) => <Tag color={roleColors[role]}>{role.toUpperCase()}</Tag>,
        },
        {
            title: 'Joined At',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date: string) => date ? format(new Date(date), 'dd MMM yyyy, HH:mm') : '-',
        },
    ];

    const projectColumns: TableProps<Project>['columns'] = [
        {
            title: 'Project Name',
            dataIndex: 'name_en',
            key: 'name_en',
            render: (text, record) => <Link href={`/project/${record.id}/dashboard`}>{text}</Link>,
        },
        {
            title: 'Description',
            dataIndex: 'description',
            key: 'description',
            ellipsis: true,
        },
        {
            title: 'Created At',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (date: string) => date ? format(new Date(date), 'dd MMM yyyy') : '-',
        },
    ];

    if (loading) {
        return <div style={{ padding: '24px', textAlign: 'center' }}><Spin size="large" /></div>;
    }

    if (error) {
        return <div style={{ padding: '24px' }}><Alert message="Error" description={error} type="error" showIcon /></div>;
    }

    return (
        <div>
            <Title level={2}>{organization?.name_en}</Title>
            <p>{organization?.name_th}</p>
            <p>{organization?.description}</p>

            <Row gutter={16} style={{ marginTop: 24 }}>
                <Col xs={24} sm={12}>
                    <Card>
                        <Statistic
                            title="Total Users"
                            value={users.length}
                            prefix={<UserOutlined />}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12}>
                    <Card>
                        <Statistic title="Total Projects" value={projects.length} prefix={<AppstoreOutlined />} />
                    </Card>
                </Col>
            </Row>

            <Title level={3} style={{ marginTop: 32 }}>Projects</Title>
            <Table columns={projectColumns} dataSource={projects} rowKey="id" pagination={{ pageSize: 5 }} />

            <Title level={3} style={{ marginTop: 32 }}>Users</Title>
            <Table columns={userColumns} dataSource={users} rowKey="id" pagination={{ pageSize: 5 }} />
        </div>
    );
};

export default OrganizationDetailPage;
