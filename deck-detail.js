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
        if (!saved) return {};

        try {
            const parsed = JSON.parse(saved);
            return typeof parsed === 'object' && parsed !== null ? parsed : {};
        } catch (e) {
            console.error('Error parsing ownedCards:', e);
            return {};
        }
    }

    saveOwnedCards() {
        localStorage.setItem(`ownedCards_${this.deckId}`, JSON.stringify(this.ownedCards));
        // Trigger Supabase sync
        if (window.deckSync) {
            window.deckSync.scheduleSyncDeck(this.deckId);
        }
    }

    loadCustomCards() {
        const saved = localStorage.getItem(`customCards_${this.deckId}`);
        if (!saved) return { main: [], extra: [] };

        try {
            const parsed = JSON.parse(saved);
            // Ensure the structure is correct
            return {
                main: Array.isArray(parsed?.main) ? parsed.main : [],
                extra: Array.isArray(parsed?.extra) ? parsed.extra : []
            };
        } catch (e) {
            console.error('Error parsing customCards:', e);
            return { main: [], extra: [] };
        }
    }

    saveCustomCards() {
        localStorage.setItem(`customCards_${this.deckId}`, JSON.stringify(this.customCards));
        // Trigger Supabase sync
        if (window.deckSync) {
            window.deckSync.scheduleSyncDeck(this.deckId);
        }
    }

    loadRemovedCards() {
        const saved = localStorage.getItem(`removedCards_${this.deckId}`);
        if (!saved) return [];

        try {
            const parsed = JSON.parse(saved);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.error('Error parsing removedCards:', e);
            return [];
        }
    }

    saveRemovedCards(removedCards) {
        localStorage.setItem(`removedCards_${this.deckId}`, JSON.stringify(removedCards));
        // Trigger Supabase sync
        if (window.deckSync) {
            window.deckSync.scheduleSyncDeck(this.deckId);
        }
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
                    // Make images clickable for lightbox
                    if (typeof makeCardImagesClickable === 'function') {
                        makeCardImagesClickable();
                    }
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
                    <span class="card-item-text">${cleanName}</span>
                    ${ownedQuantity > 0 ? `
                        <select class="condition-select" onchange="deckDetail.setCardCondition('${card.replace(/'/g, "\\'")}', this.value)">
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
                        <button class="qty-btn" onclick="deckDetail.decrementQuantity('${card.replace(/'/g, "\\'")}')">−</button>
                        <div class="quantity-display">
                            <span class="owned-qty">${ownedQuantity}</span>
                            <span class="qty-separator">/</span>
                            <span class="total-qty">${totalQuantity}</span>
                        </div>
                        <button class="qty-btn" onclick="deckDetail.incrementQuantity('${card.replace(/'/g, "\\'")}', ${totalQuantity})">+</button>
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

        // Modal close handlers
        const modal = document.getElementById('addCardModal');
        const closeBtn = document.querySelector('.close');

        closeBtn.onclick = () => {
            modal.style.display = 'none';
        };

        // Export modal close
        const exportModal = document.getElementById('exportModal');
        const exportClose = document.querySelector('.export-close');
        if (exportClose) {
            exportClose.onclick = () => {
                exportModal.style.display = 'none';
            };
        }

        // Import modal close
        const importModal = document.getElementById('importModal');
        const importClose = document.querySelector('.import-close');
        if (importClose) {
            importClose.onclick = () => {
                importModal.style.display = 'none';
            };
        }

        window.onclick = (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
            if (e.target === exportModal) {
                exportModal.style.display = 'none';
            }
            if (e.target === importModal) {
                importModal.style.display = 'none';
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

    showExportModal() {
        const modal = document.getElementById('exportModal');
        document.getElementById('exportOutput').style.display = 'none';
        modal.style.display = 'block';
    }

    showImportModal() {
        const modal = document.getElementById('importModal');
        document.getElementById('importTextarea').value = '';
        modal.style.display = 'block';
    }

    exportDeck(format) {
        const deckList = this.getCurrentDeckList();
        const allMainCards = [...deckList.mainDeck, ...this.customCards.main];
        const allExtraCards = [...deckList.extraDeck, ...this.customCards.extra];

        let output = '';

        switch (format) {
            case 'ygoprodeck':
                output = this.exportYGOPRODECK(allMainCards, allExtraCards);
                break;
            case 'duelingbook':
                output = this.exportDuelingBook(allMainCards, allExtraCards);
                break;
            case 'tcgplayer':
                output = this.exportTCGPlayer(allMainCards, allExtraCards);
                break;
            case 'plain':
                output = this.exportPlainText(allMainCards, allExtraCards);
                break;
        }

        document.getElementById('exportTextarea').value = output;
        document.getElementById('exportOutput').style.display = 'block';
    }

    exportYGOPRODECK(mainDeck, extraDeck) {
        let output = '# Main Deck\n';
        mainDeck.forEach(card => {
            output += `${card}\n`;
        });

        if (extraDeck.length > 0) {
            output += '\n# Extra Deck\n';
            extraDeck.forEach(card => {
                output += `${card}\n`;
            });
        }

        return output;
    }

    exportDuelingBook(mainDeck, extraDeck) {
        // Dueling Book format: card name without quantity prefix
        let output = '';

        mainDeck.forEach(card => {
            const parsed = card.match(/^(\d+)\s+(.+)$/) || [null, 1, card];
            const quantity = parseInt(parsed[1]);
            const name = parsed[2];
            for (let i = 0; i < quantity; i++) {
                output += `${name}\n`;
            }
        });

        if (extraDeck.length > 0) {
            output += '\n';
            extraDeck.forEach(card => {
                const parsed = card.match(/^(\d+)\s+(.+)$/) || [null, 1, card];
                const quantity = parseInt(parsed[1]);
                const name = parsed[2];
                for (let i = 0; i < quantity; i++) {
                    output += `${name}\n`;
                }
            });
        }

        return output;
    }

    exportTCGPlayer(mainDeck, extraDeck) {
        // TCGPlayer mass entry format: quantity + name
        let output = '';

        mainDeck.forEach(card => {
            output += `${card}\n`;
        });

        if (extraDeck.length > 0) {
            output += '\n';
            extraDeck.forEach(card => {
                output += `${card}\n`;
            });
        }

        return output;
    }

    exportPlainText(mainDeck, extraDeck) {
        let output = `${this.deck.name} - ${this.deck.tier} Tier\n\n`;
        output += `Main Deck (${mainDeck.length} cards):\n`;
        output += '─────────────────────────\n';

        mainDeck.forEach(card => {
            output += `${card}\n`;
        });

        if (extraDeck.length > 0) {
            output += `\nExtra Deck (${extraDeck.length} cards):\n`;
            output += '─────────────────────────\n';
            extraDeck.forEach(card => {
                output += `${card}\n`;
            });
        }

        return output;
    }

    copyExport() {
        const textarea = document.getElementById('exportTextarea');
        textarea.select();
        document.execCommand('copy');

        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '✅ Copied!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    }

    importDeck(deckType) {
        const input = document.getElementById('importTextarea').value;
        if (!input.trim()) {
            alert('Please paste a deck list');
            return;
        }

        const cards = this.parseImportedDeck(input);

        if (cards.length === 0) {
            alert('No valid cards found in the import');
            return;
        }

        // Add to custom cards
        this.customCards[deckType].push(...cards);
        this.saveCustomCards();
        this.renderCards();

        document.getElementById('importModal').style.display = 'none';
        alert(`Successfully imported ${cards.length} card(s) to ${deckType} deck!`);
    }

    parseImportedDeck(input) {
        const lines = input.split('\n').map(l => l.trim()).filter(l => l);
        const cards = [];
        const cardCounts = {};

        lines.forEach(line => {
            // Skip comments and section headers
            if (line.startsWith('#') || line.startsWith('Main Deck') || line.startsWith('Extra Deck') || line.startsWith('─')) {
                return;
            }

            // Try to parse quantity + name format (3 Blue-Eyes White Dragon)
            const quantityMatch = line.match(/^(\d+)x?\s+(.+)$/i);
            if (quantityMatch) {
                const quantity = parseInt(quantityMatch[1]);
                const name = quantityMatch[2].trim();
                if (!cardCounts[name]) {
                    cardCounts[name] = 0;
                }
                cardCounts[name] += quantity;
            } else {
                // Plain card name (count as 1)
                const name = line.trim();
                if (name) {
                    if (!cardCounts[name]) {
                        cardCounts[name] = 0;
                    }
                    cardCounts[name] += 1;
                }
            }
        });

        // Convert to card entries
        Object.keys(cardCounts).forEach(name => {
            const quantity = cardCounts[name];
            cards.push(quantity > 1 ? `${quantity} ${name}` : `1 ${name}`);
        });

        return cards;
    }

    exportToPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Title
        doc.setFontSize(20);
        doc.setFont(undefined, 'bold');
        doc.text(`${this.deck.name}`, 105, 20, { align: 'center' });

        // Tier and Status
        doc.setFontSize(14);
        doc.text(`${this.deck.tier} Tier`, 105, 30, { align: 'center' });

        // Date
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        const date = new Date().toLocaleDateString();
        doc.text(`Generated: ${date}`, 105, 38, { align: 'center' });

        let yPos = 50;

        // Strategy
        if (this.deck.strategy) {
            doc.setFontSize(11);
            doc.setFont(undefined, 'bold');
            doc.text('Strategy:', 20, yPos);
            yPos += 6;
            doc.setFont(undefined, 'normal');
            doc.setFontSize(10);
            const strategyLines = doc.splitTextToSize(this.deck.strategy, 170);
            doc.text(strategyLines, 20, yPos);
            yPos += strategyLines.length * 5 + 10;
        }

        // Metadata
        if (this.deckMetadata.tags && this.deckMetadata.tags.length > 0) {
            doc.setFontSize(11);
            doc.setFont(undefined, 'bold');
            doc.text('Tags:', 20, yPos);
            yPos += 6;
            doc.setFont(undefined, 'normal');
            doc.setFontSize(10);
            doc.text(this.deckMetadata.tags.join(', '), 20, yPos);
            yPos += 10;
        }

        if (this.deckMetadata.storageLocation) {
            doc.setFontSize(11);
            doc.setFont(undefined, 'bold');
            doc.text('Storage:', 20, yPos);
            yPos += 6;
            doc.setFont(undefined, 'normal');
            doc.setFontSize(10);
            doc.text(this.deckMetadata.storageLocation, 20, yPos);
            yPos += 10;
        }

        // Completion stats
        const completion = this.calculateDeckCompletion();
        doc.setFontSize(11);
        doc.text(`Completion: ${completion}%`, 20, yPos);
        yPos += 10;

        // Main Deck
        const deckList = this.getCurrentDeckList();
        const allMainCards = [...deckList.mainDeck, ...this.customCards.main];

        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(`Main Deck (${allMainCards.length} cards)`, 20, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');

        allMainCards.forEach(card => {
            if (yPos > 270) {
                doc.addPage();
                yPos = 20;
            }

            const ownedValue = this.ownedCards[card];
            const parsed = card.match(/^(\d+)\s+(.+)$/) || [null, 1, card];
            const totalQuantity = parseInt(parsed[1]);
            const ownedQuantity = typeof ownedValue === 'number' ? ownedValue : (ownedValue ? totalQuantity : 0);
            const condition = this.cardConditions[card] || 'NM';

            const status = ownedQuantity >= totalQuantity ? '✓' : ownedQuantity > 0 ? '○' : '✗';
            const text = `${status} ${card} [${ownedQuantity}/${totalQuantity}] (${condition})`;

            doc.text(text, 25, yPos);
            yPos += 6;
        });

        // Extra Deck
        const allExtraCards = [...deckList.extraDeck, ...this.customCards.extra];

        if (allExtraCards.length > 0) {
            yPos += 8;

            if (yPos > 260) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.text(`Extra Deck (${allExtraCards.length} cards)`, 20, yPos);
            yPos += 8;

            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');

            allExtraCards.forEach(card => {
                if (yPos > 270) {
                    doc.addPage();
                    yPos = 20;
                }

                const ownedValue = this.ownedCards[card];
                const parsed = card.match(/^(\d+)\s+(.+)$/) || [null, 1, card];
                const totalQuantity = parseInt(parsed[1]);
                const ownedQuantity = typeof ownedValue === 'number' ? ownedValue : (ownedValue ? totalQuantity : 0);
                const condition = this.cardConditions[card] || 'NM';

                const status = ownedQuantity >= totalQuantity ? '✓' : ownedQuantity > 0 ? '○' : '✗';
                const text = `${status} ${card} [${ownedQuantity}/${totalQuantity}] (${condition})`;

                doc.text(text, 25, yPos);
                yPos += 6;
            });
        }

        // Notes
        if (this.deckMetadata.customNotes) {
            yPos += 10;

            if (yPos > 240) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.text('Notes:', 20, yPos);
            yPos += 8;

            doc.setFont(undefined, 'normal');
            doc.setFontSize(10);
            const notesLines = doc.splitTextToSize(this.deckMetadata.customNotes, 170);
            doc.text(notesLines, 20, yPos);
        }

        // Save PDF
        const filename = `${this.deck.name.replace(/[^a-z0-9]/gi, '-')}-${date.replace(/\//g, '-')}.pdf`;
        doc.save(filename);

        alert('PDF exported successfully!');
    }

    calculateDeckCompletion() {
        const deckList = this.getCurrentDeckList();
        const allCards = [...deckList.mainDeck, ...this.customCards.main, ...deckList.extraDeck, ...this.customCards.extra];

        let totalNeeded = 0;
        let totalOwned = 0;

        allCards.forEach(cardEntry => {
            const parsed = cardEntry.match(/^(\d+)\s+(.+)$/) || [null, 1, cardEntry];
            const quantity = parseInt(parsed[1]);
            totalNeeded += quantity;

            const ownedValue = this.ownedCards[cardEntry];
            if (typeof ownedValue === 'number') {
                totalOwned += ownedValue;
            } else if (ownedValue === true) {
                totalOwned += quantity;
            }
        });

        return totalNeeded > 0 ? Math.round((totalOwned / totalNeeded) * 100) : 0;
    }

    async forceRefreshFromCloud() {
        if (!window.deckSync || !isAuthenticated()) {
            alert('Not authenticated. Please refresh the page.');
            return;
        }

        const statusDiv = document.getElementById('syncStatus');
        if (statusDiv) {
            statusDiv.style.display = 'block';
            statusDiv.textContent = '☁️ Refreshing from cloud...';
            statusDiv.style.background = 'rgba(78, 205, 196, 0.3)';
        }

        try {
            console.log('🔄 Manual refresh from cloud requested...');
            await window.deckSync.pullFromSupabase();

            // Reload the page data
            this.ownedCards = this.loadOwnedCards();
            this.removedCards = this.loadRemovedCards();
            this.customCards = this.loadCustomCards();
            this.renderCards();

            if (statusDiv) {
                statusDiv.textContent = '✅ Refreshed successfully!';
                statusDiv.style.background = 'rgba(76, 175, 80, 0.6)';
                setTimeout(() => {
                    statusDiv.style.display = 'none';
                }, 3000);
            }

            // Update last sync time display
            updateLastSyncTimeDisplay();

            console.log('✅ Manual refresh completed');
        } catch (error) {
            console.error('❌ Manual refresh failed:', error);
            if (statusDiv) {
                statusDiv.textContent = '❌ Refresh failed';
                statusDiv.style.background = 'rgba(234, 67, 53, 0.6)';
                setTimeout(() => {
                    statusDiv.style.display = 'none';
                }, 5000);
            }
        }
    }
}

// Initialize when DOM is ready
let deckDetail;
document.addEventListener('DOMContentLoaded', async () => {
    const statusDiv = document.getElementById('syncStatus');

    try {
        // Wait for auth
        if (statusDiv) {
            statusDiv.style.display = 'block';
            statusDiv.textContent = '🔐 Authenticating...';
            statusDiv.style.background = 'rgba(78, 205, 196, 0.3)';
        }

        if (typeof initAuth === 'function') {
            await initAuth();
        }

        // Pull from Supabase
        if (window.deckSync && typeof isAuthenticated === 'function' && isAuthenticated()) {
            if (statusDiv) {
                statusDiv.textContent = '☁️ Loading from cloud...';
            }
            console.log('📥 Pulling deck progress before loading deck page...');
            await window.deckSync.pullFromSupabase();

            if (statusDiv) {
                statusDiv.textContent = '✅ Loaded from cloud';
                statusDiv.style.background = 'rgba(76, 175, 80, 0.6)';
                setTimeout(() => {
                    statusDiv.style.display = 'none';
                }, 2000);
            }
        } else {
            if (statusDiv) {
                statusDiv.textContent = '⚠️ Offline mode';
                statusDiv.style.background = 'rgba(251, 188, 4, 0.6)';
                setTimeout(() => {
                    statusDiv.style.display = 'none';
                }, 3000);
            }
        }

        deckDetail = new DeckDetail();

        // Update last sync time display
        updateLastSyncTimeDisplay();
    } catch (error) {
        console.error('❌ Initialization error:', error);
        if (statusDiv) {
            statusDiv.textContent = '❌ Failed to load';
            statusDiv.style.background = 'rgba(234, 67, 53, 0.6)';
        }
    }
});

// Update last sync time display
function updateLastSyncTimeDisplay() {
    const lastSyncTimeDiv = document.getElementById('lastSyncTime');
    if (!lastSyncTimeDiv) return;

    const lastSyncTime = localStorage.getItem('lastSyncTime');
    if (!lastSyncTime) {
        lastSyncTimeDiv.textContent = 'Never synced';
        return;
    }

    const lastSync = new Date(lastSyncTime);
    const now = new Date();
    const diffMs = now - lastSync;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    let timeAgo;
    if (diffMins < 1) {
        timeAgo = 'Just now';
    } else if (diffMins < 60) {
        timeAgo = `${diffMins}m ago`;
    } else if (diffHours < 24) {
        timeAgo = `${diffHours}h ago`;
    } else {
        timeAgo = `${diffDays}d ago`;
    }

    lastSyncTimeDiv.textContent = `Last synced: ${timeAgo}`;
}
