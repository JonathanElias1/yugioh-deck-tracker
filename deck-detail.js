// Deck detail page JavaScript
class DeckDetail {
    constructor() {
        this.deckId = this.getDeckIdFromUrl();
        this.deck = this.findDeck();
        this.currentPath = null;
        this.ownedCards = this.loadOwnedCards();
        this.customCards = this.loadCustomCards();
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

    renderCards() {
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
    }

    renderCard(card, isOwned, isCustom, deckType) {
        const ownedClass = isOwned ? 'owned' : '';
        const deleteBtn = isCustom ? `<button class="delete-card-btn" onclick="deckDetail.deleteCard('${card}', '${deckType}')">Delete</button>` : '';

        return `
            <div class="card-item ${ownedClass}">
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

    showAddCardModal(deckType) {
        this.currentAddingTo = deckType;
        const modal = document.getElementById('addCardModal');
        modal.style.display = 'block';
        document.getElementById('cardName').value = '';
        document.getElementById('cardQuantity').value = '1';
        document.getElementById('cardName').focus();
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
