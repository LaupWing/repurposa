import { apiRequest } from './client';
import type { SocialAccount } from '../types';

export async function getSocialAccounts(): Promise<SocialAccount[]> {
    return apiRequest<SocialAccount[]>('/social/accounts', {}, 'GET');
}

export async function disconnectSocialAccount(platform: string): Promise<void> {
    await apiRequest<{ success: boolean }>(`/social/${platform}/disconnect`, {}, 'DELETE');
}
