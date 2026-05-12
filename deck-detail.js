// Deck detail page JavaScript
class DeckDetail {
    constructor() {
        this.deckId = this.getDeckIdFromUrl();
        this.deck = this.findDeck();
        this.currentPath = null;
        this.ownedCards = this.loadOwnedCards();
        this.customCards = this.loadCustomCards();
        this.removedCards = this.loadRemovedCards(); // Cards removed from deck
        this.cardImages = {}; // Cache for card images
        this.deckMetadata = this.loadDeckMetadata(); // Tags, notes, storage
        this.cardConditions = this.loadCardConditions(); // Card conditions
        this.init();
    }

    getDeckIdFromUrl() {
        const params = new URLSearchParams(window.location.search);
        return parseInt(params.get('id'));
    }

    findDeck() {
        return decks.find(d => d.id === this.deckId);
    }

    loadOwnedCards() {
        const saved = localStorage.getItem(`ownedCards_${this.deckId}`);
        return saved ? JSON.parse(saved) : {};
    }

    saveOwnedCards() {
        localStorage.setItem(`ownedCards_${this.deckId}`, JSON.stringify(this.ownedCards));
    }

    loadCustomCards() {
        const saved = localStorage.getItem(`customCards_${this.deckId}`);
        return saved ? JSON.parse(saved) : { main: [], extra: [] };
    }

    saveCustomCards() {
        localStorage.setItem(`customCards_${this.deckId}`, JSON.stringify(this.customCards));
    }

    loadRemovedCards() {
        const saved = localStorage.getItem(`removedCards_${this.deckId}`);
        return saved ? JSON.parse(saved) : [];
    }

    saveRemovedCards(removedCards) {
        localStorage.setItem(`removedCards_${this.deckId}`, JSON.stringify(removedCards));
    }

    loadDeckMetadata() {
        const saved = localStorage.getItem(`deckMetadata_${this.deckId}`);
        return saved ? JSON.parse(saved) : {
            tags: [],
            customNotes: '',
            storageLocation: ''
        };
    }

    saveDeckMetadata() {
        localStorage.setItem(`deckMetadata_${this.deckId}`, JSON.stringify(this.deckMetadata));
    }

    loadCardConditions() {
        const saved = localStorage.getItem(`cardConditions_${this.deckId}`);
        return saved ? JSON.parse(saved) : {};
    }

    saveCardConditions() {
        localStorage.setItem(`cardConditions_${this.deckId}`, JSON.stringify(this.cardConditions));
    }

    init() {
        if (!this.deck) {
            document.body.innerHTML = '<div style="text-align: center; color: white; padding: 50px;"><h1>Deck not found</h1><a href="index.html" style="color: white;">← Back to Collection</a></div>';
            return;
        }

        this.renderDeckInfo();
        this.renderPathSelector();
        this.renderCards();
        this.setupEventListeners();
    }

