// Collection Statistics Dashboard
class CollectionStats {
    constructor() {
        this.decks = decks || [];
        this.init();
    }

    init() {
        this.calculateStats();
        this.renderSummaryStats();
        this.renderCharts();
        this.renderLeaderboards();
        this.renderMostNeededCards();
    }

    parseCardEntry(entry) {
        const match = entry.match(/^(\d+)\s+(.+)$/);
        if (match) {
            return { quantity: parseInt(match[1]), name: match[2] };
        }
        return { quantity: 1, name: entry };
    }

    getDeckCompletion(deck) {
        const ownedCards = localStorage.getItem(`ownedCards_${deck.id}`);
        if (!ownedCards) return 0;

        const ownedCardsObj = JSON.parse(ownedCards);
        const removedCards = localStorage.getItem(`removedCards_${deck.id}`);
        const removedCardsArr = removedCards ? JSON.parse(removedCards) : [];

        let allCards = [...(deck.mainDeck || []), ...(deck.extraDeck || [])];

        // Filter out removed cards
        allCards = allCards.filter(card => !removedCardsArr.includes(card));

        // Add custom cards
        const customCards = localStorage.getItem(`customCards_${deck.id}`);
        if (customCards) {
            const customCardsObj = JSON.parse(customCards);
            allCards.push(...(customCardsObj.main || []));
            allCards.push(...(customCardsObj.extra || []));
        }

        let totalNeeded = 0;
        let totalOwned = 0;

        allCards.forEach(cardEntry => {
            const parsed = this.parseCardEntry(cardEntry);
            totalNeeded += parsed.quantity;

            const ownedValue = ownedCardsObj[cardEntry];
            if (typeof ownedValue === 'number') {
                totalOwned += ownedValue;
            } else if (ownedValue === true) {
                totalOwned += parsed.quantity;
            }
        });

        return totalNeeded > 0 ? Math.round((totalOwned / totalNeeded) * 100) : 0;
    }

    calculateStats() {
        const activeDecks = this.decks.filter(d => d.status === 'active');

        this.stats = {
            totalDecks: activeDecks.length,
            completedDecks: 0,
            avgCompletion: 0,
            uniqueCards: new Set(),
            totalCardsNeeded: 0,
            topTierCount: 0,
            deckCompletions: [],
            tierDistribution: { S: 0, A: 0, B: 0, C: 0, D: 0 },
            tierCompletions: { S: [], A: [], B: [], C: [], D: [] }
        };

        let totalCompletion = 0;

        activeDecks.forEach(deck => {
            const completion = this.getDeckCompletion(deck);

            this.stats.deckCompletions.push({
                name: deck.name,
                tier: deck.tier,
                completion: completion
            });

            if (completion === 100) {
                this.stats.completedDecks++;
            }

            totalCompletion += completion;

            // Tier distribution
            if (this.stats.tierDistribution[deck.tier] !== undefined) {
                this.stats.tierDistribution[deck.tier]++;
                this.stats.tierCompletions[deck.tier].push(completion);
            }

            // Top tier count
            if (deck.tier === 'S' || deck.tier === 'A') {
                this.stats.topTierCount++;
            }

            // Count unique cards
            [...(deck.mainDeck || []), ...(deck.extraDeck || [])].forEach(cardEntry => {
                const parsed = this.parseCardEntry(cardEntry);
                this.stats.uniqueCards.add(parsed.name);
            });

            // Count needed cards
            const ownedCards = localStorage.getItem(`ownedCards_${deck.id}`);
            const ownedCardsObj = ownedCards ? JSON.parse(ownedCards) : {};

            [...(deck.mainDeck || []), ...(deck.extraDeck || [])].forEach(cardEntry => {
                const parsed = this.parseCardEntry(cardEntry);
                const ownedValue = ownedCardsObj[cardEntry];
                let ownedQuantity = 0;

                if (typeof ownedValue === 'number') {
                    ownedQuantity = ownedValue;
                } else if (ownedValue === true) {
                    ownedQuantity = parsed.quantity;
                }

                const needed = parsed.quantity - ownedQuantity;
                if (needed > 0) {
                    this.stats.totalCardsNeeded += needed;
                }
            });
        });

        this.stats.avgCompletion = activeDecks.length > 0
            ? Math.round(totalCompletion / activeDecks.length)
            : 0;

        // Sort deck completions
        this.stats.deckCompletions.sort((a, b) => b.completion - a.completion);
    }

