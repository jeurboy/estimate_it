'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Table, Typography, Tag, Alert, Spin, Breadcrumb, Descriptions, Card } from 'antd';
import type { TableProps } from 'antd';
import { format } from 'date-fns';
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
            render: (date: string) => format(new Date(date), 'dd MMM yyyy, HH:mm'),
        },
    ];

    if (loading) {
        return <div style={{ padding: '24px', textAlign: 'center' }}><Spin size="large" /></div>;
    }

    if (error) {
        return <div style={{ padding: '24px' }}><Alert message="Error" description={error} type="error" showIcon /></div>;
    }

    return (
        <div style={{ padding: '24px' }}>
            <Breadcrumb
                style={{ marginBottom: 16 }}
                items={[
                    { title: <Link href="/admin/organizations">Organizations</Link> },
                    { title: organization?.name_en || 'Details' },
                ]}
            />
            <Title level={2}>{organization?.name_en}</Title>
            <p>{organization?.name_th}</p>
            <p>{organization?.description}</p>

            <Title level={3} style={{ marginTop: 32 }}>Projects</Title>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
                {projects.length > 0 ? (
                    projects.map(project => (
                        <Card key={project.id} title={project.name_en} style={{ width: 300 }}>
                            <p>{project.name_th}</p>
                            <p>Duration: {project.duration_months} months</p>
                        </Card>
                    ))
                ) : (
                    <p>No projects found in this organization.</p>
                )}
            </div>

            <Title level={3} style={{ marginTop: 32 }}>Users</Title>
            <Table columns={userColumns} dataSource={users} rowKey="id" pagination={{ pageSize: 5 }} />
        </div>
    );
};

export default OrganizationDetailPage;
