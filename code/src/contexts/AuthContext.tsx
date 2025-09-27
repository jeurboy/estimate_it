'use client';

import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { Spin, Modal } from 'antd';

interface User {
    id: number;
    email: string;
    role: 'superadmin' | 'admin' | 'user';
    organization_id?: string;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (userData: User) => void;
    logout: () => void;
    checkUser: () => Promise<void>;
    showSessionExpiredModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    // Use a ref to track modal visibility to prevent re-renders and dependency changes.
    const isModalVisibleRef = useRef(false);

    const checkUser = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/auth/me');
            if (response.ok) {
                const data = await response.json();
                setUser(data.user);
            } else {
                setUser(null);
            }
        } catch (error) {
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        checkUser();
    }, [checkUser]);

    const login = (userData: User) => setUser(userData);
    const logout = () => setUser(null);

    const showSessionExpiredModal = useCallback(() => {
        // Check the ref to prevent showing multiple modals.
        if (isModalVisibleRef.current) {
            return;
        }
        // Set the ref to true immediately.
        isModalVisibleRef.current = true;

        Modal.info({
            title: 'Session Expired',
            content: 'Your session has expired. The page will now reload.',
            okText: 'Reload Page',
            onOk: () => {
                window.location.reload();
            },
        });
    }, []); // The dependency array is now empty, making this function stable.

    const value = { user, isAuthenticated: !!user, isLoading, login, logout, checkUser, showSessionExpiredModal };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};