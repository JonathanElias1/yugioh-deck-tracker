// Deck Comparison Tool
class DeckComparison {
    constructor() {
        this.decks = decks || [];
        this.deck1 = null;
        this.deck2 = null;
        this.init();
    }

    init() {
        this.populateSelectors();
        this.setupEventListeners();
        this.showEmptyState();
    }

    populateSelectors() {
        const deck1Selector = document.getElementById('deck1Selector');
        const deck2Selector = document.getElementById('deck2Selector');

        const activeDecks = this.decks.filter(d => d.status === 'active').sort((a, b) => a.name.localeCompare(b.name));

        activeDecks.forEach(deck => {
            const option1 = document.createElement('option');
            option1.value = deck.id;
            option1.textContent = `${deck.name} (${deck.tier} Tier)`;
            deck1Selector.appendChild(option1);

            const option2 = document.createElement('option');
            option2.value = deck.id;
            option2.textContent = `${deck.name} (${deck.tier} Tier)`;
            deck2Selector.appendChild(option2);
        });
    }

    setupEventListeners() {
        document.getElementById('deck1Selector').addEventListener('change', (e) => {
            const deckId = parseInt(e.target.value);
            this.deck1 = this.decks.find(d => d.id === deckId);
            this.performComparison();
        });

        document.getElementById('deck2Selector').addEventListener('change', (e) => {
            const deckId = parseInt(e.target.value);
            this.deck2 = this.decks.find(d => d.id === deckId);
            this.performComparison();
        });
    }

    parseCardEntry(entry) {
        const match = entry.match(/^(\d+)\s+(.+)$/);
        if (match) {
            return { quantity: parseInt(match[1]), name: match[2] };
        }
        return { quantity: 1, name: entry };
    }

    getDeckCards(deck) {
        if (!deck) return {};

        const cards = {};
        const addCards = (cardList) => {
            if (!cardList) return;
            cardList.forEach(cardEntry => {
                const parsed = this.parseCardEntry(cardEntry);
                if (!cards[parsed.name]) {
                    cards[parsed.name] = 0;
                }
                cards[parsed.name] += parsed.quantity;
            });
        };

        addCards(deck.mainDeck);
        addCards(deck.extraDeck);

        // Check for custom cards
        const customCards = localStorage.getItem(`customCards_${deck.id}`);
        if (customCards) {
            const customCardsObj = JSON.parse(customCards);
            addCards(customCardsObj.main || []);
            addCards(customCardsObj.extra || []);
        }

        return cards;
    }

    performComparison() {
        if (!this.deck1 || !this.deck2) {
            if (this.deck1 || this.deck2) {
                this.showPartialState();
            } else {
                this.showEmptyState();
            }
            return;
        }

        const deck1Cards = this.getDeckCards(this.deck1);
        const deck2Cards = this.getDeckCards(this.deck2);

        const overlapping = [];
        const unique1 = [];
        const unique2 = [];

        // Find overlapping cards
        Object.keys(deck1Cards).forEach(cardName => {
            if (deck2Cards[cardName]) {
                overlapping.push({
                    name: cardName,
                    deck1Qty: deck1Cards[cardName],
                    deck2Qty: deck2Cards[cardName]
                });
            } else {
                unique1.push({
                    name: cardName,
                    quantity: deck1Cards[cardName]
                });
            }
        });

        // Find cards unique to deck 2
        Object.keys(deck2Cards).forEach(cardName => {
            if (!deck1Cards[cardName]) {
                unique2.push({
                    name: cardName,
                    quantity: deck2Cards[cardName]
                });
            }
        });

        this.renderComparison(overlapping, unique1, unique2);
    }

