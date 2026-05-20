// Spell & Trap Organizer - Comprehensive Card Allocation System
class SpellTrapOrganizer {
    constructor() {
        this.toolkitPool = window.toolkitPool || { tooPowerful: [], standard: [] };
        this.decks = window.decks || [];
        this.inventory = {};
        this.allCards = {}; // { cardName: { isToolkit, toolkitCategory, deckAllocations: [{deckId, deckName, quantity}] } }
        this.currentFilter = 'all';
        this.searchTerm = '';

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
            },
            equip: {
                tooPowerful: [],
                standard: [
                    'United We Stand', 'Mage Power', 'Axe of Despair',
                    'Horn of the Unicorn', 'Big Bang Shot', 'Black Pendant',
                    'Fairy Meteor Crush', 'Megamorph', 'Malevolent Nuzzler',
                    'Sword of Deep-Seated', 'Smoke Grenade of the Thief'
                ]
            }
        };

        this.init();
    }

    async init() {
        // Load inventory from Supabase/localStorage
        await this.loadInventory();

        // Build master card allocation list
        this.buildCardAllocations();

        // Render everything
        this.renderQuickStats();
        this.renderMasterList();
        this.renderCategory('boardWipes', 'boardWipesGrid');
        this.renderCategory('drawSearch', 'drawSearchGrid');
        this.renderCategory('removal', 'removalGrid');
        this.renderCategory('control', 'controlGrid');
        this.renderCategory('revival', 'revivalGrid');
        this.renderCategory('negation', 'negationGrid');
        this.renderCategory('handTrap', 'handTrapGrid');
        this.renderCategory('stall', 'stallGrid');
        this.renderCategory('graveyard', 'graveyardGrid');
        this.renderCategory('equip', 'equipGrid');

        // Setup event listeners
        this.setupEventListeners();
    }

    async loadInventory() {
        // Try to load from localStorage first
        const inventoryData = localStorage.getItem('cardInventory');
        if (inventoryData) {
            this.inventory = JSON.parse(inventoryData);
        }

        // If authenticated, pull from Supabase
        if (typeof isAuthenticated === 'function' && isAuthenticated()) {
            try {
                const user = getCurrentUser();
                const { data, error } = await supabaseClient
                    .from('user_profiles')
                    .select('card_inventory')
                    .eq('id', user.id)
                    .single();

                if (!error && data && data.card_inventory) {
                    this.inventory = data.card_inventory;
                    localStorage.setItem('cardInventory', JSON.stringify(this.inventory));
                }
            } catch (error) {
                console.error('Error loading inventory:', error);
            }
        }

        console.log(`📦 Loaded inventory: ${Object.keys(this.inventory).length} cards`);
    }

    buildCardAllocations() {
        this.allCards = {};

        // FIRST: Add ALL spell/trap cards from inventory
        Object.keys(this.inventory).forEach(cardName => {
            const ownedQty = this.inventory[cardName]?.owned || this.inventory[cardName] || 0;

            // Skip if it's a monster
            if (this.isMonster(cardName)) {
                return;
            }

            this.allCards[cardName] = {
                isToolkit: false,
                toolkitCategory: null,
                isTooPowerful: false,
                deckAllocations: [],
                owned: ownedQty
            };
        });

        console.log(`📋 Found ${Object.keys(this.allCards).length} spell/trap cards in inventory`);

        // SECOND: Mark toolkit cards
        this.toolkitPool.tooPowerful.forEach(card => {
            if (!this.allCards[card.name]) {
                this.allCards[card.name] = {
                    isToolkit: true,
                    toolkitCategory: this.findToolkitCategory(card.name),
                    isTooPowerful: true,
                    deckAllocations: [],
                    owned: 0
                };
            } else {
                this.allCards[card.name].isToolkit = true;
                this.allCards[card.name].toolkitCategory = this.findToolkitCategory(card.name);
                this.allCards[card.name].isTooPowerful = true;
            }
        });

        this.toolkitPool.standard.forEach(card => {
            if (!this.allCards[card.name]) {
                this.allCards[card.name] = {
                    isToolkit: true,
                    toolkitCategory: this.findToolkitCategory(card.name),
                    isTooPowerful: false,
                    deckAllocations: [],
                    owned: 0
                };
            } else {
                this.allCards[card.name].isToolkit = true;
                this.allCards[card.name].toolkitCategory = this.findToolkitCategory(card.name);
                this.allCards[card.name].isTooPowerful = false;
            }
        });

        // THIRD: Scan decks for spell/trap usage
        this.decks.forEach(deck => {
            const spellTraps = this.extractSpellTraps(deck);

            spellTraps.forEach(({ cardName, quantity }) => {
                if (!this.allCards[cardName]) {
                    // Card is in deck but not in inventory
                    this.allCards[cardName] = {
                        isToolkit: false,
                        toolkitCategory: null,
                        isTooPowerful: false,
                        deckAllocations: [],
                        owned: 0
                    };
                }

                // Add deck allocation
                this.allCards[cardName].deckAllocations.push({
                    deckId: deck.id,
                    deckName: deck.name,
                    quantity: quantity,
                    tier: deck.tier
                });
            });
        });

        console.log(`📦 Total spell/trap cards: ${Object.keys(this.allCards).length}`);
    }

    isMonster(cardName) {
        // EXPANDED spell/trap keywords - if a card has ANY of these, it's definitely a spell/trap
        const spellTrapKeywords = [
            // Draw/Search
            'Pot of', 'Jar of', 'Greed', 'Charity', 'Reckless', 'Reload', 'Upstart',
            'Allure of', 'Trade-In', 'Cards of', 'Card of',
            // Removal
            'Hole', 'Storm', 'Typhoon', 'Vortex', 'Fissure', 'Smashing',
            'Raigeki', 'Dark Hole', 'Lightning', 'Mystical Space',
            // Negation/Counter
            'Solemn', 'Seven Tools', 'Jammer', 'Drain', 'Divine Wrath',
            'Skill Drain', 'Mind Crush', 'Horn of Heaven', 'Black Horn',
            // Traps
            'Trap', 'Mirror Force', 'Torrential', 'Compulsory', 'Bottomless',
            'Sakuretsu', 'Dimensional Prison', 'Threatening', 'Waboku',
            'Magic Cylinder', 'Mirror Wall', 'Call of the Haunted',
            // Revival/Recursion
            'Reborn', 'Burial', 'Soul Charge', 'Return from', 'Beckoning',
            'Premature', 'Call of',
            // Control/Steal
            'Snatch Steal', 'Change of Heart', 'Brain Control', 'Enemy Controller',
            'Creature Swap', 'Soul Exchange', 'Mind Control',
            // Equipment
            'Equip', 'Horn of', 'Axe of', 'Sword of', 'Mage Power', 'United We Stand',
            'Big Bang Shot', 'Black Pendant', 'Fairy Meteor', 'Megamorph',
            // Field/Continuous
            'Field Barrier', 'Continuous', 'Spell', 'Magic', 'Toon World',
            'Fusion Gate', 'Necrovalley', 'Citadel', 'Sanctuary',
            // Fusion/Ritual
            'Polymerization', 'Fusion', 'Ritual', 'Chaos Form', 'Power Bond',
            'Future Fusion', 'Miracle Fusion', 'Overload', 'Dragon\'s Mirror',
            // Special mechanics
            'Tribute', 'Control', 'Book of', 'Swords of', 'Shield', 'Ring of',
            'De-Spell', 'Nobleman', 'Scapegoat', 'Token', 'Cost Down',
            'Limiter Removal', 'Dimension', 'Banish', 'Macro Cosmos',
            'Soul Absorption', 'Different Dimension', 'Foolish Burial',
            'Card Destruction', 'Painful Choice', 'Graceful',
            // Specific patterns
            'Reinforcement of', 'Salvage', 'Terraforming', 'Polymerization',
            'Metamorphosis', 'Messenger of Peace', 'Gravity Bind', 'Level Limit',
            'Ceasefire', 'Secret Barrel', 'Nightmare Wheel', 'Wave-Motion',
            'Royal Decree', 'Imperial Order', 'Anti-', 'Prohibition',
            // Dark Magician support
            'Dark Magic', 'Eternal Soul', 'Navigation', 'Eye of Timaeus',
            'Illusion Magic', 'Thousand Knives', 'Bond Between',
            // Toon support
            'Toon Table', 'Magic Planter',
            // Spellcaster support
            'Spell Power', 'Pitch-Black Power Stone', 'Magical Blast',
            'Magical Dimension', 'Magical Citadel',
            // Life Points
             'Cylinder', 'Barrel', 'Gift Card', 'Upstart', 'One Day of Peace',
            // Misc
            'Backup', 'A Rival Appears', 'Emergency Provisions', 'Statue',
            'Gravity Bind', 'Pole Position', 'Stumbling', 'Stamping',
            'Dust Tornado', 'Twister', 'Bribe', 'Judgment', 'Warning', 'Strike'
        ];

        // Check if it has spell/trap keywords FIRST (most inclusive)
        const hasSpellTrapKeyword = spellTrapKeywords.some(kw => cardName.includes(kw));
        if (hasSpellTrapKeyword) {
            return false; // It's a spell/trap
        }

        // Specific monsters to exclude (ONLY add cards you're CERTAIN are monsters)
        const specificMonsters = [
            'Spirit Reaper', 'Morphing Jar', 'Hero Kid', 'Ryu Kokki',
            'Luster Dragon', 'Hydrogeddon', 'Night Assailant', 'Witch of the Black Forest',
            'Sangan', 'Mystic Tomato', 'Giant Germ', 'Peten', 'Kaiser Glider',
            'Breaker the Magical Warrior', 'Skilled Dark Magician', 'Skilled White Magician',
            'Apprentice Magician', 'Old Vindictive Magician', 'Magical Marionette',
            'Royal Magical Library', 'Endymion', 'Defender the Magical Knight'
        ];

        if (specificMonsters.some(monster => cardName.includes(monster))) {
            return true; // It's a monster
        }

        // Monster type patterns (ONLY as last resort)
        const monsterPatterns = [
            'Blue-Eyes', 'Red-Eyes', 'Black Luster Soldier', 'Chaos Sorcerer',
            'Kuriboh', 'Slifer', 'Obelisk', 'Ra', 'Exodia',
            'HERO', 'Harpie', 'Summoned Skull', 'Gaia the Fierce Knight',
            'Celtic Guardian', 'Magician Girl', 'Six Samurai',
            'Crystal Beast', 'Aromage', 'Sphinx',
            'Batteryman', 'Volcanic', 'Archfiend', 'Monarch'
        ];

        // Only return true if it matches specific monster patterns
        return monsterPatterns.some(pattern => cardName.includes(pattern));
    }

    extractSpellTraps(deck) {
        const spellTraps = [];

        const processCardList = (cardList) => {
            if (!cardList || !Array.isArray(cardList)) return;

            cardList.forEach(cardEntry => {
                const parsed = this.parseCardEntry(cardEntry);
                const cardName = parsed.name;

                // Use the same isMonster() function for consistency
                if (!this.isMonster(cardName)) {
                    spellTraps.push({
                        cardName: cardName,
                        quantity: parsed.quantity
                    });
                }
            });
        };

        processCardList(deck.mainDeck);

        return spellTraps;
    }

    parseCardEntry(cardEntry) {
        const match = cardEntry.match(/^(\d+)\s+(.+)$/);
        if (match) {
            return {
                quantity: parseInt(match[1]),
                name: match[2]
            };
        }
        return {
            quantity: 1,
            name: cardEntry
        };
    }

    findToolkitCategory(cardName) {
        for (const [categoryKey, category] of Object.entries(this.categories)) {
            if (category.tooPowerful.includes(cardName) || category.standard.includes(cardName)) {
                return this.getCategoryDisplayName(categoryKey);
            }
        }
        return 'Toolkit';
    }

    getCategoryDisplayName(categoryKey) {
        const names = {
            boardWipes: 'Board Wipes',
            drawSearch: 'Draw/Search',
            removal: 'Removal',
            control: 'Control/Steal',
            revival: 'Revival',
            negation: 'Negation',
            handTrap: 'Hand Traps',
            stall: 'Stall/Defense',
            graveyard: 'Graveyard',
            equip: 'Equip Cards'
        };
        return names[categoryKey] || 'Other';
    }

    renderQuickStats() {
        const statsDiv = document.getElementById('quickStats');

        const totalCards = Object.keys(this.allCards).length;
        const toolkitCards = Object.values(this.allCards).filter(c => c.isToolkit).length;
        const deckSpecificCards = totalCards - toolkitCards;
        const cardsOwned = Object.values(this.allCards).filter(c => c.owned > 0).length;
        const needToBuy = totalCards - cardsOwned;

        statsDiv.innerHTML = `
            <div class="stat-item">
                <div class="stat-value">${totalCards}</div>
                <div class="stat-label">Total Spell/Trap Cards</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${toolkitCards}</div>
                <div class="stat-label">Toolkit Cards</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${deckSpecificCards}</div>
                <div class="stat-label">Deck-Specific Cards</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${cardsOwned}</div>
                <div class="stat-label">Cards Owned</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${needToBuy}</div>
                <div class="stat-label">Need to Buy</div>
            </div>
        `;
    }

    renderMasterList() {
        const container = document.getElementById('masterCardList');
        const filteredCards = this.getFilteredCards();

        if (filteredCards.length === 0) {
            container.innerHTML = '<p style="color: rgba(255,255,255,0.6); padding: 20px; text-align: center;">No cards match your search/filter.</p>';
            return;
        }

        container.innerHTML = filteredCards.map(([cardName, cardData]) => {
            const needsToBuy = cardData.owned === 0;
            const totalNeeded = cardData.deckAllocations.reduce((sum, alloc) => sum + alloc.quantity, 0);

            return `
                <div class="card-allocation">
                    <div class="card-image-container" id="img-${this.sanitizeId(cardName)}">
                        <div class="card-image-placeholder">Loading...</div>
                    </div>
                    <div class="card-info-container">
                        <div class="card-name-header" onclick="cardLightbox.open('${cardName.replace(/'/g, "\\'")}', '${cardName.replace(/'/g, "\\'")}')">${cardName}</div>
                        <div class="allocation-info">
                            ${cardData.isToolkit ?
                                `<span class="toolkit-badge">🛠️ Toolkit: ${cardData.toolkitCategory}</span>` :
                                '<span class="toolkit-badge" style="background: rgba(255,107,107,0.3); border-color: rgba(255,107,107,0.6); color: #FF6B6B;">📦 Deck-Specific</span>'
                            }
                            ${needsToBuy ?
                                '<span class="toolkit-badge" style="background: rgba(234,67,53,0.3); border-color: rgba(234,67,53,0.6); color: #EA4335;">⚠️ Need to Buy</span>' :
                                `<span class="toolkit-badge" style="background: rgba(76,175,80,0.3); border-color: rgba(76,175,80,0.6); color: #4CAF50;">✓ Owned: ${cardData.owned}</span>`
                            }

                            ${cardData.deckAllocations.length > 0 ? `
                                <div style="margin-top: 10px;">
                                    <strong style="color: #4ECDC4;">📋 Used in ${cardData.deckAllocations.length} deck(s):</strong>
                                    ${cardData.deckAllocations.map(alloc => `
                                        <div class="deck-allocation">
                                            <span class="deck-name">Deck #${alloc.deckId}: ${alloc.deckName} (${alloc.tier} Tier)</span>
                                            <span class="deck-quantity">${alloc.quantity}x needed</span>
                                        </div>
                                    `).join('')}
                                    <div style="margin-top: 8px; color: #4ECDC4; font-weight: bold;">
                                        📊 Total Needed: ${totalNeeded}x | Owned: ${cardData.owned}x | Still Need: ${Math.max(0, totalNeeded - cardData.owned)}x
                                    </div>
                                </div>
                            ` : cardData.isToolkit ? `
                                <div style="margin-top: 10px; color: rgba(255,255,255,0.7);">
                                    <strong>Generic Toolkit Card</strong> - Pick before each match
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Load images after rendering
        filteredCards.forEach(([cardName, cardData]) => {
            this.loadCardImage(cardName);
        });
    }

    sanitizeId(cardName) {
        return cardName.replace(/[^a-zA-Z0-9]/g, '-');
    }

    async loadCardImage(cardName) {
        const container = document.getElementById(`img-${this.sanitizeId(cardName)}`);
        if (!container) return;

        try {
            let response = await fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${encodeURIComponent(cardName)}`);

            if (response.status === 400) {
                const cleanedName = cardName.replace(/[^\w\s'-]/g, '').replace(/\s+/g, ' ').trim();
                response = await fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${encodeURIComponent(cleanedName)}`);
            }

            if (!response.ok) {
                container.innerHTML = '<div class="card-image-placeholder">No image</div>';
                return;
            }

            const data = await response.json();

            if (data.data && data.data[0] && data.data[0].card_images) {
                const imageUrl = data.data[0].card_images[0].image_url_small || data.data[0].card_images[0].image_url;
                container.innerHTML = `<img src="${imageUrl}" alt="${cardName}">`;
            } else {
                container.innerHTML = '<div class="card-image-placeholder">No image</div>';
            }
        } catch (error) {
            container.innerHTML = '<div class="card-image-placeholder">No image</div>';
        }
    }

    getFilteredCards() {
        let cards = Object.entries(this.allCards);

        // Apply filter
        if (this.currentFilter === 'toolkit') {
            cards = cards.filter(([name, data]) => data.isToolkit);
        } else if (this.currentFilter === 'deck-specific') {
            cards = cards.filter(([name, data]) => !data.isToolkit);
        } else if (this.currentFilter === 'need-buy') {
            cards = cards.filter(([name, data]) => data.owned === 0);
        } else if (this.currentFilter === 'owned') {
            cards = cards.filter(([name, data]) => data.owned > 0);
        }

        // Apply search
        if (this.searchTerm) {
            cards = cards.filter(([name, data]) =>
                name.toLowerCase().includes(this.searchTerm)
            );
        }

        // Sort alphabetically
        cards.sort((a, b) => a[0].localeCompare(b[0]));

        return cards;
    }

    renderCategory(categoryKey, gridId) {
        const grid = document.getElementById(gridId);
        if (!grid) return;

        const category = this.categories[categoryKey];
        const cards = [];

        // Add tooPowerful cards
        category.tooPowerful.forEach(cardName => {
            const card = this.toolkitPool.tooPowerful.find(c => c.name === cardName);
            if (card && this.allCards[cardName]) {
                cards.push({
                    ...card,
                    ...this.allCards[cardName],
                    isTooPowerful: true
                });
            }
        });

        // Add standard cards
        category.standard.forEach(cardName => {
            const card = this.toolkitPool.standard.find(c => c.name === cardName);
            if (card && this.allCards[cardName]) {
                cards.push({
                    ...card,
                    ...this.allCards[cardName],
                    isTooPowerful: false
                });
            }
        });

        grid.innerHTML = cards.map(card => {
            const needsToBuy = card.owned === 0;
            const cardClass = card.isTooPowerful ? 'spell-trap-card too-powerful' : 'spell-trap-card';

            return `
                <div class="${cardClass}">
                    <div class="spell-trap-card-header">
                        <div class="spell-trap-card-name">${card.name}</div>
                        ${card.isTooPowerful ? '<div class="power-badge">Limit 1</div>' : ''}
                    </div>
                    <div class="spell-trap-card-footer">
                        <span class="spell-trap-owned-badge ${needsToBuy ? 'need-buy' : ''}">
                            ${needsToBuy ? '⚠️ Need to Buy' : '✓ Owned: ' + card.owned}
                        </span>
                    </div>
                    ${card.deckAllocations.length > 0 ? `
                        <div style="margin-top: 8px; font-size: 0.75rem; color: rgba(255,255,255,0.7);">
                            Used in ${card.deckAllocations.length} deck(s)
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase().trim();
            this.renderMasterList();
        });

        // Filter tabs
        const filterTabs = document.querySelectorAll('.filter-tab');
        filterTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                filterTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentFilter = tab.getAttribute('data-filter');
                this.renderMasterList();
                this.renderQuickStats();
            });
        });
    }
}

// Toggle collapsible sections
function toggleSection(sectionId) {
    const content = document.getElementById(sectionId + 'Content');
    const icon = document.getElementById(sectionId + 'Icon');

    if (content.classList.contains('collapsed')) {
        content.classList.remove('collapsed');
        icon.textContent = '▼';
    } else {
        content.classList.add('collapsed');
        icon.textContent = '▶';
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize auth if available
    if (typeof initAuth === 'function') {
        await initAuth();
    }

    new SpellTrapOrganizer();
});
