// Card Inventory Management System
class CardInventory {
    constructor() {
        this.inventory = this.loadInventory();
        this.decks = decks || [];
        this.currentFilter = 'all';
        this.searchTerm = '';
        this.currentEditCard = null;
        this.init();
    }

    init() {
        this.buildCardDatabase();
        this.renderInventory();
        this.updateStats();
        this.setupEventListeners();
    }

    loadInventory() {
        const saved = localStorage.getItem('cardInventory');
        return saved ? JSON.parse(saved) : {};
    }

    saveInventory() {
        localStorage.setItem('cardInventory', JSON.stringify(this.inventory));
    }

    // Build a database of which cards appear in which decks
    buildCardDatabase() {
        this.cardDatabase = {};

        this.decks.forEach(deck => {
            if (deck.status === 'consolidated') return;

            const processDeck = (deckList, deckId, deckName) => {
                if (!deckList) return;

                deckList.forEach(cardEntry => {
                    const parsed = this.parseCardEntry(cardEntry);
                    if (!parsed) return;

                    const { quantity, name } = parsed;

                    if (!this.cardDatabase[name]) {
                        this.cardDatabase[name] = {};
                    }

                    if (!this.cardDatabase[name][deckId]) {
                        this.cardDatabase[name][deckId] = {
                            deckName: deckName,
                            quantity: 0
                        };
                    }

                    this.cardDatabase[name][deckId].quantity += quantity;
                });
            };

            // Process main deck
            if (deck.mainDeck) {
                processDeck(deck.mainDeck, deck.id, deck.name);
            }

            // Process extra deck
            if (deck.extraDeck) {
                processDeck(deck.extraDeck, deck.id, deck.name);
            }

            // Process alt paths
            if (deck.pathA && deck.pathA.mainDeck) {
                processDeck(deck.pathA.mainDeck, `${deck.id}-pathA`, `${deck.name} (Path A)`);
            }
            if (deck.pathA && deck.pathA.extraDeck) {
                processDeck(deck.pathA.extraDeck, `${deck.id}-pathA`, `${deck.name} (Path A)`);
            }
            if (deck.pathB && deck.pathB.mainDeck) {
                processDeck(deck.pathB.mainDeck, `${deck.id}-pathB`, `${deck.name} (Path B)`);
            }
            if (deck.pathB && deck.pathB.extraDeck) {
                processDeck(deck.pathB.extraDeck, `${deck.id}-pathB`, `${deck.name} (Path B)`);
            }
            if (deck.pathC && deck.pathC.mainDeck) {
                processDeck(deck.pathC.mainDeck, `${deck.id}-pathC`, `${deck.name} (Path C)`);
            }
            if (deck.pathC && deck.pathC.extraDeck) {
                processDeck(deck.pathC.extraDeck, `${deck.id}-pathC`, `${deck.name} (Path C)`);
            }
        });
    }

    parseCardEntry(entry) {
        // Parse entries like "3 Blue-Eyes White Dragon" or "Blue-Eyes White Dragon"
        const match = entry.match(/^(\d+)\s+(.+)$/);
        if (match) {
            return { quantity: parseInt(match[1]), name: match[2] };
        }
        return { quantity: 1, name: entry };
    }

    getCardUsage(cardName) {
        // Get which decks this card is used in and how many are marked as owned
        const decksWithCard = this.cardDatabase[cardName] || {};
        const usage = {};
        let totalUsed = 0;

        Object.keys(decksWithCard).forEach(deckKey => {
            const deckId = parseInt(deckKey.split('-')[0]);
            const deck = this.decks.find(d => d.id === deckId);
            if (!deck) return;

            // Check if card is marked as owned in this deck
            const ownedCards = localStorage.getItem(`ownedCards_${deckId}`);
            const ownedCardsObj = ownedCards ? JSON.parse(ownedCards) : {};

            // Find matching entries in owned cards (with or without quantity prefix)
            const isOwned = Object.keys(ownedCardsObj).some(key => {
                const parsed = this.parseCardEntry(key);
                return parsed.name === cardName && ownedCardsObj[key] === true;
            });

            if (isOwned) {
                const quantity = decksWithCard[deckKey].quantity;
                usage[deckKey] = {
                    deckName: decksWithCard[deckKey].deckName,
                    quantity: quantity
                };
                totalUsed += quantity;
            }
        });

        return { usage, totalUsed };
    }

