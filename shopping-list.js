// Shopping List Management System
class ShoppingList {
    constructor() {
        this.decks = decks || [];
        this.currentFilter = 'all';
        this.selectedDeckId = 'all';
        this.neededCards = {};
        this.deckNeeds = {};
        this.init();
    }

    init() {
        this.populateDeckSelector();
        this.calculateNeededCards();
        this.renderShoppingList();
        this.renderDeckShoppingList();
        this.updateTCGFormat();
        this.updateStats();
        this.setupEventListeners();
    }

    populateDeckSelector() {
        const selector = document.getElementById('deckSelector');
        const activeDecks = this.decks.filter(d => d.status === 'active').sort((a, b) => a.id - b.id);

        activeDecks.forEach(deck => {
            const option = document.createElement('option');
            option.value = deck.id;
            option.textContent = `Deck #${deck.id} - ${deck.name} (${deck.tier} Tier)`;
            selector.appendChild(option);
        });
    }

    parseCardEntry(entry) {
        // Parse entries like "3 Blue-Eyes White Dragon" or "Blue-Eyes White Dragon"
        const match = entry.match(/^(\d+)\s+(.+)$/);
        if (match) {
            return { quantity: parseInt(match[1]), name: match[2] };
        }
        return { quantity: 1, name: entry };
    }

    calculateNeededCards() {
        this.neededCards = {};
        this.deckNeeds = {};

        // Load global inventory
        const inventoryData = localStorage.getItem('cardInventory');
        const inventory = inventoryData ? JSON.parse(inventoryData) : {};

        // First pass: Calculate total needed for each card across all decks
        const totalNeededByCard = {}; // { "cardName": { total: number, decks: [...] } }

        this.decks.forEach(deck => {
            if (deck.status === 'consolidated') return;

            // Skip if specific deck is selected
            if (this.selectedDeckId !== 'all' && deck.id !== parseInt(this.selectedDeckId)) {
                return;
            }

            // Skip if filtered by tier
            if (this.currentFilter !== 'all' && this.currentFilter !== 'priority') {
                if (deck.tier !== this.currentFilter) return;
            }

            this.deckNeeds[deck.id] = {
                deckName: deck.name,
                tier: deck.tier,
                cards: [],
                totalNeeded: 0
            };

            const processCards = (cardList) => {
                if (!cardList) return;

                cardList.forEach(cardEntry => {
                    const parsed = this.parseCardEntry(cardEntry);
                    const { quantity, name } = parsed;

                    // Track total needed for this card
                    if (!totalNeededByCard[name]) {
                        totalNeededByCard[name] = {
                            total: 0,
                            decks: []
                        };
                    }
                    totalNeededByCard[name].total += quantity;
                    totalNeededByCard[name].decks.push({
                        id: deck.id,
                        name: deck.name,
                        tier: deck.tier,
                        quantity: quantity,
                        cardEntry: cardEntry
                    });

                    // Don't add to deck needs yet - will calculate after inventory check
                });
            };

            // Process main deck and extra deck
            processCards(deck.mainDeck);
            processCards(deck.extraDeck);

            // Process custom cards
            const customCards = localStorage.getItem(`customCards_${deck.id}`);
            if (customCards) {
                const customCardsObj = JSON.parse(customCards);
                processCards(customCardsObj.main || []);
                processCards(customCardsObj.extra || []);
            }
        });

        // Second pass: Compare with inventory to determine what needs to be purchased
        Object.keys(totalNeededByCard).forEach(cardName => {
            const cardData = totalNeededByCard[cardName];
            const totalNeeded = cardData.total;
            const ownedInInventory = inventory[cardName]?.owned || 0;
            const stillNeeded = Math.max(0, totalNeeded - ownedInInventory);

            if (stillNeeded > 0) {
                // Add to shopping list (aggregated view)
                this.neededCards[cardName] = {
                    quantity: stillNeeded,
                    totalNeeded: totalNeeded,
                    owned: ownedInInventory,
                    decks: cardData.decks
                };
            }

            // Add to deck-specific needs - show what each deck needs to BUY
            // Distribute the "stillNeeded" across decks proportionally
            if (stillNeeded > 0) {
                cardData.decks.forEach(deckInfo => {
                    const deckQuantity = deckInfo.quantity;
                    const needToBuy = Math.min(deckQuantity, stillNeeded);

                    if (needToBuy > 0 && this.deckNeeds[deckInfo.id]) {
                        this.deckNeeds[deckInfo.id].cards.push({
                            name: cardName,
                            quantity: needToBuy,
                            cardEntry: `${needToBuy} ${cardName}`
                        });
                        this.deckNeeds[deckInfo.id].totalNeeded += needToBuy;
                    }
                });
            }
        });

        // Filter priority decks (S and A tier)
        if (this.currentFilter === 'priority') {
            const priorityCards = {};
            Object.keys(this.neededCards).forEach(cardName => {
                const card = this.neededCards[cardName];
                const hasPriorityDeck = card.decks.some(d => d.tier === 'S' || d.tier === 'A');
                if (hasPriorityDeck) {
                    priorityCards[cardName] = card;
                }
            });
            this.neededCards = priorityCards;

            const priorityDeckNeeds = {};
            Object.keys(this.deckNeeds).forEach(deckId => {
                const deck = this.deckNeeds[deckId];
                if (deck.tier === 'S' || deck.tier === 'A') {
                    priorityDeckNeeds[deckId] = deck;
                }
            });
            this.deckNeeds = priorityDeckNeeds;
        }
    }

