/**
 * Profile Context
 *
 * Provides profile data to any component that needs it.
 * No more prop drilling!
 */

import { createContext, useContext, useState, useEffect } from '@wordpress/element';
import apiFetch from '@wordpress/api-fetch';
import type { ProfileData } from '../components/OnboardingModal';

// ============================================
// TYPES
// ============================================

interface ProfileContextType {
    profile: ProfileData | null;
    isLoading: boolean;
    setProfile: (profile: ProfileData) => void;
    deleteProfile: () => Promise<void>;
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

    // Load profile on mount
    useEffect(() => {
        apiFetch<{ profile: ProfileData | null }>({ path: '/wbrp/v1/profile' })
            .then((response) => {
                if (response.profile) {
                    setProfile(response.profile);
                }
            })
            .catch((error) => {
                console.error('Failed to load profile:', error);
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, []);

    const deleteProfile = async () => {
        await apiFetch({ path: '/wbrp/v1/profile', method: 'DELETE' });
        setProfile(null);
    };

    return (
        <ProfileContext.Provider value={{ profile, isLoading, setProfile, deleteProfile }}>
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