    renderSummaryStats() {
        document.getElementById('totalDecksCount').textContent = this.stats.totalDecks;
        document.getElementById('completedDecksCount').textContent = this.stats.completedDecks;
        document.getElementById('avgCompletion').textContent = this.stats.avgCompletion + '%';
        document.getElementById('uniqueCardsCount').textContent = this.stats.uniqueCards.size;
        document.getElementById('totalCardsNeeded').textContent = this.stats.totalCardsNeeded;
        document.getElementById('topTierCount').textContent = this.stats.topTierCount;
    }

    renderCharts() {
        this.renderCompletionChart();
        this.renderTierChart();
        this.renderTierCompletionChart();
        this.renderProgressChart();
    }

    renderCompletionChart() {
        const ctx = document.getElementById('completionChart');

        const completed = this.stats.completedDecks;
        const inProgress = this.stats.totalDecks - completed;

        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Completed', 'In Progress'],
                datasets: [{
                    data: [completed, inProgress],
                    backgroundColor: [
                        'rgba(75, 192, 192, 0.8)',
                        'rgba(255, 159, 64, 0.8)'
                    ],
                    borderColor: 'rgba(255, 255, 255, 0.8)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        labels: { color: 'white', font: { size: 14 } }
                    }
                }
            }
        });
    }

    renderTierChart() {
        const ctx = document.getElementById('tierChart');

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['S Tier', 'A Tier', 'B Tier', 'C Tier', 'D Tier'],
                datasets: [{
                    label: 'Number of Decks',
                    data: [
                        this.stats.tierDistribution.S,
                        this.stats.tierDistribution.A,
                        this.stats.tierDistribution.B,
                        this.stats.tierDistribution.C,
                        this.stats.tierDistribution.D
                    ],
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(255, 206, 86, 0.8)',
                        'rgba(75, 192, 192, 0.8)',
                        'rgba(153, 102, 255, 0.8)'
                    ],
                    borderColor: 'rgba(255, 255, 255, 0.8)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: 'white', stepSize: 1 },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    x: {
                        ticks: { color: 'white' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: 'white', font: { size: 14 } }
                    }
                }
            }
        });
    }

    renderTierCompletionChart() {
        const ctx = document.getElementById('tierCompletionChart');

        const avgByTier = {
            S: this.stats.tierCompletions.S.length > 0
                ? Math.round(this.stats.tierCompletions.S.reduce((a, b) => a + b, 0) / this.stats.tierCompletions.S.length)
                : 0,
            A: this.stats.tierCompletions.A.length > 0
                ? Math.round(this.stats.tierCompletions.A.reduce((a, b) => a + b, 0) / this.stats.tierCompletions.A.length)
                : 0,
            B: this.stats.tierCompletions.B.length > 0
                ? Math.round(this.stats.tierCompletions.B.reduce((a, b) => a + b, 0) / this.stats.tierCompletions.B.length)
                : 0,
            C: this.stats.tierCompletions.C.length > 0
                ? Math.round(this.stats.tierCompletions.C.reduce((a, b) => a + b, 0) / this.stats.tierCompletions.C.length)
                : 0,
            D: this.stats.tierCompletions.D.length > 0
                ? Math.round(this.stats.tierCompletions.D.reduce((a, b) => a + b, 0) / this.stats.tierCompletions.D.length)
                : 0
        };

        new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['S Tier', 'A Tier', 'B Tier', 'C Tier', 'D Tier'],
                datasets: [{
                    label: 'Avg Completion %',
                    data: [avgByTier.S, avgByTier.A, avgByTier.B, avgByTier.C, avgByTier.D],
                    backgroundColor: 'rgba(102, 126, 234, 0.3)',
                    borderColor: 'rgba(102, 126, 234, 1)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(102, 126, 234, 1)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgba(102, 126, 234, 1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { color: 'white', backdropColor: 'transparent' },
                        grid: { color: 'rgba(255, 255, 255, 0.2)' },
                        angleLines: { color: 'rgba(255, 255, 255, 0.2)' },
                        pointLabels: { color: 'white', font: { size: 12 } }
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: 'white', font: { size: 14 } }
                    }
                }
            }
        });
    }

    renderProgressChart() {
        const ctx = document.getElementById('progressChart');

        // Group decks by completion ranges
        const ranges = {
            '0-25%': 0,
            '26-50%': 0,
            '51-75%': 0,
            '76-99%': 0,
            '100%': 0
        };

        this.stats.deckCompletions.forEach(deck => {
            if (deck.completion === 0 || deck.completion <= 25) ranges['0-25%']++;
            else if (deck.completion <= 50) ranges['26-50%']++;
            else if (deck.completion <= 75) ranges['51-75%']++;
            else if (deck.completion < 100) ranges['76-99%']++;
            else ranges['100%']++;
        });

        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['0-25%', '26-50%', '51-75%', '76-99%', '100%'],
                datasets: [{
                    label: 'Number of Decks',
                    data: Object.values(ranges),
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(255, 159, 64, 0.8)',
                        'rgba(255, 206, 86, 0.8)',
                        'rgba(153, 102, 255, 0.8)',
                        'rgba(75, 192, 192, 0.8)'
                    ],
                    borderColor: 'rgba(255, 255, 255, 0.8)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { color: 'white', stepSize: 1 },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    },
                    x: {
                        ticks: { color: 'white' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' }
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: 'white', font: { size: 14 } }
                    }
                }
            }
        });
    }

    renderLeaderboards() {
        const tierColors = {
            'S': 'var(--tier-s)',
            'A': 'var(--tier-a)',
            'B': 'var(--tier-b)',
            'C': 'var(--tier-c)',
            'D': 'var(--tier-d)'
        };

        // Top 10 most complete
        const topDecks = this.stats.deckCompletions.slice(0, 10);
        document.getElementById('topDecks').innerHTML = topDecks.map((deck, index) => {
            const deckObj = this.decks.find(d => d.name === deck.name);
            return `
                <a href="deck.html?id=${deckObj.id}" class="leaderboard-item">
                    <div class="leaderboard-rank">#${index + 1}</div>
                    <div class="leaderboard-info">
                        <span class="tier-badge-small" style="background: ${tierColors[deck.tier]}">${deck.tier}</span>
                        <span class="leaderboard-name">${deck.name}</span>
                    </div>
                    <div class="leaderboard-value">${deck.completion}%</div>
                </a>
            `;
        }).join('');

        // Bottom 10 least complete
        const bottomDecks = this.stats.deckCompletions.slice().reverse().slice(0, 10);
        document.getElementById('bottomDecks').innerHTML = bottomDecks.map((deck, index) => {
            const deckObj = this.decks.find(d => d.name === deck.name);
            return `
                <a href="deck.html?id=${deckObj.id}" class="leaderboard-item">
                    <div class="leaderboard-rank">#${this.stats.deckCompletions.length - index}</div>
                    <div class="leaderboard-info">
                        <span class="tier-badge-small" style="background: ${tierColors[deck.tier]}">${deck.tier}</span>
                        <span class="leaderboard-name">${deck.name}</span>
                    </div>
                    <div class="leaderboard-value">${deck.completion}%</div>
                </a>
            `;
        }).join('');
    }

    renderMostNeededCards() {
        const cardNeeds = {};

        this.decks.filter(d => d.status === 'active').forEach(deck => {
            const ownedCards = localStorage.getItem(`ownedCards_${deck.id}`);
            const ownedCardsObj = ownedCards ? JSON.parse(ownedCards) : {};

            [...(deck.mainDeck || []), ...(deck.extraDeck || [])].forEach(cardEntry => {
                const parsed = this.parseCardEntry(cardEntry);
                const ownedValue = ownedCardsObj[cardEntry];
                let ownedQuantity = 0;

                if (typeof ownedValue === 'number') {
                    ownedQuantity = ownedValue;
                } else if (ownedValue === true) {
                    ownedQuantity = parsed.quantity;
                }

                const needed = parsed.quantity - ownedQuantity;
                if (needed > 0) {
                    if (!cardNeeds[parsed.name]) {
                        cardNeeds[parsed.name] = { needed: 0, decks: 0 };
                    }
                    cardNeeds[parsed.name].needed += needed;
                    cardNeeds[parsed.name].decks++;
                }
            });
        });

        // Sort by number of decks, then by quantity needed
        const sortedCards = Object.keys(cardNeeds)
            .map(name => ({ name, ...cardNeeds[name] }))
            .sort((a, b) => b.decks - a.decks || b.needed - a.needed)
            .slice(0, 15);

        document.getElementById('mostNeededCards').innerHTML = sortedCards.map(card => `
            <div class="needed-card-item">
                <div class="needed-card-name">${card.name}</div>
                <div class="needed-card-stats">
                    <span class="needed-badge">Need: ×${card.needed}</span>
                    <span class="needed-decks">${card.decks} deck${card.decks !== 1 ? 's' : ''}</span>
                </div>
            </div>
        `).join('');
    }
}

// Initialize when DOM is ready
let collectionStats;
document.addEventListener('DOMContentLoaded', () => {
    collectionStats = new CollectionStats();
});
