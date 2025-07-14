class Card {
    constructor(suit, rank) {
        this.suit = suit;
        this.rank = rank;
        this.value = this.getCardValue();
        this.isRed = suit === 'hearts' || suit === 'diamonds';
    }

    getCardValue() {
        if (this.rank === 'A') return 11;
        if (['J', 'Q', 'K'].includes(this.rank)) return 10;
        return parseInt(this.rank);
    }

    getSuitSymbol() {
        const symbols = {
            'hearts': '♥',
            'diamonds': '♦',
            'clubs': '♣',
            'spades': '♠'
        };
        return symbols[this.suit];
    }

    getDisplayRank() {
        return this.rank;
    }

    toString() {
        return `${this.rank}${this.getSuitSymbol()}`;
    }
}

class Deck {
    constructor() {
        this.cards = [];
        this.initializeDeck();
        this.shuffle();
    }

    initializeDeck() {
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
        
        this.cards = [];
        for (let suit of suits) {
            for (let rank of ranks) {
                this.cards.push(new Card(suit, rank));
            }
        }
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
    }

    deal() {
        return this.cards.pop();
    }

    isEmpty() {
        return this.cards.length === 0;
    }

    addCard(card) {
        this.cards.push(card);
    }
}

class Hand {
    constructor() {
        this.cards = [];
    }

    addCard(card) {
        this.cards.push(card);
    }

    removeCard(index) {
        return this.cards.splice(index, 1)[0];
    }

    getCard(index) {
        return this.cards[index];
    }

    size() {
        return this.cards.length;
    }

    clear() {
        this.cards = [];
    }

    // Calculate best possible score for 31
    getScore() {
        if (this.cards.length !== 3) return 0;

        // Check for three of a kind (30.5 points, beats everything except 31)
        const ranks = this.cards.map(card => card.rank);
        const rankCounts = {};
        ranks.forEach(rank => rankCounts[rank] = (rankCounts[rank] || 0) + 1);
        
        if (Object.values(rankCounts).some(count => count === 3)) {
            return 30.5;
        }

        // Calculate suit totals
        const suitTotals = {};
        this.cards.forEach(card => {
            if (!suitTotals[card.suit]) {
                suitTotals[card.suit] = 0;
            }
            suitTotals[card.suit] += card.value;
        });

        // Return highest suit total
        return Math.max(...Object.values(suitTotals));
    }

    // Check if hand contains 31 (Ace, King, Queen of same suit, etc.)
    isThirtyOne() {
        return this.getScore() === 31;
    }

    // Get cards as array for serialization
    toArray() {
        return this.cards.map(card => ({
            suit: card.suit,
            rank: card.rank
        }));
    }

    // Load cards from array
    fromArray(cardArray) {
        this.cards = cardArray.map(cardData => new Card(cardData.suit, cardData.rank));
    }
}

// Utility functions for card rendering
function createCardElement(card, faceDown = false) {
    const cardEl = document.createElement('div');
    cardEl.className = 'card';
    
    if (faceDown) {
        cardEl.classList.add('back');
        return cardEl;
    }
    
    if (!card) {
        cardEl.classList.add('empty');
        return cardEl;
    }
    
    cardEl.classList.add('playing-card');
    cardEl.classList.add(card.isRed ? 'red' : 'black');
    
    // Add rank in top-left
    const rankTop = document.createElement('div');
    rankTop.className = 'rank';
    rankTop.textContent = card.getDisplayRank();
    cardEl.appendChild(rankTop);
    
    // Add suit in center
    const suit = document.createElement('div');
    suit.className = 'suit';
    suit.textContent = card.getSuitSymbol();
    cardEl.appendChild(suit);
    
    // Add rank in bottom-right (rotated)
    const rankBottom = document.createElement('div');
    rankBottom.className = 'rank bottom';
    rankBottom.textContent = card.getDisplayRank();
    cardEl.appendChild(rankBottom);
    
    return cardEl;
}

function updateCardElement(cardEl, card, faceDown = false) {
    // Clear existing content
    cardEl.innerHTML = '';
    cardEl.className = 'card';
    
    if (faceDown) {
        cardEl.classList.add('back');
        return;
    }
    
    if (!card) {
        cardEl.classList.add('empty');
        return;
    }
    
    cardEl.classList.add('playing-card');
    cardEl.classList.add(card.isRed ? 'red' : 'black');
    
    // Add rank in top-left
    const rankTop = document.createElement('div');
    rankTop.className = 'rank';
    rankTop.textContent = card.getDisplayRank();
    cardEl.appendChild(rankTop);
    
    // Add suit in center
    const suit = document.createElement('div');
    suit.className = 'suit';
    suit.textContent = card.getSuitSymbol();
    cardEl.appendChild(suit);
    
    // Add rank in bottom-right (rotated)
    const rankBottom = document.createElement('div');
    rankBottom.className = 'rank bottom';
    rankBottom.textContent = card.getDisplayRank();
    cardEl.appendChild(rankBottom);
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Card, Deck, Hand, createCardElement, updateCardElement };
}