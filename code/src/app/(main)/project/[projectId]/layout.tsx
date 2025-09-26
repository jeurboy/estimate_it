'use client';

import React, { useEffect, useRef } from 'react';
import { useProject } from '@/contexts/ProjectContext';
import { Card, Segmented, Spin, Button, Space, message } from 'antd';
import { usePathname, useRouter, useParams } from 'next/navigation';
import ProjectSelector from '@/components/ProjectSelector';
import { DashboardOutlined, CalculatorOutlined, FileTextOutlined, HistoryOutlined, ArrowLeftOutlined } from '@ant-design/icons';

const projectNavItems = [
    {
        label: 'Dashboard',
        key: '/dashboard',
        icon: <DashboardOutlined />,
    },
    {
        label: 'Estimator',
        key: '/estimator',
        icon: <CalculatorOutlined />,
    },
    {
        label: 'User Stories',
        key: '/user-stories',
        icon: <FileTextOutlined />,
    },
    {
        label: 'Task',
        key: '/history',
        icon: <HistoryOutlined />,
    },
];

export default function ProjectLayout({ children }: { children: React.ReactNode; }) {
    const { projects, selectedProject, setSelectedProject, setProjects } = useProject();
    const pathname = usePathname();
    const router = useRouter();
    const params = useParams<{ projectId: string }>(); // Use the hook to get params

    // Use a ref to prevent fetching projects multiple times on fast re-renders
    const projectsFetched = useRef(false);

    useEffect(() => {
        // Scenario 1: User changes project via the dropdown.
        if (selectedProject && selectedProject.id !== params.projectId) {
            router.push(`/project/${selectedProject.id}/dashboard`);
            return;
        }

        const loadProjectFromUrl = async () => {
            // Scenario 2: Direct navigation or page refresh.
            if (!selectedProject && params.projectId) {
                let projectList = projects;
                // If the project list is not yet loaded in the context, fetch it.
                if (projectList.length === 0 && !projectsFetched.current) {
                    projectsFetched.current = true; // Mark that we are starting a fetch
                    try {
                        const response = await fetch('/api/projects');
                        if (!response.ok) throw new Error('Failed to fetch projects');
                        const data = await response.json();
                        projectList = data.projects || [];
                        setProjects(projectList); // Update the context
                    } catch (error) {
                        message.error("Could not load project list.");
                        router.replace('/'); // Redirect home on error
                        return;
                    }
                }

                // Now that we have the list, find the project.
                const projectFromUrl = projectList.find(p => p.id === params.projectId);
                if (projectFromUrl) {
                    setSelectedProject(projectFromUrl);
                } else {
                    // If project from URL is not found, redirect.
                    router.replace('/');
                }
            }
        };

        loadProjectFromUrl();

    }, [params.projectId, projects, selectedProject, setProjects, setSelectedProject, router]);

    if (!selectedProject || selectedProject.id !== params.projectId) {
        return <Spin size="large" tip="Loading Project..." fullscreen />;
    }

    const segmentedOptions = projectNavItems.map(item => ({
        value: `/project/${params.projectId}${item.key}`,
        label: (
            <Space>
                {item.icon}
                {item.label}
            </Space>
        ),
    }));

    return (
        <>
            <Card style={{ marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                    <Space>
                        <ProjectSelector />
                        <Button icon={<ArrowLeftOutlined />} onClick={() => {
                            setSelectedProject(null);
                            setProjects([]); // Clear projects to force a reload on the homepage
                        }}>
                            กลับไปหน้ารายการโปรเจกต์
                        </Button>
                    </Space>
                    <Segmented
                        value={pathname}
                        options={segmentedOptions}
                        onChange={(value) => router.push(value as string)}
                    />
                </div>
            </Card>
            {children}
        </>
    );
}