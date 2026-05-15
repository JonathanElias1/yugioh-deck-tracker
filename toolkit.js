// Toolkit Page Controller
class ToolkitPage {
    constructor() {
        this.toolkitPool = window.toolkitPool || { tooPowerful: [], standard: [] };
        this.init();
    }

    init() {
        this.categorizeStandardCards();
        this.renderTooPowerfulCards();
        this.renderStandardCards();
        this.updateStats();
    }

    categorizeStandardCards() {
        // Categorize standard toolkit cards based on their names
        this.categories = {
            removal: [
                'Mystical Space Typhoon', 'Dust Tornado', 'Stamping Destruction',
                'De-Spell', 'Fissure', 'Compulsory Evacuation Device',
                'Nobleman of Crossout', 'Sakuretsu Armor', 'Trap Hole',
                'Bottomless Trap Hole'
            ],
            control: [
                'Soul Exchange', 'Creature Swap', 'Enemy Controller', 'Scapegoat'
            ],
            revival: [
                'Call of the Haunted', 'Soul Charge'
            ],
            draw: [
                'Reload', 'Jar of Greed', 'Reckless Greed', 'Magical Mallet'
            ],
            negation: [
                'Solemn Judgment', 'Seven Tools of the Bandit', 'Magic Jammer',
                'Magic Drain', 'Spell Shield Type-8', 'Divine Wrath',
                'Skill Drain', 'Mind Crush', 'Trap Dustshoot', 'Black Horn of Heaven'
            ],
            handTrap: [
                'Ash Blossom & Joyous Spring', 'Effect Veiler',
                'Infinite Impermanence', 'Ghost Belle & Haunted Mansion'
            ],
            stall: [
                'Magic Cylinder', 'Mirror Wall', 'Threatening Roar', 'Waboku'
            ],
            graveFill: [
                'Foolish Burial'
            ]
        };
    }

    renderTooPowerfulCards() {
        const grid = document.getElementById('tooPowerfulGrid');
        grid.innerHTML = this.toolkitPool.tooPowerful.map(card => {
            return `
                <div class="toolkit-card too-powerful">
                    <div class="toolkit-card-header">
                        <div class="toolkit-card-name">${card.name}</div>
                        <div class="toolkit-card-limit">Limit 1</div>
                    </div>
                    <div class="toolkit-card-footer">
                        <span class="toolkit-owned-badge">Owned: ${card.quantity}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderStandardCards() {
        // Render each category
        this.renderCategoryGrid('removal', 'removalGrid');
        this.renderCategoryGrid('control', 'controlGrid');
        this.renderCategoryGrid('revival', 'revivalGrid');
        this.renderCategoryGrid('draw', 'drawGrid');
        this.renderCategoryGrid('negation', 'negationGrid');
        this.renderCategoryGrid('handTrap', 'handTrapGrid');
        this.renderCategoryGrid('stall', 'stallGrid');
        this.renderCategoryGrid('graveFill', 'graveFillGrid');
    }

    renderCategoryGrid(categoryKey, gridId) {
        const grid = document.getElementById(gridId);
        if (!grid) return;

        const categoryCards = this.toolkitPool.standard.filter(card => {
            return this.categories[categoryKey].includes(card.name);
        });

        grid.innerHTML = categoryCards.map(card => {
            const needsToBuy = card.quantity === 0;
            const cardClass = needsToBuy ? 'toolkit-card need-to-buy' : 'toolkit-card';

            return `
                <div class="${cardClass}">
                    <div class="toolkit-card-header">
                        <div class="toolkit-card-name">${card.name}</div>
                    </div>
                    <div class="toolkit-card-footer">
                        <span class="toolkit-owned-badge ${needsToBuy ? 'need-buy' : ''}">
                            ${needsToBuy ? 'Need to Buy' : 'Owned: ' + card.quantity}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
    }

    updateStats() {
        document.getElementById('tooPowerfulCount').textContent = this.toolkitPool.tooPowerful.length;
        document.getElementById('standardCount').textContent = this.toolkitPool.standard.length;
        document.getElementById('totalCount').textContent =
            this.toolkitPool.tooPowerful.length + this.toolkitPool.standard.length;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new ToolkitPage();
});