    setupEventListeners() {
        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.filter;
                this.calculateNeededCards();
                this.renderShoppingList();
                this.renderDeckShoppingList();
                this.updateTCGFormat();
                this.updateStats();
            });
        });

        // Deck selector
        document.getElementById('deckSelector').addEventListener('change', (e) => {
            this.selectedDeckId = e.target.value;
            this.calculateNeededCards();
            this.renderShoppingList();
            this.renderDeckShoppingList();
            this.updateTCGFormat();
            this.updateStats();
        });

        // Copy TCG format
        document.getElementById('copyTCGFormat').addEventListener('click', () => {
            const textarea = document.getElementById('tcgFormatOutput');
            textarea.select();
            document.execCommand('copy');

            const btn = document.getElementById('copyTCGFormat');
            const originalText = btn.textContent;
            btn.textContent = '✅ Copied!';
            setTimeout(() => {
                btn.textContent = originalText;
            }, 2000);
        });

        // Copy simple list
        document.getElementById('copySimpleList').addEventListener('click', () => {
            const cards = Object.keys(this.neededCards).sort();
            const text = cards.map(name => {
                const qty = this.neededCards[name].quantity;
                return `${qty} ${name}`;
            }).join('\n');

            navigator.clipboard.writeText(text).then(() => {
                const btn = document.getElementById('copySimpleList');
                const originalText = btn.textContent;
                btn.textContent = '✅ Copied!';
                setTimeout(() => {
                    btn.textContent = originalText;
                }, 2000);
            });
        });

        // Export to PDF
        document.getElementById('exportPDF').addEventListener('click', () => {
            this.exportToPDF();
        });
    }

    exportToPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Title
        doc.setFontSize(20);
        doc.setFont(undefined, 'bold');
        doc.text('Yu-Gi-Oh Shopping List', 105, 20, { align: 'center' });

        // Date
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        const date = new Date().toLocaleDateString();
        doc.text(`Generated: ${date}`, 105, 28, { align: 'center' });

        // Stats
        const totalNeeded = Object.values(this.neededCards).reduce((sum, card) => sum + card.quantity, 0);
        const uniqueCards = Object.keys(this.neededCards).length;
        const incompleteDecks = Object.keys(this.deckNeeds).filter(id => this.deckNeeds[id].cards.length > 0).length;

        doc.setFontSize(11);
        let yPos = 40;
        doc.text(`Total Cards Needed: ${totalNeeded}`, 20, yPos);
        yPos += 6;
        doc.text(`Unique Cards: ${uniqueCards}`, 20, yPos);
        yPos += 6;
        doc.text(`Decks Incomplete: ${incompleteDecks}`, 20, yPos);
        yPos += 10;

        // Filter info
        if (this.currentFilter !== 'all') {
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Filter: ${this.currentFilter.toUpperCase()}`, 20, yPos);
            yPos += 8;
            doc.setTextColor(0);
        }

        if (this.selectedDeckId !== 'all') {
            const selectedDeck = this.decks.find(d => d.id === parseInt(this.selectedDeckId));
            if (selectedDeck) {
                doc.setFontSize(10);
                doc.setTextColor(100);
                doc.text(`Deck: ${selectedDeck.name}`, 20, yPos);
                yPos += 8;
                doc.setTextColor(0);
            }
        }

        // Cards list
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Cards Needed:', 20, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');

        const cards = Object.keys(this.neededCards).sort();
        cards.forEach((cardName, index) => {
            const card = this.neededCards[cardName];
            const text = `${card.quantity}x ${cardName}`;

            // Check if we need a new page
            if (yPos > 270) {
                doc.addPage();
                yPos = 20;
            }

            doc.text(text, 25, yPos);
            yPos += 6;
        });

        // Deck breakdown section
        if (Object.keys(this.deckNeeds).length > 0) {
            yPos += 10;

            // Check if we need a new page
            if (yPos > 250) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.text('Needed by Deck:', 20, yPos);
            yPos += 8;

            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');

            const deckIds = Object.keys(this.deckNeeds).filter(id => {
                return this.deckNeeds[id].cards.length > 0;
            }).sort((a, b) => {
                const deckA = this.deckNeeds[a];
                const deckB = this.deckNeeds[b];
                if (deckA.tier !== deckB.tier) {
                    return deckA.tier.localeCompare(deckB.tier);
                }
                return deckA.deckName.localeCompare(deckB.deckName);
            });

            deckIds.forEach(deckId => {
                const deck = this.deckNeeds[deckId];

                // Check if we need a new page
                if (yPos > 260) {
                    doc.addPage();
                    yPos = 20;
                }

                doc.setFont(undefined, 'bold');
                doc.text(`${deck.deckName} (${deck.tier} Tier) - ${deck.totalNeeded} cards`, 25, yPos);
                yPos += 6;

                doc.setFont(undefined, 'normal');
                deck.cards.forEach(card => {
                    // Check if we need a new page
                    if (yPos > 270) {
                        doc.addPage();
                        yPos = 20;
                    }

                    doc.text(`  ${card.originalEntry}`, 30, yPos);
                    yPos += 5;
                });

                yPos += 5;
            });
        }

        // Save PDF
        const filename = `yugioh-shopping-list-${date.replace(/\//g, '-')}.pdf`;
        doc.save(filename);

        // Visual feedback
        const btn = document.getElementById('exportPDF');
        const originalText = btn.textContent;
        btn.textContent = '✅ PDF Downloaded!';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    }

    updateTCGFormat() {
        const textarea = document.getElementById('tcgFormatOutput');
        const cards = Object.keys(this.neededCards).sort();

        if (cards.length === 0) {
            textarea.value = 'No cards needed! All decks are complete. 🎉';
            return;
        }

        const tcgFormat = cards.map(name => {
            const qty = this.neededCards[name].quantity;
            return `${qty} ${name}`;
        }).join('\n');

        textarea.value = tcgFormat;
    }

    renderShoppingList() {
        const list = document.getElementById('shoppingList');
        const cards = Object.keys(this.neededCards).sort();

        if (cards.length === 0) {
            list.innerHTML = '<p style="color: rgba(255,255,255,0.6); text-align: center; padding: 40px;">🎉 No cards needed! All selected decks are complete.</p>';
            return;
        }

        list.innerHTML = cards.map(cardName => {
            const card = this.neededCards[cardName];
            const deckList = card.decks.map(deck => {
                const tierColors = {
                    'S': 'var(--tier-s)',
                    'A': 'var(--tier-a)',
                    'B': 'var(--tier-b)',
                    'C': 'var(--tier-c)',
                    'D': 'var(--tier-d)'
                };
                return `
                    <div class="needed-deck-item">
                        <a href="deck.html?id=${deck.id}" target="_blank">
                            <span class="tier-badge-small" style="background: ${tierColors[deck.tier]}">${deck.tier}</span>
                            <span style="opacity: 0.7; font-weight: normal;">Deck #${deck.id}</span> - ${deck.name}
                        </a>
                        <span class="need-quantity">×${deck.quantity}</span>
                    </div>
                `;
            }).join('');

            return `
                <div class="shopping-card">
                    <div class="shopping-card-header">
                        <div class="shopping-card-name">${cardName}</div>
                        <div class="inventory-info">
                            <span style="opacity: 0.7;">Own: ${card.owned || 0} | Need: ${card.totalNeeded || 0}</span>
                        </div>
                        <div class="total-needed-badge">Buy: ${card.quantity}</div>
                    </div>
                    <div class="needed-for-decks">
                        <div class="needed-label">Needed for:</div>
                        ${deckList}
                    </div>
                </div>
            `;
        }).join('');
    }

    renderDeckShoppingList() {
        const list = document.getElementById('deckShoppingList');
        const deckIds = Object.keys(this.deckNeeds).filter(id => {
            return this.deckNeeds[id].cards.length > 0;
        }).sort((a, b) => {
            const deckA = this.deckNeeds[a];
            const deckB = this.deckNeeds[b];
            // Sort by tier first, then by name
            if (deckA.tier !== deckB.tier) {
                return deckA.tier.localeCompare(deckB.tier);
            }
            return deckA.deckName.localeCompare(deckB.deckName);
        });

        if (deckIds.length === 0) {
            list.innerHTML = '<p style="color: rgba(255,255,255,0.6); text-align: center; padding: 40px;">🎉 All decks complete!</p>';
            return;
        }

        list.innerHTML = deckIds.map(deckId => {
            const deck = this.deckNeeds[deckId];
            const tierColors = {
                'S': 'var(--tier-s)',
                'A': 'var(--tier-a)',
                'B': 'var(--tier-b)',
                'C': 'var(--tier-c)',
                'D': 'var(--tier-d)'
            };

            const cardList = deck.cards.map(card => {
                return `<div class="deck-need-item">${card.cardEntry}</div>`;
            }).join('');

            return `
                <div class="deck-shopping-card">
                    <div class="deck-shopping-header">
                        <div>
                            <span class="tier-badge" style="background: ${tierColors[deck.tier]}">${deck.tier}</span>
                            <a href="deck.html?id=${deckId}" target="_blank" class="deck-shopping-name">
                                <span style="opacity: 0.7; font-weight: normal;">Deck #${deckId}</span> - ${deck.deckName}
                            </a>
                        </div>
                        <div class="deck-total-badge">${deck.totalNeeded} cards needed</div>
                    </div>
                    <div class="deck-need-list">
                        ${cardList}
                    </div>
                </div>
            `;
        }).join('');
    }

    updateStats() {
        const totalNeeded = Object.values(this.neededCards).reduce((sum, card) => sum + card.quantity, 0);
        const uniqueCards = Object.keys(this.neededCards).length;
        const incompleteDecks = Object.keys(this.deckNeeds).filter(id => this.deckNeeds[id].cards.length > 0).length;

        document.getElementById('totalNeeded').textContent = totalNeeded;
        document.getElementById('uniqueCards').textContent = uniqueCards;
        document.getElementById('incompleteDecks').textContent = incompleteDecks;
    }
}

// Initialize when DOM is ready
let shoppingList;
document.addEventListener('DOMContentLoaded', async () => {
    // Wait for auth and pull inventory from Supabase
    if (typeof initAuth === 'function') {
        await initAuth();
    }

    if (typeof isAuthenticated === 'function' && isAuthenticated()) {
        console.log('📥 Pulling inventory from Supabase before generating shopping list...');

        // Pull inventory from user_profiles table
        try {
            const user = getCurrentUser();
            const { data, error } = await supabaseClient
                .from('user_profiles')
                .select('card_inventory')
                .eq('id', user.id)
                .single();

            if (error) throw error;

            if (data && data.card_inventory && Object.keys(data.card_inventory).length > 0) {
                localStorage.setItem('cardInventory', JSON.stringify(data.card_inventory));
                console.log('✅ Pulled inventory from Supabase');
            } else {
                console.log('ℹ️ No inventory found in Supabase');
            }
        } catch (error) {
            console.error('Error pulling inventory:', error);
        }
    }

    shoppingList = new ShoppingList();
});
