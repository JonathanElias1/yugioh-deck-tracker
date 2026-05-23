// Backup & Restore Service
// Provides manual backup/restore of ALL deck ownership data
// This is a safety net in case of sync issues

class BackupService {
    constructor() {
        this.backupVersion = '1.0';
    }

    // Export all deck ownership data to JSON file
    exportAllData() {
        const exportData = {
            version: this.backupVersion,
            exportDate: new Date().toISOString(),
            deckProgress: {},
            inventory: null,
            metadata: {}
        };

        // Collect all deck progress data
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);

            // Deck ownership data
            if (key && key.startsWith('ownedCards_')) {
                const deckId = key.replace('ownedCards_', '');
                if (!exportData.deckProgress[deckId]) {
                    exportData.deckProgress[deckId] = {};
                }
                exportData.deckProgress[deckId].ownedCards = JSON.parse(localStorage.getItem(key) || '{}');
            }

            // Removed cards
            if (key && key.startsWith('removedCards_')) {
                const deckId = key.replace('removedCards_', '');
                if (!exportData.deckProgress[deckId]) {
                    exportData.deckProgress[deckId] = {};
                }
                exportData.deckProgress[deckId].removedCards = JSON.parse(localStorage.getItem(key) || '[]');
            }

            // Custom cards
            if (key && key.startsWith('customCards_')) {
                const deckId = key.replace('customCards_', '');
                if (!exportData.deckProgress[deckId]) {
                    exportData.deckProgress[deckId] = {};
                }
                exportData.deckProgress[deckId].customCards = JSON.parse(localStorage.getItem(key) || '{}');
            }

            // Deck metadata
            if (key && key.startsWith('deckMetadata_')) {
                const deckId = key.replace('deckMetadata_', '');
                if (!exportData.metadata[deckId]) {
                    exportData.metadata[deckId] = {};
                }
                exportData.metadata[deckId] = JSON.parse(localStorage.getItem(key) || '{}');
            }

