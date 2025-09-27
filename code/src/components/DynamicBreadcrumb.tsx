'use client';

import React from 'react';
import { Breadcrumb } from 'antd';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { HomeOutlined } from '@ant-design/icons';
import { useProject } from '@/contexts/ProjectContext';

const breadcrumbNameMap: { [key: string]: string } = {
    '/admin': 'Admin',
    '/admin/users': 'User Management',
    '/admin/organizations': 'Organizations',
    '/projects': 'Projects',
    '/project': 'Project',
    '/dashboard': 'Dashboard',
    '/estimator': 'Estimator',
    '/history': 'History',
    '/user-stories': 'User Stories',
    '/profile': 'Profile',
};

const DynamicBreadcrumb = () => {
    const { selectedProject } = useProject();
    const pathname = usePathname();
    const pathSegments = pathname.split('/').filter(i => i);

    const items = [
        {
            title: <Link href="/dashboard"><HomeOutlined /></Link>,
        },
        ...pathSegments.map((segment, index) => {
            const url = `/${pathSegments.slice(0, index + 1).join('/')}`;
            const isLast = index === pathSegments.length - 1;
            let name = breadcrumbNameMap[url] || segment.charAt(0).toUpperCase() + segment.slice(1);

            // Dynamically set project name
            if (pathSegments[index - 1] === 'project' && selectedProject && segment === selectedProject.id) {
                name = selectedProject.name_en;
            }

            return {
                title: isLast ? name : <Link href={url}>{name}</Link>,
            };
        }),
    ];

    // Don't show breadcrumb on the root dashboard page
    if (pathname === '/dashboard') return null;

    return <Breadcrumb style={{ margin: '16px 0' }} items={items} />;
};

export default DynamicBreadcrumb;