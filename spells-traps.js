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
        // List of known monster patterns
        const monsterPatterns = [
            'Dragon', 'Warrior', 'Beast-Warrior', 'Beast', 'Fiend', 'Zombie',
            'Spellcaster', 'Machine', 'Aqua', 'Pyro', 'Rock', 'Winged Beast',
            'Plant', 'Insect', 'Thunder', 'Dinosaur', 'Reptile', 'Fish', 'Fairy',
            'Black Luster Soldier', 'Chaos Sorcerer', 'Blue-Eyes', 'Red-Eyes',
            'Dark Magician Girl', 'Kuriboh', 'Slifer', 'Obelisk', 'Ra', 'Exodia',
            'HERO', 'Cyber Dragon', 'Harpie', 'Summoned Skull', 'Gaia',
            'Celtic Guardian', 'Magician Girl', 'Six Samurai', 'Agent of',
            'Crystal Beast', 'Ancient Gear', 'Aromage', 'Sphinx', 'Frog',
            'Batteryman', 'Volcanic', 'Archfiend', 'Monarch'
        ];

        const specificMonsters = [
            'Spirit Reaper', 'Morphing Jar', 'Hero Kid', 'Ryu Kokki',
            'Luster Dragon', 'Hydrogeddon', 'Night Assailant', 'Witch of the Black Forest',
            'Sangan', 'Mystic Tomato', 'Giant Germ', 'Peten', 'Kaiser Glider'
        ];

        // Check specific monsters first
        if (specificMonsters.includes(cardName)) {
            return true;
        }

        // Check if it has spell/trap keywords (these override monster patterns)
        const spellTrapKeywords = [
            'Pot of', 'Jar of', 'Hole', 'Storm', 'Force', 'Tribute', 'Mirror',
            'Reborn', 'Burial', 'Steal', 'Control', 'Ritual', 'Fusion', 'Spell',
            'Magic', 'Trap', 'Horn of', 'Axe of', 'Sword of', 'Book of', 'Swords of'
        ];

        const hasSpellTrapKeyword = spellTrapKeywords.some(kw => cardName.includes(kw));
        if (hasSpellTrapKeyword) {
            return false; // It's a spell/trap
        }

        // Check monster patterns
        return monsterPatterns.some(pattern => cardName.includes(pattern));
    }

    extractSpellTraps(deck) {
        const spellTraps = [];

        // Comprehensive list of MONSTER-ONLY name patterns (cards to EXCLUDE)
        // These are specific monster names/patterns that should never be considered spells/traps
        const knownMonsters = [
            'Black Luster Soldier', 'Chaos Sorcerer', 'Chaos Emperor Dragon',
            'Dark Magician Girl', 'Dark Magician', 'Blue-Eyes', 'Red-Eyes',
            'Kuriboh', 'Jinzo', 'Cyber Dragon', 'Elemental HERO', 'Destiny HERO',
            'Harpie', 'Goblin', 'Celtic Guardian', 'Gaia', 'Summoned Skull',
            'Buster Blader', 'Valkyrion', 'Alpha', 'Beta', 'Gamma', 'Magnet Warrior',
            'Silent Swordsman', 'Silent Magician', 'Apprentice', 'Valkyria',
            'D.D. Warrior', 'D.D. Survivor', 'Mystic Tomato', 'Giant Germ',
            'Peten', 'Sangan', 'Witch of the Black Forest', 'Mask of Darkness',
            'Cyber Jar', 'Morphing Jar', 'Fiber Jar',
            'Apple Magician Girl', 'Lemon Magician Girl', 'Chocolate Magician Girl',
            'Berry Magician Girl', 'Kiwi Magician Girl', 'Magician Girl the',
            'Magician\'s Valkyria', 'Magician of Dark Illusion', 'Apprentice Illusion Magician',
            'Royal Magical Library', 'Endymion the Master Magician', 'Magical Exemplar',
            'Breaker the Magical Warrior', 'Defender the Magical Knight',
            'Crusader of Endymion', 'Frequency Magician',
            'Manju of the Ten Thousand Hands', 'Senju of the Thousand Hands',
            'Thunder Dragon', 'Honest', 'Spirit Reaper', 'Don Zaloog',
            'Exiled Force', 'Exodia', 'Necro Gardna', 'Dandylion',
            'Lonefire Blossom', 'Spore', 'Glow-Up Bulb', 'Debris Dragon',
            'Card Trooper', 'Ryko', 'Lumina', 'Ehren', 'Garoth', 'Jain',
            'Lyla', 'Wulf', 'Celestia', 'Gragonith',
            'Tribe-Infecting Virus', 'Dark Dust Spirit', 'D.D.M.', 'Magician of Chaos',
            'Castel', 'Tornado Dragon', 'Utopia', 'Number', 'Constellar',
            'Photon Strike Bounzer', 'Ebon', 'Norito', 'Big Eye', 'Dracossack',
            'Flare Metal Dragon', 'Tempest Magician', 'Arcanite Magician',
            'Stardust Dragon', 'Goyo Guardian', 'Black Rose Dragon', 'Ancient Fairy Dragon',
            'Toon Dark Magician', 'Toon Summoned Skull', 'Toon Gemini Elf',
            'Skilled Dark Magician', 'Skilled White Magician', 'Polymerization',
            'XYZ-Dragon Cannon', 'VWXYZ', 'ABC-Dragon Buster', 'VW-Tiger'
        ];

        // Spell/Trap keywords - if card has these, it's LIKELY a spell/trap
        const spellTrapIndicators = [
            'Pot of', 'Jar of', 'Trap Hole', 'Hole', 'Storm', 'Mirror Force', 'Tribute',
            'Cylinder', 'Drain', 'Judgment', 'Typhoon', 'Vortex', 'Lightning Vortex',
            'Reborn', 'Burial', 'Snatch Steal', 'Change of Heart', 'Brain Control',
            'Soul Exchange', 'Creature Swap', 'Enemy Controller', 'Book of',
            'Greed', 'Charity', 'Card Destruction', 'Painful Choice',
            'Navigation', 'Circle', 'Eternal Soul', 'Soul Charge', 'Call of the Haunted',
            'Premature Burial', 'Monster Reborn', 'Heavy Storm', 'Mystical Space Typhoon',
            'Dark Magic Attack', 'Dark Magic Expanded', 'Eye of Timaeus', 'Illusion Magic',
            'Spell Power Grasp', 'Upstart Goblin', 'Magical Citadel', 'Pitch-Black Power Stone',
            'Magical Blast', 'Magical Dimension', 'Terraforming', 'One Day of Peace',
            'Toon Table of Contents', 'Toon World', 'Magic Planter',
            'De-Spell', 'Fissure', 'Compulsory', 'Nobleman', 'Sakuretsu', 'Bottomless',
            'Scapegoat', 'Reload', 'Reckless Greed', 'Magical Mallet',
            'Solemn', 'Seven Tools', 'Magic Jammer', 'Magic Drain', 'Spell Shield',
            'Divine Wrath', 'Skill Drain', 'Mind Crush', 'Trap Dustshoot', 'Black Horn',
            'Ash Blossom', 'Effect Veiler', 'Infinite Impermanence', 'Ghost Belle',
            'Magic Cylinder', 'Mirror Wall', 'Threatening Roar', 'Waboku',
            'Foolish Burial', 'Dust Tornado', 'Stamping Destruction', 'Giant Trunade',
            'Raigeki', 'Dark Hole', 'Torrential Tribute', 'Lightning Storm',
            'Solemn Warning', 'Solemn Strike', 'Dimensional Prison', 'Ring of Destruction',
            'Ceasefire', 'Royal Decree', 'Imperial Order', 'Macro Cosmos',
            'Dimensional Fissure', 'Banisher of the Radiance', 'Soul Absorption',
            'Return from the Different Dimension', 'Allure of Darkness', 'Trade-In',
            'Cards of Consonance', 'Future Fusion', 'Overload Fusion', 'Miracle Fusion',
            'Parallel World Fusion', 'Chain Material', 'Fusion Gate', 'Polymerization',
            'Power Bond', 'Limiter Removal', 'Megamorph', 'United We Stand',
            'Mage Power', 'Axe of Despair', 'Fairy Meteor Crush', 'Stamping Destruction',
            'Pole Position', 'Gravity Bind', 'Messenger of Peace', 'Swords of Revealing Light',
            'Level Limit', 'Nightmare Wheel', 'Dark Room of Nightmare', 'Secret Barrel'
        ];

        const processCardList = (cardList) => {
            if (!cardList || !Array.isArray(cardList)) return;

            cardList.forEach(cardEntry => {
                const parsed = this.parseCardEntry(cardEntry);
                const cardName = parsed.name;

                // Check if it's a known monster (EXCLUDE these)
                const isKnownMonster = knownMonsters.some(monsterPattern =>
                    cardName.includes(monsterPattern)
                );

                // Check if it has spell/trap indicators (INCLUDE these)
                const hasSpellTrapIndicator = spellTrapIndicators.some(indicator =>
                    cardName.includes(indicator)
                );

                // Check if it's in toolkit (INCLUDE these)
                const isInToolkit = this.toolkitPool.tooPowerful.some(c => c.name === cardName) ||
                                   this.toolkitPool.standard.some(c => c.name === cardName);

                // INCLUDE if: (has spell/trap indicator OR in toolkit) AND NOT a known monster
                // OR: default to INCLUDE unless it's a known monster (very inclusive approach)
                if (!isKnownMonster && (hasSpellTrapIndicator || isInToolkit)) {
                    spellTraps.push({
                        cardName: cardName,
                        quantity: parsed.quantity
                    });
                } else if (!isKnownMonster && !hasSpellTrapIndicator && !isInToolkit) {
                    // For ambiguous cases, default to INCLUDING (better to show extra than miss cards)
                    // This catches cards like "Pole Position" that don't match patterns
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
            graveyard: 'Graveyard'
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
