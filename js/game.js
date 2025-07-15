// Import dependencies for Node.js - only in Node.js environment
if (typeof require !== 'undefined' && typeof window === 'undefined') {
    const { Card, Deck, Hand } = require('./cards.js');
    // Make them available globally in Node.js
    global.Card = Card;
    global.Deck = Deck;
    global.Hand = Hand;
}

class Game {
    constructor() {
        this.players = [];
        this.currentPlayerIndex = 0;
        this.startingPlayerIndex = 0; // Track who starts each round
        this.deck = new Deck();
        this.discardPile = [];
        this.gameState = 'waiting'; // waiting, playing, round_end, game_over
        this.roundNumber = 1;
        this.knocker = null;
        this.finalRound = false;
        this.lastPlayerIndex = null;
        this.currentPlayerHasDrawn = false; // Track if current player has drawn this turn
    }

    addPlayer(playerId, name) {
        if (this.players.length >= 6) {
            return false;
        }
        
        const player = {
            id: playerId,
            name: name,
            hand: new Hand(),
            lives: 3,
            isOnCloud: false,
            isOut: false,
            score: 0
        };
        
        this.players.push(player);
        return true;
    }

    removePlayer(playerId) {
        this.players = this.players.filter(player => player.id !== playerId);
        if (this.currentPlayerIndex >= this.players.length) {
            this.currentPlayerIndex = 0;
        }
    }

    reconnectPlayer(oldPlayerId, newPlayerId) {
        // Update player ID in the game state
        const playerIndex = this.players.findIndex(player => player.id === oldPlayerId);
        if (playerIndex !== -1) {
            this.players[playerIndex].id = newPlayerId;
            console.log(`Game: Updated player ID from ${oldPlayerId} to ${newPlayerId}`);
        }
    }

    startGame() {
        if (this.players.length < 2) {
            return false;
        }
        
        this.gameState = 'playing';
        this.dealNewRound();
        return true;
    }

    dealNewRound() {
        console.log('dealNewRound called - resetting game state for new round');
        
        // Reset deck and shuffle
        this.deck = new Deck();
        this.discardPile = [];
        this.knocker = null;
        this.finalRound = false;
        this.lastPlayerIndex = null;
        this.currentPlayerHasDrawn = false;
        
        console.log('Knock state reset - finalRound:', this.finalRound, 'knocker:', this.knocker);
        
        // Clear all hands
        this.players.forEach(player => {
            player.hand.clear();
            player.score = 0;
        });
        
        // Deal 3 cards to each player
        for (let i = 0; i < 3; i++) {
            this.players.forEach(player => {
                if (!player.isOut) {
                    player.hand.addCard(this.deck.deal());
                }
            });
        }
        
        // Place one card in discard pile
        this.discardPile.push(this.deck.deal());
        
        // Calculate initial scores
        this.players.forEach(player => {
            if (!player.isOut) {
                player.score = player.hand.getScore();
            }
        });
        
        // Rotate starting player for new round
        this.startingPlayerIndex = (this.startingPlayerIndex + 1) % this.players.length;
        
        // Find first player who isn't out, starting from the designated starting player
        this.currentPlayerIndex = this.startingPlayerIndex;
        while (this.players[this.currentPlayerIndex].isOut) {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        }
    }

    getCurrentPlayer() {
        return this.players[this.currentPlayerIndex];
    }

    getTopDiscardCard() {
        return this.discardPile.length > 0 ? this.discardPile[this.discardPile.length - 1] : null;
    }

    drawFromDeck() {
        if (this.deck.isEmpty()) {
            // Reshuffle discard pile into deck, keep top card
            const topCard = this.discardPile.pop();
            this.deck.cards = [...this.discardPile];
            this.deck.shuffle();
            this.discardPile = [topCard];
        }
        return this.deck.deal();
    }

    drawFromDiscard() {
        return this.discardPile.pop();
    }

    discardCard(card) {
        this.discardPile.push(card);
    }

    playerDrawFromDeck(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player || player.id !== this.getCurrentPlayer().id || this.currentPlayerHasDrawn) {
            return null;
        }
        
