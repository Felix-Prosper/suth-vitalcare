import { ref } from 'vue';
import { authStore } from '../store/auth';

export interface TitleCondition {
    type: 'count' | 'streak' | 'time';
    actionType: 'login' | 'submit_activity' | 'any_activity';
    targetValue: number | string;
    activityCode?: string;
    timeRange?: { start: string; end: string };
}

export interface TitleData {
    id?: string;
    name: string;
    description: string;
    rarity: 'common' | 'rare' | 'secret';
    conditions: TitleCondition[];
    hint?: string;
    icon?: string;
    color?: string;
    effect?: string;
    is_active?: boolean;
    unlock_type?: 'open' | 'code' | 'conditions';
    unlock_code?: string;
}

export function useAdminTitle() {
    const titles = ref<TitleData[]>([]);
    const loading = ref(false);

    const fetchTitles = async () => {
        loading.value = true;
        try {
            const response = await fetch('/api/admin/titles', {
                headers: { 'x-user-id': String(authStore.user?.id || '') }
            });
            if (response.ok) {
                titles.value = await response.json();
            }
        } catch (error) {
            // silent
        } finally {
            loading.value = false;
        }
    };

    const saveTitle = async (title: TitleData) => {
        loading.value = true;
        try {
            const method = title.id ? 'PUT' : 'POST';
            const url = title.id
                ? `/api/admin/titles/${title.id}`
                : '/api/admin/titles';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': String(authStore.user?.id || '')
                },
                body: JSON.stringify(title)
            });
            if (response.ok) {
                await fetchTitles();
            } else {
                throw new Error('Failed to save');
            }
        } catch (error) {
            throw error;
        } finally {
            loading.value = false;
        }
    };

    const deleteTitle = async (id: string) => {
        loading.value = true;
        try {
            const response = await fetch(`/api/admin/titles/${id}`, {
                method: 'DELETE',
                headers: { 'x-user-id': String(authStore.user?.id || '') }
            });
            if (response.ok) {
                await fetchTitles();
            }
        } catch (error) {
            // silent
        } finally {
            loading.value = false;
        }
    };

    return {
        titles,
        loading,
        fetchTitles,
        saveTitle,
        deleteTitle
    };
}