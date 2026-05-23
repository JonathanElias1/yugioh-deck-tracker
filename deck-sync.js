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
    async saveDeckProgress(deckId, ownedCards, removedCards, customCards, useKeepalive = false) {
        if (!isAuthenticated()) {
            console.log('❌ Not authenticated - saving to localStorage only');
            this.showSyncStatus('⚠️ Not syncing - offline mode', 'warning');
            return { success: true, localOnly: true };
        }

        try {
            const user = getCurrentUser();

            console.log(`💾 Saving deck #${deckId} to Supabase...`, {
                ownedCardsCount: Object.keys(ownedCards || {}).length,
                removedCardsCount: (removedCards || []).length,
                customCardsCount: Object.keys(customCards || {}).length,
                keepalive: useKeepalive
            });

            this.showSyncStatus('☁️ Syncing to cloud...', 'syncing');

            // Get session token for manual fetch
            const { data: { session } } = await supabaseClient.auth.getSession();
            if (!session) throw new Error('No active session');

            const payload = {
                user_id: user.id,
                deck_id: deckId,
                owned_cards: ownedCards || {},
                removed_cards: removedCards || [],
                custom_cards: customCards || {},
                updated_at: new Date().toISOString()
            };

            // Use fetch with keepalive for critical page-unload syncs
            if (useKeepalive) {
                const response = await fetch(`${SUPABASE_URL}/rest/v1/user_deck_progress?on_conflict=user_id,deck_id`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${session.access_token}`,
                        'Prefer': 'resolution=merge-duplicates,return=representation'
                    },
                    body: JSON.stringify(payload),
                    keepalive: true // CRITICAL: Ensures request completes even if page closes
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
                }

                console.log(`✅ Successfully synced deck #${deckId} with keepalive`);
                this.lastSyncTime = new Date();
                return { success: true, useKeepalive: true };
            } else {
                // Normal Supabase client for regular syncs
                const { data, error } = await supabaseClient
                    .from('user_deck_progress')
                    .upsert(payload, {
                        onConflict: 'user_id,deck_id'
                    })
                    .select()
                    .single();

                if (error) throw error;

                console.log(`✅ Successfully synced deck #${deckId} to Supabase`);
                this.lastSyncTime = new Date();
                this.showSyncStatus('✅ Synced!', 'success');

                return { success: true, data };
            }
        } catch (error) {
            console.error(`❌ Error saving deck #${deckId}:`, error);
            this.showSyncStatus('❌ Sync failed', 'error');
            return { success: false, error: error.message };
        }
    }

    // Show sync status in UI
    showSyncStatus(message, type) {
        const statusDiv = document.getElementById('syncStatus');
        if (!statusDiv) return;

        statusDiv.style.display = 'block';
        statusDiv.textContent = message;

        const colors = {
            syncing: 'rgba(78, 205, 196, 0.3)',
            success: 'rgba(76, 175, 80, 0.6)',
            error: 'rgba(234, 67, 53, 0.6)',
            warning: 'rgba(251, 188, 4, 0.6)'
        };

        statusDiv.style.background = colors[type] || colors.syncing;

        if (type === 'success') {
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 2000);
        } else if (type === 'error') {
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 5000);
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
    async syncDeck(deckId, useKeepalive = false) {
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

        return await this.saveDeckProgress(deckId, ownedCardsObj, removedCardsArr, customCardsObj, useKeepalive);
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
                const removedCount = (progress.removed_cards || []).length;
                const customCount = Object.keys(progress.custom_cards || {}).length;

                console.log(`  📥 Deck #${progress.deck_id}:`, {
                    owned: ownedCount,
                    removed: removedCount,
                    custom: customCount,
                    lastUpdated: progress.updated_at
                });

                // SAFETY: Merge with local data instead of blindly overwriting
                // This prevents data loss if local has newer changes
                const localOwned = localStorage.getItem(`ownedCards_${progress.deck_id}`);
                const localRemoved = localStorage.getItem(`removedCards_${progress.deck_id}`);
                const localCustom = localStorage.getItem(`customCards_${progress.deck_id}`);

                let finalOwned = progress.owned_cards || {};
                let finalRemoved = progress.removed_cards || [];
                let finalCustom = progress.custom_cards || {};

                // If local data exists, merge intelligently (union of cards)
                if (localOwned) {
                    try {
                        const localOwnedObj = JSON.parse(localOwned);
                        // Merge: keep higher ownership quantities
                        Object.keys(localOwnedObj).forEach(card => {
                            const localQty = typeof localOwnedObj[card] === 'number' ? localOwnedObj[card] : (localOwnedObj[card] ? 999 : 0);
                            const cloudQty = typeof finalOwned[card] === 'number' ? finalOwned[card] : (finalOwned[card] ? 999 : 0);
                            // Keep the higher value (never lose ownership)
                            if (localQty > cloudQty) {
                                finalOwned[card] = localOwnedObj[card];
                                console.log(`  🔄 Merged: ${card} - keeping local ownership (${localQty} vs cloud ${cloudQty})`);
                            }
                        });
                    } catch (e) {
                        console.error('Error merging local owned cards:', e);
                    }
                }

                if (localRemoved) {
                    try {
                        const localRemovedArr = JSON.parse(localRemoved);
                        // Union: keep all removed cards from both sources
                        finalRemoved = [...new Set([...finalRemoved, ...localRemovedArr])];
                    } catch (e) {
                        console.error('Error merging local removed cards:', e);
                    }
                }

                if (localCustom) {
                    try {
                        const localCustomObj = JSON.parse(localCustom);
                        // Union: merge custom cards
                        if (localCustomObj.main) {
                            finalCustom.main = [...new Set([...(finalCustom.main || []), ...localCustomObj.main])];
                        }
                        if (localCustomObj.extra) {
                            finalCustom.extra = [...new Set([...(finalCustom.extra || []), ...localCustomObj.extra])];
                        }
                    } catch (e) {
                        console.error('Error merging local custom cards:', e);
                    }
                }

                // Update localStorage with merged data
                localStorage.setItem(`ownedCards_${progress.deck_id}`, JSON.stringify(finalOwned));
                localStorage.setItem(`removedCards_${progress.deck_id}`, JSON.stringify(finalRemoved));
                localStorage.setItem(`customCards_${progress.deck_id}`, JSON.stringify(finalCustom));
                loaded++;
            });

            console.log(`✅ Pulled ${loaded} decks from Supabase and updated localStorage`);

            // Store last sync time
            localStorage.setItem('lastSyncTime', new Date().toISOString());

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

        console.log(`⏱️ Scheduled sync for deck #${deckId} in 100ms...`);

        // Schedule sync after 100ms of no changes (reduced from 500ms for faster sync)
        this.syncDebounceTimer = setTimeout(async () => {
            await this.syncDeck(deckId, false);
            this.pendingSyncDeckId = null;
        }, 100);
    }

    // Immediately sync pending changes (called on page unload)
    syncPendingChangesSync() {
        if (this.pendingSyncDeckId && isAuthenticated()) {
            console.log(`🚨 Page unloading - immediately syncing deck #${this.pendingSyncDeckId} with keepalive`);

            // Clear the debounce timer
            if (this.syncDebounceTimer) {
                clearTimeout(this.syncDebounceTimer);
            }

            const deckId = this.pendingSyncDeckId;
            const ownedCards = localStorage.getItem(`ownedCards_${deckId}`);
            const removedCards = localStorage.getItem(`removedCards_${deckId}`);
            const customCards = localStorage.getItem(`customCards_${deckId}`);

            const ownedCardsObj = ownedCards ? JSON.parse(ownedCards) : {};
            const removedCardsArr = removedCards ? JSON.parse(removedCards) : [];
            const customCardsObj = customCards ? JSON.parse(customCards) : {};

            // Use synchronous approach with keepalive fetch
            try {
                const user = getCurrentUser();
                if (!user) {
                    console.error('No user found for keepalive sync');
                    return;
                }

                // Get session token from localStorage (Supabase stores it here)
                let accessToken = null;
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith('sb-') && key.includes('-auth-token')) {
                        try {
                            const sessionData = JSON.parse(localStorage.getItem(key) || '{}');
                            accessToken = sessionData?.access_token;
                            if (accessToken) break;
                        } catch (e) {
                            console.error('Error parsing session:', e);
                        }
                    }
                }

                if (!accessToken) {
                    console.error('No access token found for keepalive sync');
                    return;
                }

                const payload = {
                    user_id: user.id,
                    deck_id: deckId,
                    owned_cards: ownedCardsObj,
                    removed_cards: removedCardsArr,
                    custom_cards: customCardsObj,
                    updated_at: new Date().toISOString()
                };

                // Get Supabase URL and key from global scope
                const supabaseUrl = window.SUPABASE_URL || 'https://bfkkxpprhzysupqitspt.supabase.co';
                const supabaseKey = window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJma2t4cHByaHp5c3VwcWl0c3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgxNjQ3NzEsImV4cCI6MjA5Mzc0MDc3MX0.GrTg6injuBsbYWuq62nz0P0GYW8uSTl6PygF1RZVBpg';

                // Use fetch with keepalive - this will complete even after page closes
                fetch(`${supabaseUrl}/rest/v1/user_deck_progress?on_conflict=user_id,deck_id`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${accessToken}`,
                        'Prefer': 'resolution=merge-duplicates'
                    },
                    body: JSON.stringify(payload),
                    keepalive: true // CRITICAL: Request continues even if page closes
                });

                console.log(`✅ Sent keepalive sync for deck #${deckId}`);
                this.pendingSyncDeckId = null;
            } catch (error) {
                console.error('Error in keepalive sync:', error);
            }
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
document.addEventListener('visibilitychange', () => {
    if (document.hidden && window.deckSync && window.deckSync.pendingSyncDeckId) {
        console.log('👁️ Page hidden - syncing pending changes...');
        window.deckSync.syncPendingChangesSync();
    }
});

// Sync pending changes before page unload (fallback)
window.addEventListener('beforeunload', (event) => {
    if (window.deckSync && window.deckSync.pendingSyncDeckId) {
        console.log('🚪 Page unloading - syncing pending changes...');
        window.deckSync.syncPendingChangesSync();
    }
});

// iOS Safari doesn't always fire beforeunload, use pagehide as well
window.addEventListener('pagehide', (event) => {
    if (window.deckSync && window.deckSync.pendingSyncDeckId) {
        console.log('📴 Page hiding - syncing pending changes...');
        window.deckSync.syncPendingChangesSync();
    }
});
