// Card Inventory Management System
class CardInventory {
    constructor() {
        this.inventory = this.loadInventory();
        this.decks = decks || [];
        this.currentFilter = 'all';
        this.searchTerm = '';
        this.currentEditCard = null;
        this.cardImages = {}; // Cache for card images
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

        // Export to PDF
        document.getElementById('exportInventoryPDF').addEventListener('click', () => {
            this.exportToPDF();
        });

        // Close modals on outside click
        window.onclick = (e) => {
            if (e.target.classList.contains('modal')) {
                e.target.style.display = 'none';
            }
        };
    }

    exportToPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Title
        doc.setFontSize(20);
        doc.setFont(undefined, 'bold');
        doc.text('Card Inventory', 105, 20, { align: 'center' });

        // Date
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        const date = new Date().toLocaleDateString();
        doc.text(`Generated: ${date}`, 105, 28, { align: 'center' });

        // Stats
        const totalCards = Object.keys(this.inventory).length;
        const usedCards = Object.keys(this.inventory).filter(name => {
            const { totalUsed } = this.getCardUsage(name);
            return totalUsed > 0;
        }).length;
        const unusedCards = totalCards - usedCards;
        const totalQuantity = Object.values(this.inventory).reduce((sum, card) => sum + card.owned, 0);

        doc.setFontSize(11);
        let yPos = 40;
        doc.text(`Total Unique Cards: ${totalCards}`, 20, yPos);
        yPos += 6;
        doc.text(`Total Quantity: ${totalQuantity}`, 20, yPos);
        yPos += 6;
        doc.text(`Used in Decks: ${usedCards}`, 20, yPos);
        yPos += 6;
        doc.text(`Unused: ${unusedCards}`, 20, yPos);
        yPos += 12;

        // Filter info
        if (this.currentFilter !== 'all') {
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Filter: ${this.currentFilter.toUpperCase()}`, 20, yPos);
            yPos += 8;
            doc.setTextColor(0);
        }

        // Cards list
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Card List:', 20, yPos);
        yPos += 8;

        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');

        const cards = this.filterCards();

        cards.forEach((cardName, index) => {
            const owned = this.inventory[cardName].owned;
            const { usage, totalUsed } = this.getCardUsage(cardName);
            const available = owned - totalUsed;

            // Check if we need a new page
            if (yPos > 265) {
                doc.addPage();
                yPos = 20;
            }

            // Card name and quantities
            doc.setFont(undefined, 'bold');
            doc.text(`${cardName}`, 25, yPos);
            yPos += 5;

            doc.setFont(undefined, 'normal');
            doc.text(`  Owned: ${owned} | Used: ${totalUsed} | Available: ${available}`, 25, yPos);
            yPos += 5;

            // Deck usage
            if (Object.keys(usage).length > 0) {
                doc.setFontSize(8);
                doc.setTextColor(100);
                const deckNames = Object.keys(usage).map(key => usage[key].deckName).join(', ');
                const usageText = `  Used in: ${deckNames}`;
                const usageLines = doc.splitTextToSize(usageText, 160);
                doc.text(usageLines, 25, yPos);
                yPos += usageLines.length * 4;
                doc.setTextColor(0);
                doc.setFontSize(9);
            }

            yPos += 3;
        });

        // Save PDF
        const filename = `yugioh-inventory-${date.replace(/\//g, '-')}.pdf`;
        doc.save(filename);

        alert('Inventory PDF exported successfully!');
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

    async fetchCardImage(cardName) {
        // Check cache first
        if (this.cardImages[cardName]) {
            return this.cardImages[cardName];
        }

        try {
            const response = await fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${encodeURIComponent(cardName)}`);
            const data = await response.json();

            if (data.data && data.data[0] && data.data[0].card_images) {
                const imageUrl = data.data[0].card_images[0].image_url_small;
                this.cardImages[cardName] = imageUrl;
                return imageUrl;
            }
        } catch (error) {
            console.log(`Could not fetch image for: ${cardName}`);
        }

        // Return placeholder if image not found
        this.cardImages[cardName] = null;
        return null;
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

    async renderInventory() {
        const list = document.getElementById('inventoryList');
        const cards = this.filterCards();

        if (cards.length === 0) {
            list.innerHTML = '<p style="color: rgba(255,255,255,0.6); text-align: center; padding: 40px;">No cards found. Click "+ Add Cards to Inventory" to get started.</p>';
            return;
        }

        // Initial render with placeholders
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
                <div class="inventory-card ${statusClass}" data-card-name="${cardName.replace(/"/g, '&quot;')}">
                    <div class="card-image-container">
                        <div class="card-image-placeholder">
                            <span>Loading...</span>
                        </div>
                    </div>
                    <div class="inventory-card-content">
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
                </div>
            `;
        }).join('');

        // Fetch images asynchronously
        cards.forEach(async (cardName) => {
            const imageUrl = await this.fetchCardImage(cardName);
            const cardElement = document.querySelector(`.inventory-card[data-card-name="${cardName.replace(/"/g, '&quot;')}"]`);

            if (cardElement) {
                const imageContainer = cardElement.querySelector('.card-image-container');
                if (imageUrl) {
                    imageContainer.innerHTML = `<img src="${imageUrl}" alt="${cardName}" class="inventory-card-image">`;
                    // Make images clickable for lightbox
                    if (typeof makeCardImagesClickable === 'function') {
                        makeCardImagesClickable();
                    }
                } else {
                    imageContainer.innerHTML = `<div class="card-image-placeholder"><span>❓</span></div>`;
                }
            }
        });
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
