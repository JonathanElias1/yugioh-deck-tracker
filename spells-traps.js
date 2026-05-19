// Spell & Trap Organizer
class SpellTrapOrganizer {
    constructor() {
        this.toolkitPool = window.toolkitPool || { tooPowerful: [], standard: [] };
        this.categories = {
            boardWipes: {
                tooPowerful: [
                    'Dark Hole', 'Raigeki', 'Lightning Vortex', 'Lightning Storm',
                    'Heavy Storm', 'Mirror Force', 'Torrential Tribute', 'Giant Trunade'
                ],
                standard: []
            },
            drawSearch: {
                tooPowerful: [
                    'Pot of Greed', 'Graceful Charity', 'Card Destruction', 'Painful Choice'
                ],
                standard: [
                    'Reload', 'Jar of Greed', 'Reckless Greed', 'Magical Mallet'
                ]
            },
            removal: {
                tooPowerful: [],
                standard: [
                    'Mystical Space Typhoon', 'Dust Tornado', 'Stamping Destruction',
                    'De-Spell', 'Fissure', 'Compulsory Evacuation Device',
                    'Nobleman of Crossout', 'Sakuretsu Armor', 'Trap Hole',
                    'Bottomless Trap Hole'
                ]
            },
            control: {
                tooPowerful: [
                    'Snatch Steal', 'Change of Heart', 'Brain Control'
                ],
                standard: [
                    'Soul Exchange', 'Creature Swap', 'Enemy Controller', 'Scapegoat'
                ]
            },
            revival: {
                tooPowerful: [
                    'Monster Reborn', 'Premature Burial'
                ],
                standard: [
                    'Call of the Haunted', 'Soul Charge'
                ]
            },
            negation: {
                tooPowerful: [],
                standard: [
                    'Solemn Judgment', 'Seven Tools of the Bandit', 'Magic Jammer',
                    'Magic Drain', 'Spell Shield Type-8', 'Divine Wrath',
                    'Skill Drain', 'Mind Crush', 'Trap Dustshoot', 'Black Horn of Heaven'
                ]
            },
            handTrap: {
                tooPowerful: [],
                standard: [
                    'Ash Blossom & Joyous Spring', 'Effect Veiler',
                    'Infinite Impermanence', 'Ghost Belle & Haunted Mansion'
                ]
            },
            stall: {
                tooPowerful: [],
                standard: [
                    'Magic Cylinder', 'Mirror Wall', 'Threatening Roar', 'Waboku'
                ]
            },
            graveyard: {
                tooPowerful: [],
                standard: [
                    'Foolish Burial'
                ]
            }
        };
        this.init();
    }

    init() {
        this.renderCategory('boardWipes', 'boardWipesGrid');
        this.renderCategory('drawSearch', 'drawSearchGrid');
        this.renderCategory('removal', 'removalGrid');
        this.renderCategory('control', 'controlGrid');
        this.renderCategory('revival', 'revivalGrid');
        this.renderCategory('negation', 'negationGrid');
        this.renderCategory('handTrap', 'handTrapGrid');
        this.renderCategory('stall', 'stallGrid');
        this.renderCategory('graveyard', 'graveyardGrid');
    }

    renderCategory(categoryKey, gridId) {
        const grid = document.getElementById(gridId);
        if (!grid) return;

        const category = this.categories[categoryKey];
        const cards = [];

        // Add tooPowerful cards
        category.tooPowerful.forEach(cardName => {
            const card = this.toolkitPool.tooPowerful.find(c => c.name === cardName);
            if (card) {
                cards.push({
                    ...card,
                    isTooPowerful: true
                });
            }
        });

        // Add standard cards
        category.standard.forEach(cardName => {
            const card = this.toolkitPool.standard.find(c => c.name === cardName);
            if (card) {
                cards.push({
                    ...card,
                    isTooPowerful: false
                });
            }
        });

        grid.innerHTML = cards.map(card => {
            const needsToBuy = card.quantity === 0;
            const cardClass = card.isTooPowerful ? 'spell-trap-card too-powerful' : 'spell-trap-card';

            return `
                <div class="${cardClass}">
                    <div class="spell-trap-card-header">
                        <div class="spell-trap-card-name">${card.name}</div>
                        ${card.isTooPowerful ? '<div class="power-badge">Limit 1</div>' : ''}
                    </div>
                    <div class="spell-trap-card-footer">
                        <span class="spell-trap-owned-badge ${needsToBuy ? 'need-buy' : ''}">
                            ${needsToBuy ? '⚠️ Need to Buy' : '✓ Owned: ' + card.quantity}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new SpellTrapOrganizer();
});