    setupEventListeners() {
        // Search
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.renderInventory();
        });

        // Filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.filter;
                this.renderInventory();
            });
        });

        // Add card button
        document.getElementById('addCardToInventory').addEventListener('click', () => {
            this.showAddModal();
        });

        // Add modal close
        const addModal = document.getElementById('addInventoryModal');
        const addCloseBtn = addModal.querySelector('.close');
        addCloseBtn.onclick = () => {
            addModal.style.display = 'none';
        };

        // Edit modal close
        const editModal = document.getElementById('editCardModal');
        const editCloseBtn = editModal.querySelector('.edit-close');
        editCloseBtn.onclick = () => {
            editModal.style.display = 'none';
        };

        // Confirm bulk add
        document.getElementById('confirmBulkAdd').addEventListener('click', () => {
            this.addBulkCards();
        });

        // Clear inventory
        document.getElementById('clearInventory').addEventListener('click', () => {
            if (confirm('Are you sure you want to clear your entire inventory? This cannot be undone.')) {
                this.inventory = {};
                this.saveInventory();
                this.renderInventory();
                this.updateStats();
                document.getElementById('addInventoryModal').style.display = 'none';
            }
        });

        // Confirm edit
        document.getElementById('confirmEditCard').addEventListener('click', () => {
            this.saveCardEdit();
        });

        // Delete card
        document.getElementById('deleteCardFromInventory').addEventListener('click', () => {
            this.deleteCard();
        });

        // Close modals on outside click
        window.onclick = (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        };
    }

    showAddModal() {
        const modal = document.getElementById('addInventoryModal');
        modal.style.display = 'block';
        document.getElementById('bulkCardInput').value = '';
        document.getElementById('bulkCardInput').focus();
    }

    addBulkCards() {
        const input = document.getElementById('bulkCardInput').value;
        if (!input.trim()) {
            alert('Please enter some cards');
            return;
        }

        // Split by newlines or commas
        const lines = input.split(/[\n,]/).map(l => l.trim()).filter(l => l);
        let added = 0;

        lines.forEach(line => {
            // Parse quantity and name
            const match = line.match(/^(\d+)x?\s+(.+)$/i);
            let quantity, name;

            if (match) {
                quantity = parseInt(match[1]);
                name = match[2].trim();
            } else {
                quantity = 1;
                name = line.trim();
            }

            if (name) {
                if (!this.inventory[name]) {
                    this.inventory[name] = { owned: 0 };
                }
                this.inventory[name].owned = quantity;
                added++;
            }
        });

        this.saveInventory();
        this.renderInventory();
        this.updateStats();
        document.getElementById('addInventoryModal').style.display = 'none';

        alert(`Added ${added} card(s) to inventory`);
    }

    showEditModal(cardName) {
        this.currentEditCard = cardName;
        const modal = document.getElementById('editCardModal');
        document.getElementById('editCardName').textContent = cardName;
        document.getElementById('editCardQuantity').value = this.inventory[cardName]?.owned || 0;
        modal.style.display = 'block';
        document.getElementById('editCardQuantity').focus();
    }

    saveCardEdit() {
        if (!this.currentEditCard) return;

        const quantity = parseInt(document.getElementById('editCardQuantity').value) || 0;

        if (quantity <= 0) {
            if (confirm('Quantity is 0. Delete this card from inventory?')) {
                delete this.inventory[this.currentEditCard];
            }
        } else {
            if (!this.inventory[this.currentEditCard]) {
                this.inventory[this.currentEditCard] = {};
            }
            this.inventory[this.currentEditCard].owned = quantity;
        }

        this.saveInventory();
        this.renderInventory();
        this.updateStats();
        document.getElementById('editCardModal').style.display = 'none';
    }

    deleteCard() {
        if (!this.currentEditCard) return;

        if (confirm(`Delete "${this.currentEditCard}" from inventory?`)) {
            delete this.inventory[this.currentEditCard];
            this.saveInventory();
            this.renderInventory();
            this.updateStats();
            document.getElementById('editCardModal').style.display = 'none';
        }
    }

    filterCards() {
        let cards = Object.keys(this.inventory);

        // Apply search
        if (this.searchTerm) {
            cards = cards.filter(name =>
                name.toLowerCase().includes(this.searchTerm)
            );
        }

        // Apply filter
        switch (this.currentFilter) {
            case 'unused':
                cards = cards.filter(name => {
                    const { totalUsed } = this.getCardUsage(name);
                    return totalUsed === 0;
                });
                break;

            case 'used':
                cards = cards.filter(name => {
                    const { totalUsed } = this.getCardUsage(name);
                    return totalUsed > 0;
                });
                break;

            case 'available':
                cards = cards.filter(name => {
                    const { totalUsed } = this.getCardUsage(name);
                    const owned = this.inventory[name].owned;
                    return owned > totalUsed;
                });
                break;
        }

        return cards.sort();
    }

    renderInventory() {
        const list = document.getElementById('inventoryList');
        const cards = this.filterCards();

        if (cards.length === 0) {
            list.innerHTML = '<p style="color: rgba(255,255,255,0.6); text-align: center; padding: 40px;">No cards found. Click "+ Add Cards to Inventory" to get started.</p>';
            return;
        }

        list.innerHTML = cards.map(cardName => {
            const owned = this.inventory[cardName].owned;
            const { usage, totalUsed } = this.getCardUsage(cardName);
            const available = owned - totalUsed;
            const isUnused = totalUsed === 0;

            // Build deck list
            const deckList = Object.keys(usage).map(deckKey => {
                const deck = usage[deckKey];
                return `<div class="deck-usage-item">
                    <a href="deck.html?id=${deckKey.split('-')[0]}" target="_blank">${deck.deckName}</a>
                    <span class="usage-quantity">×${deck.quantity}</span>
                </div>`;
            }).join('');

            const statusClass = isUnused ? 'status-unused' : (available > 0 ? 'status-available' : 'status-used');

            return `
                <div class="inventory-card ${statusClass}">
                    <div class="inventory-card-header">
                        <div class="inventory-card-name">${cardName}</div>
                        <button class="edit-inventory-btn" onclick="inventory.showEditModal('${cardName.replace(/'/g, "\\'")}')">
                            Edit
                        </button>
                    </div>
                    <div class="inventory-card-stats">
                        <div class="stat-badge owned">Owned: ${owned}</div>
                        <div class="stat-badge used">Used: ${totalUsed}</div>
                        <div class="stat-badge available ${available > 0 ? 'positive' : ''}">
                            Available: ${available}
                        </div>
                    </div>
                    ${deckList ? `
                        <div class="deck-usage-list">
                            <div class="deck-usage-label">Used in:</div>
                            ${deckList}
                        </div>
                    ` : '<div class="unused-notice">⚠️ Not used in any deck</div>'}
                </div>
            `;
        }).join('');
    }

    updateStats() {
        const totalCards = Object.keys(this.inventory).length;
        const usedCards = Object.keys(this.inventory).filter(name => {
            const { totalUsed } = this.getCardUsage(name);
            return totalUsed > 0;
        }).length;
        const unusedCards = totalCards - usedCards;
        const totalQuantity = Object.values(this.inventory).reduce((sum, card) => sum + card.owned, 0);

        document.getElementById('totalCards').textContent = totalCards;
        document.getElementById('usedCards').textContent = usedCards;
        document.getElementById('unusedCards').textContent = unusedCards;
        document.getElementById('totalQuantity').textContent = totalQuantity;
    }
}

// Initialize when DOM is ready
let inventory;
document.addEventListener('DOMContentLoaded', () => {
    inventory = new CardInventory();
});
