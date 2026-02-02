/**
 * Profile Context
 *
 * Provides profile data to any component that needs it.
 * Fetches from Laravel API using Sanctum token.
 */

import { createContext, useContext, useState, useEffect } from '@wordpress/element';
import type { ProfileData } from '../components/OnboardingModal';

// ============================================
// TYPES
// ============================================

interface ProfileContextType {
    profile: ProfileData | null;
    isLoading: boolean;
    isConnected: boolean;
    setProfile: (profile: ProfileData) => void;
    saveProfile: (profile: ProfileData) => Promise<void>;
    deleteProfile: () => Promise<void>;
}

// ============================================
// HELPERS
// ============================================

const getConfig = () => window.wbrpConfig || { apiUrl: 'http://127.0.0.1:8000', token: '' };

async function laravelFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const { apiUrl, token } = getConfig();
    const response = await fetch(`${apiUrl}/api${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers,
        },
    });

    if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
    }

    return response.json();
}

// ============================================
// CONTEXT
// ============================================

const ProfileContext = createContext<ProfileContextType | null>(null);

// ============================================
// PROVIDER
// ============================================

export function ProfileProvider({ children }: { children: React.ReactNode }) {
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);

    // Load profile from Laravel on mount
    useEffect(() => {
        const { token } = getConfig();

        // No token = not connected to Laravel yet
        if (!token) {
            setIsLoading(false);
            return;
        }

        laravelFetch<{ id: number; name: string; email: string }>('/user')
            .then(() => {
                setIsConnected(true);
                // TODO: Fetch profile from /api/profile once that endpoint exists
            })
            .catch((error) => {
                console.error('Failed to load profile:', error);
                setIsConnected(false);
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, []);

    const saveProfile = async (data: ProfileData) => {
        await laravelFetch('/profile', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        setProfile(data);
    };

    const deleteProfile = async () => {
        await laravelFetch('/profile', { method: 'DELETE' });
        setProfile(null);
    };

    return (
        <ProfileContext.Provider value={{ profile, isLoading, isConnected, setProfile, saveProfile, deleteProfile }}>
            {children}
        </ProfileContext.Provider>
    );
}

// ============================================
// HOOK
// ============================================

export function useProfile() {
    const context = useContext(ProfileContext);
    if (!context) {
        throw new Error('useProfile must be used within ProfileProvider');
    }
    return context;
}
