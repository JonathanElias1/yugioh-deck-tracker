// Deck Progress Sync Service
// Syncs owned cards, removed cards, and custom cards between localStorage and Supabase

class DeckSync {
    constructor() {
        this.syncInProgress = false;
        this.lastSyncTime = null;
        this.autoSyncEnabled = true;
        this.syncDebounceTimer = null;
    }

    // Save deck progress to Supabase
    async saveDeckProgress(deckId, ownedCards, removedCards, customCards) {
        if (!isAuthenticated()) {
            console.log('Not authenticated - saving to localStorage only');
            return { success: true, localOnly: true };
        }

        try {
            const user = getCurrentUser();

            const { data, error } = await supabaseClient
                .from('user_deck_progress')
                .upsert({
                    user_id: user.id,
                    deck_id: deckId,
                    owned_cards: ownedCards || {},
                    removed_cards: removedCards || [],
                    custom_cards: customCards || {}
                }, {
                    onConflict: 'user_id,deck_id'
                })
                .select()
                .single();

            if (error) throw error;

            console.log(`✅ Synced deck #${deckId} to Supabase`);
            this.lastSyncTime = new Date();

            return { success: true, data };
        } catch (error) {
            console.error('Error saving deck progress:', error);
            return { success: false, error: error.message };
        }
    }

    // Load deck progress from Supabase
    async loadDeckProgress(deckId) {
        if (!isAuthenticated()) {
            console.log('Not authenticated - loading from localStorage only');
            return null;
        }

        try {
            const user = getCurrentUser();

            const { data, error } = await supabaseClient
                .from('user_deck_progress')
                .select('*')
                .eq('user_id', user.id)
                .eq('deck_id', deckId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    // No data found - this is OK
                    return null;
                }
                throw error;
            }

            console.log(`✅ Loaded deck #${deckId} from Supabase`);
            return data;
        } catch (error) {
            console.error('Error loading deck progress:', error);
            return null;
        }
    }

    // Sync a single deck (localStorage -> Supabase)
    async syncDeck(deckId) {
        const ownedCards = localStorage.getItem(`ownedCards_${deckId}`);
        const removedCards = localStorage.getItem(`removedCards_${deckId}`);
        const customCards = localStorage.getItem(`customCards_${deckId}`);

        const ownedCardsObj = ownedCards ? JSON.parse(ownedCards) : {};
        const removedCardsArr = removedCards ? JSON.parse(removedCards) : [];
        const customCardsObj = customCards ? JSON.parse(customCards) : {};

        return await this.saveDeckProgress(deckId, ownedCardsObj, removedCardsArr, customCardsObj);
    }

    // Sync all decks (localStorage -> Supabase)
    async syncAllDecks() {
        if (!isAuthenticated()) {
            console.log('Not authenticated - skipping sync');
            return;
        }

        if (this.syncInProgress) {
            console.log('Sync already in progress');
            return;
        }

        this.syncInProgress = true;
        console.log('🔄 Starting full sync to Supabase...');

        try {
            const decks = window.decks || [];
            let synced = 0;

            for (const deck of decks) {
                const result = await this.syncDeck(deck.id);
                if (result.success) synced++;
            }

            console.log(`✅ Synced ${synced} decks to Supabase`);
            this.lastSyncTime = new Date();
        } catch (error) {
            console.error('Error during full sync:', error);
        } finally {
            this.syncInProgress = false;
        }
    }

    // Pull all deck progress from Supabase to localStorage
    async pullFromSupabase() {
        if (!isAuthenticated()) {
            console.log('Not authenticated - skipping pull');
            return;
        }

        console.log('📥 Pulling deck progress from Supabase...');

        try {
            const user = getCurrentUser();

            const { data, error } = await supabaseClient
                .from('user_deck_progress')
                .select('*')
                .eq('user_id', user.id);

            if (error) throw error;

            let loaded = 0;

            data.forEach(progress => {
                // Update localStorage with Supabase data
                localStorage.setItem(`ownedCards_${progress.deck_id}`, JSON.stringify(progress.owned_cards));
                localStorage.setItem(`removedCards_${progress.deck_id}`, JSON.stringify(progress.removed_cards));
                localStorage.setItem(`customCards_${progress.deck_id}`, JSON.stringify(progress.custom_cards));
                loaded++;
            });

            console.log(`✅ Pulled ${loaded} decks from Supabase`);

            // Reload page to reflect changes
            if (loaded > 0) {
                location.reload();
            }
        } catch (error) {
            console.error('Error pulling from Supabase:', error);
        }
    }

    // Debounced auto-sync when data changes
    scheduleSyncDeck(deckId) {
        if (!this.autoSyncEnabled || !isAuthenticated()) return;

        // Clear existing timer
        if (this.syncDebounceTimer) {
            clearTimeout(this.syncDebounceTimer);
        }

        // Schedule sync after 2 seconds of no changes
        this.syncDebounceTimer = setTimeout(() => {
            this.syncDeck(deckId);
        }, 2000);
    }

    // Get sync status
    getSyncStatus() {
        return {
            authenticated: isAuthenticated(),
            lastSyncTime: this.lastSyncTime,
            syncInProgress: this.syncInProgress,
            autoSyncEnabled: this.autoSyncEnabled
        };
    }
}

// Initialize global sync service
window.deckSync = new DeckSync();

// Auto-sync when page loads (if authenticated)
document.addEventListener('DOMContentLoaded', async () => {
    await initAuth();

    if (isAuthenticated()) {
        console.log('✅ User is authenticated - sync ready');
        // Disabled auto-pull to prevent refresh loops
        // await window.deckSync.pullFromSupabase();
    } else {
        console.log('ℹ️ Not authenticated - using localStorage only');
    }
});
