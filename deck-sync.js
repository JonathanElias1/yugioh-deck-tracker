// Deck Progress Sync Service
// Syncs owned cards, removed cards, and custom cards between localStorage and Supabase

class DeckSync {
    constructor() {
        this.syncInProgress = false;
        this.lastSyncTime = null;
        this.autoSyncEnabled = true;
        this.syncDebounceTimer = null;
        this.pendingSyncDeckId = null; // Track which deck needs syncing
    }

    // Save deck progress to Supabase
    async saveDeckProgress(deckId, ownedCards, removedCards, customCards) {
        if (!isAuthenticated()) {
            console.log('❌ Not authenticated - saving to localStorage only');
            return { success: true, localOnly: true };
        }

        try {
            const user = getCurrentUser();

            console.log(`💾 Saving deck #${deckId} to Supabase...`, {
                ownedCardsCount: Object.keys(ownedCards || {}).length,
                removedCardsCount: (removedCards || []).length,
                customCardsCount: Object.keys(customCards || {}).length
            });

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

            console.log(`✅ Successfully synced deck #${deckId} to Supabase`);
            this.lastSyncTime = new Date();

            return { success: true, data };
        } catch (error) {
            console.error(`❌ Error saving deck #${deckId}:`, error);
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
        console.log(`🔄 Syncing deck #${deckId} from localStorage to Supabase...`);

        const ownedCards = localStorage.getItem(`ownedCards_${deckId}`);
        const removedCards = localStorage.getItem(`removedCards_${deckId}`);
        const customCards = localStorage.getItem(`customCards_${deckId}`);

        const ownedCardsObj = ownedCards ? JSON.parse(ownedCards) : {};
        const removedCardsArr = removedCards ? JSON.parse(removedCards) : [];
        const customCardsObj = customCards ? JSON.parse(customCards) : {};

        console.log(`  📊 Deck #${deckId} data:`, {
            ownedCards: Object.keys(ownedCardsObj).length,
            removedCards: removedCardsArr.length,
            customCards: Object.keys(customCardsObj).length
        });

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
            console.log('❌ Not authenticated - skipping pull');
            return;
        }

        console.log('📥 Pulling deck progress from Supabase...');

        try {
            const user = getCurrentUser();
            console.log(`👤 Fetching data for user: ${user.email}`);

            const { data, error } = await supabaseClient
                .from('user_deck_progress')
                .select('*')
                .eq('user_id', user.id);

            if (error) throw error;

            console.log(`📦 Received ${data?.length || 0} deck records from Supabase`);

            let loaded = 0;

            data.forEach(progress => {
                const ownedCount = Object.keys(progress.owned_cards || {}).length;
                console.log(`  📥 Deck #${progress.deck_id}: ${ownedCount} owned cards`);

                // Update localStorage with Supabase data
                localStorage.setItem(`ownedCards_${progress.deck_id}`, JSON.stringify(progress.owned_cards));
                localStorage.setItem(`removedCards_${progress.deck_id}`, JSON.stringify(progress.removed_cards));
                localStorage.setItem(`customCards_${progress.deck_id}`, JSON.stringify(progress.custom_cards));
                loaded++;
            });

            console.log(`✅ Pulled ${loaded} decks from Supabase and updated localStorage`);

            // Trigger UI update without reloading page
            if (loaded > 0 && window.tracker && typeof window.tracker.renderDecks === 'function') {
                window.tracker.renderDecks();
                window.tracker.updateStats();
            }
        } catch (error) {
            console.error('Error pulling from Supabase:', error);
        }
    }

    // Debounced auto-sync when data changes
    scheduleSyncDeck(deckId) {
        if (!this.autoSyncEnabled || !isAuthenticated()) {
            console.log('⏸️ Sync skipped:', !this.autoSyncEnabled ? 'disabled' : 'not authenticated');
            return;
        }

        // Track pending sync
        this.pendingSyncDeckId = deckId;

        // Clear existing timer
        if (this.syncDebounceTimer) {
            clearTimeout(this.syncDebounceTimer);
        }

        console.log(`⏱️ Scheduled sync for deck #${deckId} in 500ms...`);

        // Schedule sync after 500ms of no changes (reduced from 2s to prevent data loss)
        this.syncDebounceTimer = setTimeout(async () => {
            await this.syncDeck(deckId);
            this.pendingSyncDeckId = null;
        }, 500);
    }

    // Immediately sync pending changes (called on page unload)
    async syncPendingChanges() {
        if (this.pendingSyncDeckId && isAuthenticated()) {
            console.log(`🚨 Page unloading - immediately syncing deck #${this.pendingSyncDeckId}`);

            // Clear the debounce timer
            if (this.syncDebounceTimer) {
                clearTimeout(this.syncDebounceTimer);
            }

            await this.syncDeck(this.pendingSyncDeckId);
            this.pendingSyncDeckId = null;
        }
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
        console.log('✅ User is authenticated - pulling latest data from Supabase');
        await window.deckSync.pullFromSupabase();
    } else {
        console.log('ℹ️ Not authenticated - using localStorage only');
    }
});

// Sync pending changes when page visibility changes (tab hidden/closed)
document.addEventListener('visibilitychange', async () => {
    if (document.hidden && window.deckSync && window.deckSync.pendingSyncDeckId) {
        console.log('👁️ Page hidden - syncing pending changes...');
        await window.deckSync.syncPendingChanges();
    }
});

// Sync pending changes before page unload (fallback)
window.addEventListener('beforeunload', async (event) => {
    if (window.deckSync && window.deckSync.pendingSyncDeckId) {
        console.log('🚪 Page unloading - syncing pending changes...');
        await window.deckSync.syncPendingChanges();
    }
});

// iOS Safari doesn't always fire beforeunload, use pagehide as well
window.addEventListener('pagehide', async (event) => {
    if (window.deckSync && window.deckSync.pendingSyncDeckId) {
        console.log('📴 Page hiding - syncing pending changes...');
        await window.deckSync.syncPendingChanges();
    }
});