            // Card conditions
            if (key && key.startsWith('cardConditions_')) {
                const deckId = key.replace('cardConditions_', '');
                if (!exportData.metadata[deckId]) {
                    exportData.metadata[deckId] = {};
                }
                exportData.metadata[deckId].conditions = JSON.parse(localStorage.getItem(key) || '{}');
            }
        }

        // Inventory
        const inventory = localStorage.getItem('cardInventory');
        if (inventory) {
            exportData.inventory = JSON.parse(inventory);
        }

        // Generate filename
        const date = new Date().toISOString().split('T')[0];
        const filename = `yugioh-deck-backup-${date}.json`;

        // Download file
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log('✅ Backup exported:', filename);
        alert(`Backup exported successfully!\n\nFile: ${filename}\n\nDecks backed up: ${Object.keys(exportData.deckProgress).length}`);
    }

    // Import backup data
    async importBackup(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    const importData = JSON.parse(e.target.result);

                    // Validate backup format
                    if (!importData.version || !importData.deckProgress) {
                        throw new Error('Invalid backup file format');
                    }

                    // Confirm with user
                    const deckCount = Object.keys(importData.deckProgress).length;
                    const proceed = confirm(
                        `Restore backup from ${importData.exportDate}?\n\n` +
                        `This will restore:\n` +
                        `- ${deckCount} deck(s) ownership data\n` +
                        `- Card inventory\n` +
                        `- Deck metadata\n\n` +
                        `Current data will be MERGED (not replaced).`
                    );

                    if (!proceed) {
                        resolve({ success: false, message: 'User cancelled' });
                        return;
                    }

                    let restored = 0;

                    // Restore deck progress
                    Object.keys(importData.deckProgress).forEach(deckId => {
                        const data = importData.deckProgress[deckId];

                        if (data.ownedCards) {
                            // Merge with existing (keep union)
                            const existing = localStorage.getItem(`ownedCards_${deckId}`);
                            const existingObj = existing ? JSON.parse(existing) : {};
                            const merged = { ...existingObj, ...data.ownedCards };
                            localStorage.setItem(`ownedCards_${deckId}`, JSON.stringify(merged));
                        }

                        if (data.removedCards) {
                            const existing = localStorage.getItem(`removedCards_${deckId}`);
                            const existingArr = existing ? JSON.parse(existing) : [];
                            const merged = [...new Set([...existingArr, ...data.removedCards])];
                            localStorage.setItem(`removedCards_${deckId}`, JSON.stringify(merged));
                        }

                        if (data.customCards) {
                            const existing = localStorage.getItem(`customCards_${deckId}`);
                            const existingObj = existing ? JSON.parse(existing) : { main: [], extra: [] };
                            const merged = {
                                main: [...new Set([...(existingObj.main || []), ...(data.customCards.main || [])])],
                                extra: [...new Set([...(existingObj.extra || []), ...(data.customCards.extra || [])])]
                            };
                            localStorage.setItem(`customCards_${deckId}`, JSON.stringify(merged));
                        }

                        restored++;
                    });

                    // Restore metadata
                    Object.keys(importData.metadata || {}).forEach(deckId => {
                        const data = importData.metadata[deckId];
                        if (data && !data.conditions) {
                            localStorage.setItem(`deckMetadata_${deckId}`, JSON.stringify(data));
                        }
                        if (data && data.conditions) {
                            localStorage.setItem(`cardConditions_${deckId}`, JSON.stringify(data.conditions));
                        }
                    });

                    // Restore inventory (merge)
                    if (importData.inventory) {
                        const existing = localStorage.getItem('cardInventory');
                        const existingInv = existing ? JSON.parse(existing) : {};
                        const merged = { ...existingInv, ...importData.inventory };
                        localStorage.setItem('cardInventory', JSON.stringify(merged));
                    }

                    // Sync to Supabase if authenticated
                    if (typeof isAuthenticated === 'function' && isAuthenticated() && window.deckSync) {
                        console.log('🔄 Syncing restored data to Supabase...');
                        await window.deckSync.syncAllDecks();

                        // Also sync inventory
                        if (importData.inventory && typeof getCurrentUser === 'function') {
                            try {
                                const user = getCurrentUser();
                                const finalInventory = JSON.parse(localStorage.getItem('cardInventory') || '{}');
                                await supabaseClient
                                    .from('user_profiles')
                                    .update({ card_inventory: finalInventory })
                                    .eq('id', user.id);
                                console.log('✅ Inventory synced to Supabase');
                            } catch (error) {
                                console.error('Error syncing inventory:', error);
                            }
                        }
                    }

                    alert(`✅ Backup restored successfully!\n\nRestored ${restored} deck(s)`);
                    resolve({ success: true, restored });

                    // Reload page to show changes
                    setTimeout(() => window.location.reload(), 1000);
                } catch (error) {
                    console.error('Error importing backup:', error);
                    alert(`❌ Error importing backup: ${error.message}`);
                    reject(error);
                }
            };

            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };

            reader.readAsText(file);
        });
    }

    // Show backup/restore UI modal
    showBackupModal() {
        // Create modal if it doesn't exist
        let modal = document.getElementById('backupModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'backupModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 500px;">
                    <span class="close" onclick="document.getElementById('backupModal').style.display='none'">&times;</span>
                    <h2>🔒 Backup & Restore</h2>
                    <p style="opacity: 0.8; margin-bottom: 30px;">Protect your deck ownership data with manual backups</p>

                    <div style="margin-bottom: 20px;">
                        <button onclick="backupService.exportAllData()" style="width: 100%; padding: 15px; background: linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: bold; margin-bottom: 10px;">
                            💾 Export Backup (Download JSON)
                        </button>
                        <p style="font-size: 0.9rem; opacity: 0.7; margin-top: 5px;">Downloads all your deck ownership data as a JSON file</p>
                    </div>

                    <div>
                        <label for="backupFileInput" style="display: block; width: 100%; padding: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 16px; font-weight: bold; text-align: center;">
                            📂 Import Backup (Restore)
                        </label>
                        <input type="file" id="backupFileInput" accept=".json" style="display: none;" onchange="backupService.handleFileSelect(event)">
                        <p style="font-size: 0.9rem; opacity: 0.7; margin-top: 5px;">Restores data from a previously exported backup file</p>
                    </div>

                    <div style="margin-top: 30px; padding: 15px; background: rgba(255, 193, 7, 0.1); border-left: 4px solid #ffc107; border-radius: 4px;">
                        <strong>⚠️ Note:</strong> Imported data will be MERGED with your current data, not replaced. Card ownership is never deleted, only added.
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        modal.style.display = 'block';
    }

    // Handle file selection for import
    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            this.importBackup(file);
        }
    }
}

// Initialize global backup service
window.backupService = new BackupService();
