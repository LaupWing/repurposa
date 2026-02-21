import { apiRequest, getConfig } from './client';
import type { SocialAccount } from '@/types';

export async function getSocialAccounts(): Promise<SocialAccount[]> {
    return apiRequest<SocialAccount[]>('/social/accounts', {}, 'GET');
}

export async function disconnectSocialAccount(platform: string): Promise<void> {
    await apiRequest<{ success: boolean }>(`/social/${platform}/disconnect`, {}, 'DELETE');
}

export async function updateUser(data: { name?: string; email?: string }): Promise<void> {
    await apiRequest('/profile', data, 'PUT');
}

export async function uploadAvatar(file: File): Promise<string> {
    const { apiUrl, token } = getConfig();
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await fetch(`${apiUrl}/api/profile/avatar`, {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: formData,
    });

    if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
    }

    const data = await response.json();
    return data.avatar;
}
