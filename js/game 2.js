class Game {
    constructor() {
        this.players = [];
        this.currentPlayerIndex = 0;
        this.deck = new Deck();
        this.discardPile = [];
        this.gameState = 'waiting'; // waiting, playing, round_end, game_over
        this.roundNumber = 1;
        this.knocker = null;
        this.finalRound = false;
        this.lastPlayerIndex = null;
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

    startGame() {
        if (this.players.length < 2) {
            return false;
        }
        
        this.gameState = 'playing';
        this.dealNewRound();
        return true;
    }

    dealNewRound() {
        // Reset deck and shuffle
        this.deck = new Deck();
        this.discardPile = [];
        this.knocker = null;
        this.finalRound = false;
        this.lastPlayerIndex = null;
        
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
        
        // Find first player who isn't out
        this.currentPlayerIndex = 0;
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
        if (!player || player.id !== this.getCurrentPlayer().id) {
            return null;
        }
        
        const card = this.drawFromDeck();
        if (card) {
            player.hand.addCard(card);
        }
        return card;
    }

    playerDrawFromDiscard(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player || player.id !== this.getCurrentPlayer().id || this.discardPile.length === 0) {
            return null;
        }
        
        const card = this.drawFromDiscard();
        if (card) {
            player.hand.addCard(card);
        }
        return card;
    }

    playerDiscardCard(playerId, cardIndex) {
        const player = this.players.find(p => p.id === playerId);
        if (!player || player.id !== this.getCurrentPlayer().id) {
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
            this.handleThirtyOne(player);
            return true;
        }
        
        this.nextTurn();
        return true;
    }

    playerKnock(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player || player.id !== this.getCurrentPlayer().id) {
            return false;
        }
        
        this.knocker = player;
        this.finalRound = true;
        this.lastPlayerIndex = this.currentPlayerIndex;
        this.nextTurn();
        return true;
    }

    nextTurn() {
        do {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        } while (this.players[this.currentPlayerIndex].isOut);
        
        // Check if we've completed the final round
        if (this.finalRound && this.currentPlayerIndex === this.lastPlayerIndex) {
            this.endRound();
        }
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
        // Calculate scores for all players
        this.players.forEach(player => {
            if (!player.isOut) {
                player.score = player.hand.getScore();
            }
        });
        
        // Find the lowest score(s)
        const activePlayers = this.players.filter(p => !p.isOut);
        const minScore = Math.min(...activePlayers.map(p => p.score));
        const losers = activePlayers.filter(p => p.score === minScore);
        
        // Players with lowest score lose a life
        losers.forEach(player => {
            this.playerLoseLife(player);
        });
        
        // Check if game is over
        const remainingPlayers = this.players.filter(p => !p.isOut);
        if (remainingPlayers.length <= 1) {
            this.gameState = 'game_over';
            return;
        }
        
        // Start new round
        this.roundNumber++;
        this.dealNewRound();
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
            finalRound: this.finalRound
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
    module.exports = { Game, Card, Deck, Hand };
}