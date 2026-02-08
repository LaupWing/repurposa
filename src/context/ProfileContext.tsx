/**
 * Profile Context
 *
 * Provides profile data to any component that needs it.
 * Fetches from Laravel API using Sanctum token.
 */

import { createContext, useContext, useState, useEffect, useCallback } from '@wordpress/element';

// ============================================
// TYPES
// ============================================

export interface ProfileData {
    business_type: string;
    niche: string;
    target_audience: string;
    brand_voice: 'conversational' | 'professional' | 'bold';
    lang: 'en' | 'nl';
    has_seen_connect_modal?: boolean;
}

export interface SocialConnection {
    platform: string;
    username: string;
    profilePicture?: string | null;
}

export interface UserData {
    id: number;
    name: string;
    email: string;
}

interface ProfileContextType {
    user: UserData | null;
    profile: ProfileData | null;
    socialConnections: SocialConnection[];
    isLoading: boolean;
    isConnected: boolean;
    setProfile: (profile: ProfileData) => void;
    saveProfile: (profile: ProfileData) => Promise<void>;
    deleteProfile: () => Promise<void>;
    refreshProfile: () => Promise<void>;
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

interface SocialAccountResponse {
    id: number;
    platform: string;
    platform_user_id: string;
    platform_username: string;
    profile_picture: string | null;
    connected_at: string;
}

interface ProfileResponse {
    user: UserData;
    profile: ProfileData | null;
    social_accounts?: SocialAccountResponse[];
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UserData | null>(null);
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [socialConnections, setSocialConnections] = useState<SocialConnection[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);

    const fetchProfile = useCallback(async () => {
        const { token } = getConfig();
        if (!token) return;

        const response = await laravelFetch<ProfileResponse>('/profile');
        setIsConnected(true);
        setUser(response.user);
        if (response.profile) {
            setProfile(response.profile);
        }
        setSocialConnections((response.social_accounts || []).map(account => ({
            platform: account.platform,
            username: account.platform_username,
            profilePicture: account.profile_picture,
        })));
    }, []);

    // Load user + profile from Laravel on mount
    useEffect(() => {
        const { token } = getConfig();

        // No token = not connected to Laravel yet
        if (!token) {
            setIsLoading(false);
            return;
        }

        fetchProfile()
            .catch((error) => {
                console.error('Failed to load profile:', error);
                setIsConnected(false);
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [fetchProfile]);

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

    const refreshProfile = useCallback(async () => {
        await fetchProfile();
    }, [fetchProfile]);

    return (
        <ProfileContext.Provider value={{ user, profile, socialConnections, isLoading, isConnected, setProfile, saveProfile, deleteProfile, refreshProfile }}>
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