    renderDeckInfo() {
        const titleSection = document.getElementById('deckTitleSection');
        titleSection.innerHTML = `
            <h1>Deck #${this.deck.id}: ${this.deck.name}</h1>
            <div class="deck-tier tier-${this.deck.tier}">${this.deck.tier} Tier</div>
        `;

        const detailsSection = document.getElementById('deckDetails');

        // Render tags
        const tagsHTML = this.deckMetadata.tags.length > 0
            ? this.deckMetadata.tags.map(tag => `<span class="deck-tag">${tag} <button class="tag-remove" onclick="deckDetail.removeTag('${tag}')">×</button></span>`).join('')
            : '<span style="color: rgba(255,255,255,0.6);">No tags</span>';

        let detailsHTML = `
            <div class="deck-metadata-section">
                <div class="metadata-item">
                    <strong>Tags:</strong>
                    <div class="tags-container">
                        ${tagsHTML}
                        <button class="add-tag-btn" onclick="deckDetail.showAddTagModal()">+ Add Tag</button>
                    </div>
                </div>

                <div class="metadata-item">
                    <strong>Custom Notes:</strong>
                    <textarea id="customNotes" placeholder="Add your notes, combo explanations, sideboard strategy, etc..." rows="4">${this.deckMetadata.customNotes}</textarea>
                    <button class="save-notes-btn" onclick="deckDetail.saveNotes()">Save Notes</button>
                </div>

                <div class="metadata-item">
                    <strong>Storage Location:</strong>
                    <input type="text" id="storageLocation" placeholder="e.g., Binder 1, Deck Box A, etc." value="${this.deckMetadata.storageLocation}">
                    <button class="save-storage-btn" onclick="deckDetail.saveStorage()">Save Location</button>
                </div>
            </div>

            <div class="deck-info-section">
                <p><strong>Strategy:</strong> ${this.deck.strategy}</p>
                <p><strong>Status:</strong> ${this.deck.status}</p>
                ${this.deck.note ? `<p><strong>Note:</strong> ${this.deck.note}</p>` : ''}
                ${this.deck.consolidatedInto ? `<p><strong>⚠️ Consolidated into:</strong> <a href="deck.html?id=${this.deck.consolidatedInto}" style="color: white; text-decoration: underline;">Deck #${this.deck.consolidatedInto}</a></p>` : ''}
            </div>
        `;

        detailsSection.innerHTML = detailsHTML;
    }

    showAddTagModal() {
        const tag = prompt('Enter a tag name (e.g., Budget, Competitive, Fun):');
        if (tag && tag.trim()) {
            const trimmedTag = tag.trim();
            if (!this.deckMetadata.tags.includes(trimmedTag)) {
                this.deckMetadata.tags.push(trimmedTag);
                this.saveDeckMetadata();
                this.renderDeckInfo();
            }
        }
    }

    removeTag(tag) {
        this.deckMetadata.tags = this.deckMetadata.tags.filter(t => t !== tag);
        this.saveDeckMetadata();
        this.renderDeckInfo();
    }

    saveNotes() {
        this.deckMetadata.customNotes = document.getElementById('customNotes').value;
        this.saveDeckMetadata();
        alert('Notes saved!');
    }

    saveStorage() {
        this.deckMetadata.storageLocation = document.getElementById('storageLocation').value;
        this.saveDeckMetadata();
        alert('Storage location saved!');
    }

    renderPathSelector() {
        if (!this.deck.altPaths) return;

        const pathSelector = document.getElementById('pathSelector');
        pathSelector.style.display = 'block';

        const paths = [];
        if (this.deck.pathA) paths.push({ key: 'pathA', data: this.deck.pathA });
        if (this.deck.pathB) paths.push({ key: 'pathB', data: this.deck.pathB });
        if (this.deck.pathC) paths.push({ key: 'pathC', data: this.deck.pathC });

        let buttonsHTML = '<h3>Select Deck Path:</h3>';
        paths.forEach(path => {
            const active = this.currentPath === path.key ? 'active' : '';
            buttonsHTML += `<button class="path-btn ${active}" data-path="${path.key}">${path.data.name}</button>`;
        });

        pathSelector.innerHTML = buttonsHTML;

        // Set default path if none selected
        if (!this.currentPath && paths.length > 0) {
            this.currentPath = paths[0].key;
        }

        // Add click handlers
        document.querySelectorAll('.path-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.path-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentPath = e.target.dataset.path;
                this.renderCards();
            });
        });
    }

    async fetchCardImage(cardName) {
        // Extract just the card name without quantity prefix
        const cleanName = cardName.replace(/^\d+\s+/, '');

        // Check cache first
        if (this.cardImages[cleanName]) {
            return this.cardImages[cleanName];
        }

        try {
            const response = await fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${encodeURIComponent(cleanName)}`);
            const data = await response.json();