    renderComparison(overlapping, unique1, unique2) {
        const resultsContainer = document.getElementById('comparisonResults');

        const tierColors = {
            'S': 'var(--tier-s)',
            'A': 'var(--tier-a)',
            'B': 'var(--tier-b)',
            'C': 'var(--tier-c)',
            'D': 'var(--tier-d)'
        };

        resultsContainer.innerHTML = `
            <div class="comparison-stats">
                <div class="comparison-stat-card">
                    <div class="stat-icon">🤝</div>
                    <div class="stat-number">${overlapping.length}</div>
                    <div class="stat-label">Shared Cards</div>
                </div>
                <div class="comparison-stat-card">
                    <div class="stat-icon">📘</div>
                    <div class="stat-number">${unique1.length}</div>
                    <div class="stat-label">Only in ${this.deck1.name}</div>
                </div>
                <div class="comparison-stat-card">
                    <div class="stat-icon">📕</div>
                    <div class="stat-number">${unique2.length}</div>
                    <div class="stat-label">Only in ${this.deck2.name}</div>
                </div>
            </div>

            <div class="comparison-sections">
                <!-- Overlapping Cards -->
                <div class="comparison-section">
                    <h2>🤝 Shared Cards (${overlapping.length})</h2>
                    ${overlapping.length > 0 ? `
                        <div class="comparison-card-list">
                            ${overlapping.sort((a, b) => a.name.localeCompare(b.name)).map(card => `
                                <div class="comparison-card">
                                    <div class="card-name">${card.name}</div>
                                    <div class="card-quantities">
                                        <span class="deck-qty" style="background: ${tierColors[this.deck1.tier]}">
                                            ${this.deck1.name}: ×${card.deck1Qty}
                                        </span>
                                        <span class="deck-qty" style="background: ${tierColors[this.deck2.tier]}">
                                            ${this.deck2.name}: ×${card.deck2Qty}
                                        </span>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p class="empty-section">No shared cards between these decks</p>'}
                </div>

                <!-- Unique to Deck 1 -->
                <div class="comparison-section">
                    <h2>
                        <span class="tier-badge" style="background: ${tierColors[this.deck1.tier]}">${this.deck1.tier}</span>
                        Only in ${this.deck1.name} (${unique1.length})
                    </h2>
                    ${unique1.length > 0 ? `
                        <div class="comparison-card-list">
                            ${unique1.sort((a, b) => a.name.localeCompare(b.name)).map(card => `
                                <div class="comparison-card unique">
                                    <div class="card-name">${card.name}</div>
                                    <div class="card-quantity">×${card.quantity}</div>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p class="empty-section">All cards are shared</p>'}
                </div>

                <!-- Unique to Deck 2 -->
                <div class="comparison-section">
                    <h2>
                        <span class="tier-badge" style="background: ${tierColors[this.deck2.tier]}">${this.deck2.tier}</span>
                        Only in ${this.deck2.name} (${unique2.length})
                    </h2>
                    ${unique2.length > 0 ? `
                        <div class="comparison-card-list">
                            ${unique2.sort((a, b) => a.name.localeCompare(b.name)).map(card => `
                                <div class="comparison-card unique">
                                    <div class="card-name">${card.name}</div>
                                    <div class="card-quantity">×${card.quantity}</div>
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p class="empty-section">All cards are shared</p>'}
                </div>
            </div>
        `;
    }

    showEmptyState() {
        const resultsContainer = document.getElementById('comparisonResults');
        resultsContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">⚖️</div>
                <h2>Select Two Decks to Compare</h2>
                <p>Choose decks from the dropdowns above to see their similarities and differences</p>
            </div>
        `;
    }

    showPartialState() {
        const resultsContainer = document.getElementById('comparisonResults');
        const selectedDeck = this.deck1 || this.deck2;
        resultsContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🎯</div>
                <h2>Select a Second Deck</h2>
                <p>You've selected <strong>${selectedDeck.name}</strong>. Choose another deck to compare.</p>
            </div>
        `;
    }
}

// Initialize when DOM is ready
let deckComparison;
document.addEventListener('DOMContentLoaded', () => {
    deckComparison = new DeckComparison();
});
