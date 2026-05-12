// Deck detail page JavaScript
class DeckDetail {
    constructor() {
        this.deckId = this.getDeckIdFromUrl();
        this.deck = this.findDeck();
        this.currentPath = null;
        this.ownedCards = this.loadOwnedCards();
        this.customCards = this.loadCustomCards();
        this.cardImages = {}; // Cache for card images
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
        let detailsHTML = `
            <p><strong>Strategy:</strong> ${this.deck.strategy}</p>
            <p><strong>Status:</strong> ${this.deck.status}</p>
        `;

        if (this.deck.note) {
            detailsHTML += `<p><strong>Note:</strong> ${this.deck.note}</p>`;
        }

        if (this.deck.consolidatedInto) {
            detailsHTML += `<p><strong>⚠️ Consolidated into:</strong> <a href="deck.html?id=${this.deck.consolidatedInto}" style="color: white; text-decoration: underline;">Deck #${this.deck.consolidatedInto}</a></p>`;
        }

        detailsSection.innerHTML = detailsHTML;
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
        if (this.deck.altPaths && this.currentPath && this.deck[this.currentPath]) {
            return {
                mainDeck: this.deck[this.currentPath].mainDeck || [],
                extraDeck: this.deck[this.currentPath].extraDeck || []
            };
        }
        return {
            mainDeck: this.deck.mainDeck || [],
            extraDeck: this.deck.extraDeck || []
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
        const ownedClass = isOwned ? 'owned' : '';
        const deleteBtn = isCustom ? `<button class="delete-card-btn" onclick="deckDetail.deleteCard('${card}', '${deckType}')">Delete</button>` : '';
        const cleanName = card.replace(/^\d+\s+/, '');

        return `
            <div class="card-item ${ownedClass}" data-card-name="${cleanName.replace(/"/g, '&quot;')}">
                <div class="card-image-small">
                    <span>...</span>
                </div>
                <span class="card-item-text">${card}</span>
                <div class="card-actions">
                    <input type="checkbox"
                           class="card-checkbox"
                           ${isOwned ? 'checked' : ''}
                           onchange="deckDetail.toggleCardOwnership('${card}')">
                    ${deleteBtn}
                </div>
            </div>
        `;
    }

    toggleCardOwnership(card) {
        this.ownedCards[card] = !this.ownedCards[card];
        this.saveOwnedCards();
        this.renderCards();
    }

    deleteCard(card, deckType) {
        if (!confirm(`Delete "${card}" from deck?`)) return;

        const index = this.customCards[deckType].indexOf(card);
        if (index > -1) {
            this.customCards[deckType].splice(index, 1);
            this.saveCustomCards();
            this.renderCards();
        }
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