            if (data.data && data.data[0] && data.data[0].card_images) {
                const imageUrl = data.data[0].card_images[0].image_url_small;
                this.cardImages[cleanName] = imageUrl;
                return imageUrl;
            }
        } catch (error) {
            console.log(`Could not fetch image for: ${cleanName}`);
        }

        // Return placeholder if image not found
        this.cardImages[cleanName] = null;
        return null;
    }

    getCurrentDeckList() {
        let mainDeck, extraDeck;

        if (this.deck.altPaths && this.currentPath && this.deck[this.currentPath]) {
            mainDeck = this.deck[this.currentPath].mainDeck || [];
            extraDeck = this.deck[this.currentPath].extraDeck || [];
        } else {
            mainDeck = this.deck.mainDeck || [];
            extraDeck = this.deck.extraDeck || [];
        }

        // Filter out removed cards
        return {
            mainDeck: mainDeck.filter(card => !this.removedCards.includes(card)),
            extraDeck: extraDeck.filter(card => !this.removedCards.includes(card))
        };
    }

    async renderCards() {
        const deckList = this.getCurrentDeckList();

        // Render Main Deck
        const mainDeckEl = document.getElementById('mainDeck');
        const allMainCards = [...deckList.mainDeck, ...this.customCards.main];
        mainDeckEl.innerHTML = allMainCards.map((card, index) => {
            const isOwned = this.ownedCards[card] || false;
            const isCustom = index >= deckList.mainDeck.length;
            return this.renderCard(card, isOwned, isCustom, 'main');
        }).join('');

        // Render Extra Deck
        const extraDeckEl = document.getElementById('extraDeck');
        const allExtraCards = [...deckList.extraDeck, ...this.customCards.extra];
        extraDeckEl.innerHTML = allExtraCards.length > 0
            ? allExtraCards.map((card, index) => {
                const isOwned = this.ownedCards[card] || false;
                const isCustom = index >= deckList.extraDeck.length;
                return this.renderCard(card, isOwned, isCustom, 'extra');
            }).join('')
            : '<p style="color: rgba(255,255,255,0.6);">No Extra Deck cards</p>';

        // Fetch images for all cards
        [...allMainCards, ...allExtraCards].forEach(async (card) => {
            const cleanName = card.replace(/^\d+\s+/, '');
            const imageUrl = await this.fetchCardImage(cleanName);
            const cardElements = document.querySelectorAll(`.card-item[data-card-name="${cleanName.replace(/"/g, '&quot;')}"]`);

            cardElements.forEach(cardElement => {
                const imageContainer = cardElement.querySelector('.card-image-small');
                if (imageContainer && imageUrl) {
                    imageContainer.innerHTML = `<img src="${imageUrl}" alt="${cleanName}">`;
                } else if (imageContainer) {
                    imageContainer.innerHTML = `<span>❓</span>`;
                }
            });
        });
    }

    renderCard(card, isOwned, isCustom, deckType) {
        const parsed = card.match(/^(\d+)\s+(.+)$/) || [null, 1, card];
        const totalQuantity = parseInt(parsed[1]);
        const ownedQuantity = typeof isOwned === 'number' ? isOwned : (isOwned ? totalQuantity : 0);
        const ownedClass = ownedQuantity >= totalQuantity ? 'owned' : (ownedQuantity > 0 ? 'partial' : '');
        const deleteBtn = `<button class="delete-card-btn" onclick="deckDetail.deleteCard('${card.replace(/'/g, "\\'")}', '${deckType}', ${isCustom})">🗑️</button>`;
        const cleanName = card.replace(/^\d+\s+/, '');
        const cardCondition = this.cardConditions[card] || 'NM';

        return `
            <div class="card-item ${ownedClass}" data-card-name="${cleanName.replace(/"/g, '&quot;')}">
                <div class="card-image-small">
                    <span>...</span>
                </div>
                <div class="card-info-section">
                    <span class="card-item-text">${card}</span>
                    ${ownedQuantity > 0 ? `
                        <select class="condition-select" onchange="deckDetail.setCardCondition('${card}', this.value)">
                            <option value="NM" ${cardCondition === 'NM' ? 'selected' : ''}>NM - Near Mint</option>
                            <option value="LP" ${cardCondition === 'LP' ? 'selected' : ''}>LP - Lightly Played</option>
                            <option value="MP" ${cardCondition === 'MP' ? 'selected' : ''}>MP - Moderately Played</option>
                            <option value="HP" ${cardCondition === 'HP' ? 'selected' : ''}>HP - Heavily Played</option>
                            <option value="DMG" ${cardCondition === 'DMG' ? 'selected' : ''}>DMG - Damaged</option>
                        </select>
                    ` : ''}
                </div>
                <div class="card-actions">
                    <div class="quantity-control">
                        <button class="qty-btn" onclick="deckDetail.decrementQuantity('${card}')">−</button>
                        <div class="quantity-display">
                            <span class="owned-qty">${ownedQuantity}</span>
                            <span class="qty-separator">/</span>
                            <span class="total-qty">${totalQuantity}</span>
                        </div>
                        <button class="qty-btn" onclick="deckDetail.incrementQuantity('${card}', ${totalQuantity})">+</button>
                    </div>
                    ${deleteBtn}
                </div>
            </div>
        `;
    }

    setCardCondition(card, condition) {
        this.cardConditions[card] = condition;
        this.saveCardConditions();
    }

    incrementQuantity(card) {
        const parsed = card.match(/^(\d+)\s+(.+)$/) || [null, 1, card];
        const totalQuantity = parseInt(parsed[1]);
        const currentQuantity = typeof this.ownedCards[card] === 'number' ? this.ownedCards[card] : (this.ownedCards[card] ? totalQuantity : 0);

        if (currentQuantity < totalQuantity) {
            this.ownedCards[card] = currentQuantity + 1;
            this.saveOwnedCards();
            this.renderCards();
        }
    }

    decrementQuantity(card) {
        const currentQuantity = typeof this.ownedCards[card] === 'number' ? this.ownedCards[card] : 0;

        if (currentQuantity > 0) {
            this.ownedCards[card] = currentQuantity - 1;
            this.saveOwnedCards();
            this.renderCards();
        }
    }

    toggleCardOwnership(card) {
        const parsed = card.match(/^(\d+)\s+(.+)$/) || [null, 1, card];
        const totalQuantity = parseInt(parsed[1]);
        this.ownedCards[card] = !this.ownedCards[card];
        this.saveOwnedCards();
        this.renderCards();
    }

    deleteCard(card, deckType, isCustom) {
        if (!confirm(`Remove "${card}" from deck? This will also remove ownership data for this card.`)) return;

        if (isCustom) {
            // Remove from custom cards
            const index = this.customCards[deckType].indexOf(card);
            if (index > -1) {
                this.customCards[deckType].splice(index, 1);
                this.saveCustomCards();
            }
        } else {
            // Add to removed cards list (for original deck cards)
            if (!this.removedCards.includes(card)) {
                this.removedCards.push(card);
                this.saveRemovedCards(this.removedCards);
            }
        }

        // Remove ownership data
        if (this.ownedCards[card]) {
            delete this.ownedCards[card];
            this.saveOwnedCards();
        }

        // Remove condition data
        if (this.cardConditions[card]) {
            delete this.cardConditions[card];
            this.saveCardConditions();
        }

        this.renderCards();
    }

    setupEventListeners() {
        // Add Main Deck card
        document.getElementById('addMainCard').addEventListener('click', () => {
            this.showAddCardModal('main');
        });

        // Add Extra Deck card
        document.getElementById('addExtraCard').addEventListener('click', () => {
            this.showAddCardModal('extra');
        });

        // Modal close
        const modal = document.getElementById('addCardModal');
        const closeBtn = document.querySelector('.close');

        closeBtn.onclick = () => {
            modal.style.display = 'none';
        };

        window.onclick = (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        };

        // Confirm add card
        document.getElementById('confirmAddCard').addEventListener('click', () => {
            this.addCard();
        });

        // Enter key to add card
        document.getElementById('cardName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addCard();
            }
        });
    }

    getUnusedCards() {
        // Load inventory from localStorage
        const inventoryStr = localStorage.getItem('cardInventory');
        if (!inventoryStr) return [];

        const inventory = JSON.parse(inventoryStr);
        const unusedCards = [];

        // Check which cards are unused or have available copies
        Object.keys(inventory).forEach(cardName => {
            const owned = inventory[cardName].owned;
            // Calculate how many are used across all decks
            let totalUsed = 0;

            decks.forEach(deck => {
                if (deck.status === 'consolidated') return;

                const ownedCards = localStorage.getItem(`ownedCards_${deck.id}`);
                if (!ownedCards) return;

                const ownedCardsObj = JSON.parse(ownedCards);
                Object.keys(ownedCardsObj).forEach(key => {
                    const parsed = key.match(/^(\d+)\s+(.+)$/) || [null, 1, key];
                    const name = parsed[2];
                    const qty = parseInt(parsed[1]);

                    if (name === cardName && ownedCardsObj[key] === true) {
                        totalUsed += qty;
                    }
                });
            });

            const available = owned - totalUsed;
            if (available > 0) {
                unusedCards.push({ name: cardName, available });
            }
        });

        return unusedCards.sort((a, b) => a.name.localeCompare(b.name));
    }

    showAddCardModal(deckType) {
        this.currentAddingTo = deckType;
        const modal = document.getElementById('addCardModal');
        modal.style.display = 'block';
        document.getElementById('cardName').value = '';
        document.getElementById('cardQuantity').value = '1';
        document.getElementById('cardName').focus();
        this.setupAutocomplete();
    }

    setupAutocomplete() {
        const input = document.getElementById('cardName');
        const unusedCards = this.getUnusedCards();

        // Remove existing autocomplete if any
        const existingDropdown = document.getElementById('autocomplete-dropdown');
        if (existingDropdown) {
            existingDropdown.remove();
        }

        // Create autocomplete dropdown
        const dropdown = document.createElement('div');
        dropdown.id = 'autocomplete-dropdown';
        dropdown.className = 'autocomplete-dropdown';
        input.parentNode.insertBefore(dropdown, input.nextSibling);

        input.addEventListener('input', (e) => {
            const value = e.target.value.toLowerCase();
            dropdown.innerHTML = '';

            if (!value) {
                dropdown.style.display = 'none';
                return;
            }

            const matches = unusedCards.filter(card =>
                card.name.toLowerCase().includes(value)
            ).slice(0, 10); // Show max 10 suggestions

            if (matches.length === 0) {
                dropdown.style.display = 'none';
                return;
            }

            dropdown.style.display = 'block';
            dropdown.innerHTML = matches.map(card => `
                <div class="autocomplete-item" data-name="${card.name.replace(/"/g, '&quot;')}">
                    ${card.name}
                    <span class="available-badge">${card.available} available</span>
                </div>
            `).join('');

            // Add click handlers
            dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
                item.addEventListener('click', () => {
                    input.value = item.dataset.name;
                    dropdown.style.display = 'none';
                    dropdown.innerHTML = '';
                });
            });
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!input.contains(e.target) && !dropdown.contains(e.target)) {
                dropdown.style.display = 'none';
            }
        });
    }

    addCard() {
        const quantity = parseInt(document.getElementById('cardQuantity').value) || 1;
        const cardName = document.getElementById('cardName').value.trim();

        if (!cardName) {
            alert('Please enter a card name');
            return;
        }

        const cardEntry = quantity > 1 ? `${quantity} ${cardName}` : `1 ${cardName}`;

        this.customCards[this.currentAddingTo].push(cardEntry);
        this.saveCustomCards();
        this.renderCards();

        // Close modal
        document.getElementById('addCardModal').style.display = 'none';
    }
}

// Initialize when DOM is ready
let deckDetail;
document.addEventListener('DOMContentLoaded', () => {
    deckDetail = new DeckDetail();
});
