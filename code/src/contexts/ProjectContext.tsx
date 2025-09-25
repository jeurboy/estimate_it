'use client';

import React, { createContext, useState, useContext, ReactNode, useMemo, useEffect } from 'react';
import { Project } from '@/lib/db/schema';

interface ProjectContextType {
    selectedProject: Project | null;
    setSelectedProject: (project: Project | null) => void;
    projects: Project[];
    setProjects: (projects: Project[]) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const PROJECT_STORAGE_KEY = 'selected_project_id';

export const ProjectProvider = ({ children }: { children: ReactNode }) => {
    const [selectedProject, setSelectedProjectInternal] = useState<Project | null>(null);
    const [projects, setProjects] = useState<Project[]>([]);

    // This effect runs on mount to check for a persisted project ID
    // and re-selects it once the project list is loaded.
    useEffect(() => {
        if (projects.length > 0 && !selectedProject) {
            const savedProjectId = localStorage.getItem(PROJECT_STORAGE_KEY);
            if (savedProjectId) {
                const projectToSelect = projects.find(p => p.id === savedProjectId);
                if (projectToSelect) {
                    setSelectedProjectInternal(projectToSelect);
                } else {
                    // The saved ID is stale (project might have been deleted), so remove it.
                    localStorage.removeItem(PROJECT_STORAGE_KEY);
                }
            }
        }
    }, [projects, selectedProject]);

    // Create a wrapper for setSelectedProject to also handle localStorage persistence.
    const setSelectedProject = (project: Project | null) => {
        setSelectedProjectInternal(project);
        if (project) {
            localStorage.setItem(PROJECT_STORAGE_KEY, project.id);
        } else {
            localStorage.removeItem(PROJECT_STORAGE_KEY);
        }
    };

    const value = useMemo(() => ({
        selectedProject,
        setSelectedProject,
        projects,
        setProjects,
    }), [selectedProject, projects]);

    return (
        <ProjectContext.Provider value={value}>
            {children}
        </ProjectContext.Provider>
    );
};

export const useProject = () => {
    const context = useContext(ProjectContext);
    if (context === undefined) {
        throw new Error('useProject must be used within a ProjectProvider');
    }
    return context;
};
