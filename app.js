// Main app JavaScript for index page
class DeckTracker {
    constructor() {
        this.decks = decks || [];
        this.currentFilter = 'all';
        this.completedDecks = this.loadCompletedDecks();
        this.init();
    }

    init() {
        this.renderDecks();
        this.updateStats();
        this.setupEventListeners();
    }

    loadCompletedDecks() {
        const saved = localStorage.getItem('completedDecks');
        return saved ? JSON.parse(saved) : {};
    }

    saveCompletedDecks() {
        localStorage.setItem('completedDecks', JSON.stringify(this.completedDecks));
    }

    toggleDeckCompletion(deckId) {
        this.completedDecks[deckId] = !this.completedDecks[deckId];
        this.saveCompletedDecks();
        this.renderDecks();
        this.updateStats();
    }

    setupEventListeners() {
        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.filter;
                this.renderDecks();
            });
        });
    }

    getDeckCompletionPercentage(deckId) {
        const ownedCards = localStorage.getItem(`ownedCards_${deckId}`);
        if (!ownedCards) return 0;

        const deck = this.decks.find(d => d.id === deckId);
        if (!deck) return 0;

        const ownedCardsObj = JSON.parse(ownedCards);
        const allCards = [...(deck.mainDeck || []), ...(deck.extraDeck || [])];

        if (allCards.length === 0) return 0;

        let totalNeeded = 0;
        let totalOwned = 0;

        allCards.forEach(cardEntry => {
            const match = cardEntry.match(/^(\d+)\s+(.+)$/) || [null, 1, cardEntry];
            const quantity = parseInt(match[1]);
            totalNeeded += quantity;

            const ownedValue = ownedCardsObj[cardEntry];
            if (typeof ownedValue === 'number') {
                totalOwned += ownedValue;
            } else if (ownedValue === true) {
                totalOwned += quantity; // Old format: true means all owned
            }
        });

        return totalNeeded > 0 ? Math.round((totalOwned / totalNeeded) * 100) : 0;
    }

    filterDecks() {
        if (this.currentFilter === 'all') {
            return this.decks;
        } else if (this.currentFilter === 'active') {
            return this.decks.filter(d => d.status === 'active');
        } else if (this.currentFilter === 'consolidated') {
            return this.decks.filter(d => d.status === 'consolidated');
        } else {
            // Tier filter
            return this.decks.filter(d => d.tier === this.currentFilter);
        }
    }

    renderDecks() {
        const grid = document.getElementById('deckGrid');
        const filteredDecks = this.filterDecks();

        if (filteredDecks.length === 0) {
            grid.innerHTML = '<p style="color: white; text-align: center; grid-column: 1/-1;">No decks match this filter.</p>';
            return;
        }

        grid.innerHTML = filteredDecks.map(deck => {
            const isCompleted = this.completedDecks[deck.id] || false;
            const consolidatedClass = deck.status === 'consolidated' ? 'consolidated' : '';
            const completedClass = isCompleted ? 'completed' : '';
            const tierClass = `tier-${deck.tier}`;

            let statusBadges = '';
            if (deck.altPaths) {
                statusBadges += '<span class="status-badge alt-paths">Alt Paths</span>';
            }
            if (deck.note) {
                statusBadges += '<span class="status-badge">📝 Note</span>';
            }

            let deckClickHandler = '';
            if (deck.status === 'consolidated') {
                deckClickHandler = `onclick="alert('This deck was consolidated into Deck #${deck.consolidatedInto}. ${deck.note}')"`;
            } else {
                deckClickHandler = `onclick="window.location.href='deck.html?id=${deck.id}'"`;
            }

            const completionPercentage = deck.status !== 'consolidated' ? this.getDeckCompletionPercentage(deck.id) : 0;

            return `
                <div class="deck-card ${tierClass} ${consolidatedClass} ${completedClass}" ${deckClickHandler}>
                    <div class="deck-number">Deck #${deck.id}</div>
                    <div class="deck-name">${deck.name}</div>
                    <div class="deck-tier tier-${deck.tier}">${deck.tier} Tier</div>
                    <div class="deck-strategy">${deck.strategy || 'Strategy details'}</div>
                    ${deck.status !== 'consolidated' ? `
                        <div class="completion-bar">
                            <div class="completion-fill" style="width: ${completionPercentage}%"></div>
                            <div class="completion-text">${completionPercentage}% Complete</div>
                        </div>
                    ` : ''}
                    ${statusBadges ? `<div class="deck-status">${statusBadges}</div>` : ''}
                    ${deck.status !== 'consolidated' ? `
                        <div class="checkbox-container" onclick="event.stopPropagation()">
                            <input type="checkbox"
                                   id="deck-${deck.id}"
                                   ${isCompleted ? 'checked' : ''}
                                   onchange="tracker.toggleDeckCompletion(${deck.id})">
                            <label for="deck-${deck.id}">Mark as completed</label>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    updateStats() {
        const activeDecks = this.decks.filter(d => d.status === 'active');
        const completed = activeDecks.filter(d => this.completedDecks[d.id]).length;
        const inProgress = activeDecks.length - completed;

        document.getElementById('totalDecks').textContent = activeDecks.length;
        document.getElementById('completedDecks').textContent = completed;
        document.getElementById('inProgressDecks').textContent = inProgress;
    }
}

// Initialize when DOM is ready
let tracker;
document.addEventListener('DOMContentLoaded', () => {
    tracker = new DeckTracker();
});
