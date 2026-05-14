import { ref } from 'vue';
import { authStore } from '../store/auth';

export interface TitleData {
    id: string;
    name: string;
    description: string;
    rarity: 'common' | 'rare' | 'secret';
    hint?: string;
    color?: string;
    is_active: boolean;
    is_unlocked: boolean;
    is_equipped: boolean;
    unlock_type: 'open' | 'code' | 'conditions';
}

export function useUserTitles() {
    const titles = ref<TitleData[]>([]);
    const loadingTitles = ref(false);

    /** Fetch all active titles with unlocked/equipped status for current user */
    const fetchAllTitles = async () => {
        if (!authStore.user?.id) return;
        loadingTitles.value = true;
        try {
            const response = await fetch('/api/titles', {
                headers: { 'x-user-id': String(authStore.user.id) }
            });
            if (response.ok) {
                titles.value = await response.json();
            }
        } catch {
            // silent
        } finally {
            loadingTitles.value = false;
        }
    };

    /**
     * Equip a title the user has unlocked.
     * Pass null titleId to unequip.
     */
    const equipTitle = async (userId: number, titleId: string | null) => {
        try {
            const response = await fetch(`/api/user/${userId}/equip-title`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': String(userId)
                },
                body: JSON.stringify({ title_id: titleId })
            });
            if (!response.ok) return false;
            // Update local list so button updates immediately
            titles.value = titles.value.map(t => ({
                ...t,
                is_equipped: t.id === titleId
            }));
            return true;
        } catch {
            return false;
        }
    };

    /** Claim a title (open or code-based) */
    const claimTitle = async (titleId: string, code?: string) => {
        try {
            const response = await fetch(`/api/titles/${titleId}/claim`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': String(authStore.user?.id || '')
                },
                body: JSON.stringify({ code })
            });
            
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to claim title');
            }
            
            // Refresh local titles
            await fetchAllTitles();
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    };

    return {
        titles,
        loadingTitles,
        fetchAllTitles,
        equipTitle,
        claimTitle
    };
}
