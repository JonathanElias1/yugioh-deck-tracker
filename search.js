// Global Card Search
class GlobalSearch {
    constructor() {
        this.decks = decks || [];
        this.searchResults = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        const searchInput = document.getElementById('globalSearch');
        const clearBtn = document.getElementById('clearSearch');

        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();

            if (query.length >= 2) {
                clearBtn.style.display = 'block';
                this.performSearch(query);
            } else {
                clearBtn.style.display = 'none';
                this.showEmptyState();
            }
        });

        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearBtn.style.display = 'none';
            this.showEmptyState();
            searchInput.focus();
        });
    }

    parseCardEntry(entry) {
        const match = entry.match(/^(\d+)\s+(.+)$/);
        if (match) {
            return { quantity: parseInt(match[1]), name: match[2] };
        }
        return { quantity: 1, name: entry };
    }

    performSearch(query) {
        const queryLower = query.toLowerCase();
        const results = [];

        this.decks.forEach(deck => {
            if (deck.status === 'consolidated') return;

            const deckResults = {
                deck: deck,
                matches: []
            };

            const searchInDeck = (cardList, deckType) => {
                if (!cardList) return;

                cardList.forEach(cardEntry => {
                    const parsed = this.parseCardEntry(cardEntry);
                    if (parsed.name.toLowerCase().includes(queryLower)) {
                        // Check ownership status
                        const ownedCards = localStorage.getItem(`ownedCards_${deck.id}`);
                        const ownedCardsObj = ownedCards ? JSON.parse(ownedCards) : {};
                        const ownedValue = ownedCardsObj[cardEntry];

                        let ownedQuantity = 0;
                        if (typeof ownedValue === 'number') {
                            ownedQuantity = ownedValue;
                        } else if (ownedValue === true) {
                            ownedQuantity = parsed.quantity;
                        }

                        deckResults.matches.push({
                            cardEntry: cardEntry,
                            cardName: parsed.name,
                            quantity: parsed.quantity,
                            owned: ownedQuantity,
                            deckType: deckType
                        });
                    }
                });
            };

            // Search main deck, extra deck, and custom cards
            searchInDeck(deck.mainDeck, 'Main Deck');
            searchInDeck(deck.extraDeck, 'Extra Deck');

            const customCards = localStorage.getItem(`customCards_${deck.id}`);
            if (customCards) {
                const customCardsObj = JSON.parse(customCards);
                searchInDeck(customCardsObj.main || [], 'Main Deck (Custom)');
                searchInDeck(customCardsObj.extra || [], 'Extra Deck (Custom)');
            }

            if (deckResults.matches.length > 0) {
                results.push(deckResults);
            }
        });

        this.displayResults(results, query);
    }

    displayResults(results, query) {
        const resultsContainer = document.getElementById('searchResults');

        if (results.length === 0) {
            resultsContainer.innerHTML = `
                <p style="color: rgba(255,255,255,0.6); text-align: center; padding: 60px 20px; font-size: 1.2rem;">
                    No cards found matching "<strong>${query}</strong>"
                </p>
            `;
            return;
        }

        const totalMatches = results.reduce((sum, r) => sum + r.matches.length, 0);

        resultsContainer.innerHTML = `
            <div class="search-summary">
                <h2>Found ${totalMatches} match${totalMatches !== 1 ? 'es' : ''} in ${results.length} deck${results.length !== 1 ? 's' : ''}</h2>
                <p style="color: rgba(255,255,255,0.7);">Searching for: <strong>${query}</strong></p>
            </div>

            <div class="search-results-list">
                ${results.map(result => this.renderDeckResult(result)).join('')}
            </div>
        `;
    }

    renderDeckResult(result) {
        const tierColors = {
            'S': 'var(--tier-s)',
            'A': 'var(--tier-a)',
            'B': 'var(--tier-b)',
            'C': 'var(--tier-c)',
            'D': 'var(--tier-d)'
        };

        const cardsHtml = result.matches.map(match => {
            const ownershipStatus = match.owned >= match.quantity ? 'owned' :
                                   match.owned > 0 ? 'partial' : 'needed';
            const statusEmoji = match.owned >= match.quantity ? '✅' :
                              match.owned > 0 ? '🟡' : '❌';

            return `
                <div class="search-card-match ${ownershipStatus}">
                    <div class="match-card-info">
                        <span class="match-status">${statusEmoji}</span>
                        <span class="match-card-name">${match.cardEntry}</span>
                        <span class="match-deck-type">${match.deckType}</span>
                    </div>
                    <div class="match-ownership">
                        <span class="ownership-text">${match.owned}/${match.quantity} owned</span>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="search-deck-result">
                <div class="search-deck-header">
                    <div class="search-deck-title">
                        <span class="tier-badge" style="background: ${tierColors[result.deck.tier]}">${result.deck.tier}</span>
                        <a href="deck.html?id=${result.deck.id}" class="search-deck-name">
                            <span style="opacity: 0.7; font-weight: normal;">Deck #${result.deck.id}</span> - ${result.deck.name}
                        </a>
                        <span class="match-count">${result.matches.length} match${result.matches.length !== 1 ? 'es' : ''}</span>
                    </div>
                </div>
                <div class="search-deck-cards">
                    ${cardsHtml}
                </div>
            </div>
        `;
    }

    showEmptyState() {
        document.getElementById('searchResults').innerHTML = `
            <p style="color: rgba(255,255,255,0.6); text-align: center; padding: 60px 20px; font-size: 1.2rem;">
                Enter a card name to search across all decks
            </p>
        `;
    }
}

// Initialize when DOM is ready
let globalSearch;
document.addEventListener('DOMContentLoaded', () => {
    globalSearch = new GlobalSearch();
});
