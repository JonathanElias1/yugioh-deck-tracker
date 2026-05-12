// Card Lightbox - Shows card details and deck usage
class CardLightbox {
    constructor() {
        this.createLightboxHTML();
        this.setupEventListeners();
    }

    createLightboxHTML() {
        // Check if lightbox already exists
        if (document.getElementById('cardLightbox')) return;

        const lightboxHTML = `
            <div id="cardLightbox" class="card-lightbox" style="display: none;">
                <div class="lightbox-backdrop" onclick="cardLightbox.close()"></div>
                <div class="lightbox-content">
                    <button class="lightbox-close" onclick="cardLightbox.close()">×</button>
                    <div class="lightbox-body">
                        <div class="lightbox-image-container">
                            <img id="lightboxImage" src="" alt="Card Image">
                        </div>
                        <div class="lightbox-info">
                            <h2 id="lightboxCardName"></h2>
                            <div class="lightbox-stats">
                                <div class="lightbox-stat">
                                    <span class="stat-label">Total Owned:</span>
                                    <span class="stat-value" id="lightboxTotalOwned">0</span>
                                </div>
                                <div class="lightbox-stat">
                                    <span class="stat-label">Used in Decks:</span>
                                    <span class="stat-value" id="lightboxDeckCount">0</span>
                                </div>
                            </div>
                            <div class="lightbox-decks-section">
                                <h3>Found in Decks:</h3>
                                <div id="lightboxDeckList" class="lightbox-deck-list">
                                    <!-- Populated dynamically -->
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', lightboxHTML);
    }

    setupEventListeners() {
        // Listen for Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.close();
            }
        });
    }

    parseCardEntry(entry) {
        const match = entry.match(/^(\d+)\s+(.+)$/);
        if (match) {
            return { quantity: parseInt(match[1]), name: match[2] };
        }
        return { quantity: 1, name: entry };
    }

    findCardInDecks(cardName) {
        const decksWithCard = [];
        const allDecks = window.decks || [];

        allDecks.forEach(deck => {
            if (deck.status === 'consolidated') return;

            const ownedCards = localStorage.getItem(`ownedCards_${deck.id}`);
            const ownedCardsObj = ownedCards ? JSON.parse(ownedCards) : {};
            const removedCards = localStorage.getItem(`removedCards_${deck.id}`);
            const removedCardsArr = removedCards ? JSON.parse(removedCards) : [];

            const checkCards = (cardList, deckType) => {
                if (!cardList) return;

                cardList.forEach(cardEntry => {
                    // Skip if card was removed
                    if (removedCardsArr.includes(cardEntry)) return;

                    const parsed = this.parseCardEntry(cardEntry);

                    // Check if this is the card we're looking for
                    if (parsed.name.toLowerCase() === cardName.toLowerCase()) {
                        const ownedValue = ownedCardsObj[cardEntry];
                        let ownedQuantity = 0;

                        if (typeof ownedValue === 'number') {
                            ownedQuantity = ownedValue;
                        } else if (ownedValue === true) {
                            ownedQuantity = parsed.quantity;
                        }

                        decksWithCard.push({
                            deckId: deck.id,
                            deckName: deck.name,
                            tier: deck.tier,
                            deckType: deckType,
                            quantity: parsed.quantity,
                            owned: ownedQuantity
                        });
                    }
                });
            };

            // Check main deck
            checkCards(deck.mainDeck, 'Main');
            checkCards(deck.extraDeck, 'Extra');

            // Check alternate paths
            if (deck.pathA) {
                checkCards(deck.pathA.mainDeck, 'Main (Path A)');
                checkCards(deck.pathA.extraDeck, 'Extra (Path A)');
            }
            if (deck.pathB) {
                checkCards(deck.pathB.mainDeck, 'Main (Path B)');
                checkCards(deck.pathB.extraDeck, 'Extra (Path B)');
            }
            if (deck.pathC) {
                checkCards(deck.pathC.mainDeck, 'Main (Path C)');
                checkCards(deck.pathC.extraDeck, 'Extra (Path C)');
            }

            // Check custom cards
            const customCards = localStorage.getItem(`customCards_${deck.id}`);
            if (customCards) {
                const customCardsObj = JSON.parse(customCards);
                checkCards(customCardsObj.main || [], 'Main (Custom)');
                checkCards(customCardsObj.extra || [], 'Extra (Custom)');
            }
        });

        return decksWithCard;
    }

    getTotalOwnedFromInventory(cardName) {
        const inventory = localStorage.getItem('cardInventory');
        if (!inventory) return 0;

        const inventoryObj = JSON.parse(inventory);
        if (inventoryObj[cardName]) {
            return inventoryObj[cardName].owned || 0;
        }
        return 0;
    }

    async open(cardName, imageUrl) {
        const lightbox = document.getElementById('cardLightbox');
        const image = document.getElementById('lightboxImage');
        const nameEl = document.getElementById('lightboxCardName');
        const totalOwnedEl = document.getElementById('lightboxTotalOwned');
        const deckCountEl = document.getElementById('lightboxDeckCount');
        const deckListEl = document.getElementById('lightboxDeckList');

        // If no image URL provided, try to fetch it
        if (!imageUrl) {
            imageUrl = await this.fetchCardImage(cardName);
        }

        // Set card image and name
        if (imageUrl) {
            image.src = imageUrl;
            image.alt = cardName;
        } else {
            image.src = '';
            image.alt = 'Image not found';
        }
        nameEl.textContent = cardName;

        // Find all decks using this card
        const decksWithCard = this.findCardInDecks(cardName);
        const totalOwned = this.getTotalOwnedFromInventory(cardName);

        // Update stats
        totalOwnedEl.textContent = totalOwned;
        deckCountEl.textContent = decksWithCard.length;

        // Render deck list
        if (decksWithCard.length === 0) {
            deckListEl.innerHTML = '<p style="color: rgba(255,255,255,0.6); text-align: center; padding: 20px;">Not used in any deck</p>';
        } else {
            const tierColors = {
                'S': 'var(--tier-s)',
                'A': 'var(--tier-a)',
                'B': 'var(--tier-b)',
                'C': 'var(--tier-c)',
                'D': 'var(--tier-d)'
            };

            deckListEl.innerHTML = decksWithCard.map(deck => {
                const ownershipStatus = deck.owned >= deck.quantity ? '✅' : (deck.owned > 0 ? '🟡' : '❌');

                return `
                    <a href="deck.html?id=${deck.deckId}" class="lightbox-deck-item" target="_blank">
                        <div class="lightbox-deck-info">
                            <span class="tier-badge-small" style="background: ${tierColors[deck.tier]}">${deck.tier}</span>
                            <span class="lightbox-deck-name">${deck.deckName}</span>
                            <span class="lightbox-deck-type">${deck.deckType}</span>
                        </div>
                        <div class="lightbox-deck-ownership">
                            <span class="ownership-status">${ownershipStatus}</span>
                            <span class="ownership-quantity">${deck.owned}/${deck.quantity}</span>
                        </div>
                    </a>
                `;
            }).join('');
        }

        // Show lightbox
        lightbox.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    close() {
        const lightbox = document.getElementById('cardLightbox');
        lightbox.style.display = 'none';
        document.body.style.overflow = '';
    }

    async fetchCardImage(cardName) {
        try {
            const response = await fetch(`https://db.ygoprodeck.com/api/v7/cardinfo.php?name=${encodeURIComponent(cardName)}`);
            const data = await response.json();

            if (data.data && data.data[0] && data.data[0].card_images) {
                return data.data[0].card_images[0].image_url;
            }
        } catch (error) {
            console.log(`Could not fetch image for: ${cardName}`);
        }
        return null;
    }
}

// Initialize lightbox when DOM is ready
let cardLightbox;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        cardLightbox = new CardLightbox();
    });
} else {
    cardLightbox = new CardLightbox();
}

// Helper function to make images clickable (call this after rendering cards)
function makeCardImagesClickable() {
    document.querySelectorAll('.card-image-small img').forEach(img => {
        if (!img.hasAttribute('data-lightbox-enabled')) {
            img.style.cursor = 'pointer';
            img.setAttribute('data-lightbox-enabled', 'true');

            img.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const cardName = img.alt || img.closest('.card-item').dataset.cardName;
                if (cardName && cardLightbox) {
                    cardLightbox.open(cardName, img.src);
                }
            });
        }
    });

    // Also handle inventory card images
    document.querySelectorAll('.inventory-card-image, .card-image').forEach(img => {
        if (!img.hasAttribute('data-lightbox-enabled')) {
            img.style.cursor = 'pointer';
            img.setAttribute('data-lightbox-enabled', 'true');

            img.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const cardName = img.alt;
                if (cardName && cardLightbox) {
                    cardLightbox.open(cardName, img.src);
                }
            });
        }
    });
}
