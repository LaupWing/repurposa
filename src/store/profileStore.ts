import { create } from 'zustand';

// ============================================
// TYPES
// ============================================

export interface ProfileData {
    business_type: string;
    niche: string;
    target_audience: string;
    brand_voice: 'conversational' | 'professional' | 'bold';
    lang: 'en' | 'nl';
    timezone: string;
    has_seen_connect_modal?: boolean;
    onboarding_completed?: boolean;
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
    avatar?: string | null;
    signup_provider?: string;
}

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

interface ProfileStore {
    user: UserData | null;
    profile: ProfileData | null;
    socialConnections: SocialConnection[];
    isLoading: boolean;
    isConnected: boolean;
    needsOnboarding: boolean;
    setProfile: (profile: ProfileData) => void;
    saveProfile: (profile: ProfileData) => Promise<void>;
    deleteProfile: () => Promise<void>;
    refreshProfile: () => Promise<void>;
    fetchProfile: () => Promise<void>;
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
// STORE
// ============================================

export const useProfileStore = create<ProfileStore>((set, get) => ({
    user: null,
    profile: null,
    socialConnections: [],
    isLoading: true,
    isConnected: false,
    needsOnboarding: false,

    setProfile: (profile) => set({ profile }),

    fetchProfile: async () => {
        const { token } = getConfig();
        if (!token) return;

        const response = await laravelFetch<ProfileResponse>('/profile');
        set({
            isConnected: true,
            user: response.user,
            profile: response.profile ?? null,
            needsOnboarding: response.profile ? !response.profile.onboarding_completed : true,
            socialConnections: (response.social_accounts || []).map(account => ({
                platform: account.platform,
                username: account.platform_username,
                profilePicture: account.profile_picture,
            })),
        });
    },

    saveProfile: async (data) => {
        await laravelFetch('/profile', {
            method: 'POST',
            body: JSON.stringify(data),
        });
        set({ profile: data });
    },

    deleteProfile: async () => {
        await laravelFetch('/profile', { method: 'DELETE' });
        set({ profile: null });
    },

    refreshProfile: async () => {
        await get().fetchProfile();
    },
}));
