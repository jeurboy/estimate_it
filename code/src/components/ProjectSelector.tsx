'use client';

import { Select, Space, Typography } from 'antd';
import { useProject } from '@/contexts/ProjectContext';
import { useEffect, useState } from 'react';

const { Text } = Typography;

export default function ProjectSelector() {
    const { selectedProject, setSelectedProject, projects, loading } = useProject();

    const handleChange = (projectId: string) => {
        const project = projects.find(p => p.id === projectId) || null;
        setSelectedProject(project);
    };

    return (
        <Space>
            <Text>Project:</Text>
            <Select
                style={{ width: 250 }}
                placeholder="Select a project"
                value={selectedProject?.id}
                onChange={handleChange}
                loading={loading}
                options={projects.map(p => ({ value: p.id, label: p.name_en }))}
                allowClear
                onClear={() => setSelectedProject(null)}
            />
        </Space>
    );
}