        const card = this.drawFromDeck();
        if (card) {
            player.hand.addCard(card);
            this.currentPlayerHasDrawn = true;
        }
        return card;
    }

    playerDrawFromDiscard(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player || player.id !== this.getCurrentPlayer().id || this.discardPile.length === 0 || this.currentPlayerHasDrawn) {
            return null;
        }
        
        const card = this.drawFromDiscard();
        if (card) {
            player.hand.addCard(card);
            this.currentPlayerHasDrawn = true;
        }
        return card;
    }

    playerDiscardCard(playerId, cardIndex) {
        const player = this.players.find(p => p.id === playerId);
        if (!player || player.id !== this.getCurrentPlayer().id || !this.currentPlayerHasDrawn) {
            return false;
        }
        
        if (cardIndex < 0 || cardIndex >= player.hand.size()) {
            return false;
        }
        
        const card = player.hand.removeCard(cardIndex);
        this.discardCard(card);
        player.score = player.hand.getScore();
        
        // Check for instant win (31)
        if (player.hand.isThirtyOne()) {
            const result = this.handleThirtyOne(player);
            return result || true;
        }
        
        const nextTurnResult = this.nextTurn();
        return nextTurnResult || true;
    }

    playerKnock(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player || player.id !== this.getCurrentPlayer().id) {
            console.log('Knock rejected - not current player');
            return false;
        }
        
        // Prevent knocking if final round has already started
        if (this.finalRound) {
            console.log('Knock rejected - final round already started');
            return false;
        }
        
        console.log(`Player ${player.name} knocked! Starting final round. Current player index: ${this.currentPlayerIndex}`);
        this.knocker = player;
        this.finalRound = true;
        this.lastPlayerIndex = this.currentPlayerIndex;
        console.log('Set lastPlayerIndex to:', this.lastPlayerIndex);
        this.nextTurn();
        return true;
    }

    nextTurn() {
        console.log('nextTurn called - current player:', this.currentPlayerIndex, 'finalRound:', this.finalRound, 'lastPlayerIndex:', this.lastPlayerIndex);
        
        // Reset the draw flag for the new turn
        this.currentPlayerHasDrawn = false;
        
        do {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        } while (this.players[this.currentPlayerIndex].isOut);
        
        console.log('nextTurn - new current player:', this.currentPlayerIndex);
        
        // Check if we've completed the final round
        if (this.finalRound && this.currentPlayerIndex === this.lastPlayerIndex) {
            console.log('Final round completed! Ending round...');
            return this.endRound();
        } else if (this.finalRound) {
            console.log('Final round continues - current:', this.currentPlayerIndex, 'last:', this.lastPlayerIndex);
        }
        
        return null; // No special event
    }

    handleThirtyOne(player) {
        // Player with 31 wins the round instantly
        // All other players lose a life
        this.players.forEach(p => {
            if (p.id !== player.id && !p.isOut) {
                this.playerLoseLife(p);
            }
        });
        
        this.endRound();
    }

    endRound() {
        console.log('endRound called - calculating scores and determining losers');
        
        // Calculate scores for all players
        this.players.forEach(player => {
            if (!player.isOut) {
                player.score = player.hand.getScore();
                console.log(`Player ${player.name} final score: ${player.score}`);
            }
        });
        
        // Find the lowest score(s)
        const activePlayers = this.players.filter(p => !p.isOut);
        const minScore = Math.min(...activePlayers.map(p => p.score));
        const losers = activePlayers.filter(p => p.score === minScore);
        
        console.log(`Lowest score: ${minScore}, Losers:`, losers.map(p => p.name));
        
        // Prepare round end data
        const roundEndData = {
            roundNumber: this.roundNumber,
            scores: this.players.filter(p => !p.isOut).map(p => ({
                name: p.name,
                score: p.score
            })),
            losers: losers.map(p => p.name)
        };
        
        // Players with lowest score lose a life
        losers.forEach(player => {
            this.playerLoseLife(player);
            console.log(`Player ${player.name} lost a life - lives remaining: ${player.lives}, onCloud: ${player.isOnCloud}, out: ${player.isOut}`);
        });
        
        // Add remaining players info after life loss
        roundEndData.remainingPlayers = this.players.filter(p => !p.isOut).map(p => ({
            name: p.name,
            lives: p.lives,
            isOnCloud: p.isOnCloud
        }));
        
        // Check if game is over
        const remainingPlayers = this.players.filter(p => !p.isOut);
        if (remainingPlayers.length <= 1) {
            console.log('Game over! Only one player remaining.');
            this.gameState = 'game_over';
            
            // Prepare game over data
            this.gameOverData = {
                winner: remainingPlayers.length === 1 ? remainingPlayers[0] : null,
                finalRound: this.roundNumber
            };
            return { type: 'gameOver', data: this.gameOverData };
        }
        
        // Start new round
        console.log('Starting new round...');
        this.roundNumber++;
        this.dealNewRound();
        
        return { type: 'roundEnd', data: roundEndData };
    }

    playerLoseLife(player) {
        if (player.isOnCloud) {
            // Player was on cloud, now they're out
            player.isOut = true;
            player.isOnCloud = false;
        } else if (player.lives > 1) {
            // Player loses a life
            player.lives--;
        } else {
            // Player goes on cloud
            player.lives = 0;
            player.isOnCloud = true;
        }
    }

    getGameState() {
        return {
            players: this.players.map(player => ({
                id: player.id,
                name: player.name,
                lives: player.lives,
                isOnCloud: player.isOnCloud,
                isOut: player.isOut,
                score: player.score,
                handSize: player.hand.size(),
                // Only include actual cards for the requesting player
                hand: player.hand.toArray()
            })),
            currentPlayerIndex: this.currentPlayerIndex,
            topDiscardCard: this.getTopDiscardCard(),
            gameState: this.gameState,
            roundNumber: this.roundNumber,
            knocker: this.knocker ? this.knocker.id : null,
            finalRound: this.finalRound,
            currentPlayerHasDrawn: this.currentPlayerHasDrawn
        };
    }

    getPlayerGameState(playerId) {
        const gameState = this.getGameState();
        
        // Hide other players' cards
        gameState.players = gameState.players.map(player => {
            if (player.id !== playerId) {
                player.hand = []; // Hide cards from other players
            }
            return player;
        });
        
        return gameState;
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Game };
}