class UIManager {
    constructor() {
        this.currentPage = 'landing-page';
        this.gameState = null;
        this.selectedCardIndex = -1;
        this.hasDrawn = false;
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.initializeEventListeners();
            });
        } else {
            this.initializeEventListeners();
        }
    }

    initializeEventListeners() {
        // Landing page events
        const createRoomBtn = document.getElementById('create-room-btn');
        const joinRoomBtn = document.getElementById('join-room-btn');
        
        if (createRoomBtn) {
            createRoomBtn.addEventListener('click', () => {
                this.handleCreateRoom();
            });
        }

        if (joinRoomBtn) {
            joinRoomBtn.addEventListener('click', () => {
                this.handleJoinRoom();
            });
        }

        // Lobby page events
        const startGameBtn = document.getElementById('start-game-btn');
        const leaveRoomBtn = document.getElementById('leave-room-btn');
        const copyRoomCodeBtn = document.getElementById('copy-room-code');

        if (startGameBtn) {
            startGameBtn.addEventListener('click', () => {
                this.handleStartGame();
            });
        }

        if (leaveRoomBtn) {
            leaveRoomBtn.addEventListener('click', () => {
                this.handleLeaveRoom();
            });
        }

        if (copyRoomCodeBtn) {
            copyRoomCodeBtn.addEventListener('click', () => {
                this.copyRoomCode();
            });
        }

        // Game page events
        const knockBtn = document.getElementById('knock-btn');
        const drawDeckBtn = document.getElementById('draw-deck-btn');
        const drawDiscardBtn = document.getElementById('draw-discard-btn');

        if (knockBtn) {
            knockBtn.addEventListener('click', () => {
                this.handleKnock();
            });
        }

        if (drawDeckBtn) {
            drawDeckBtn.addEventListener('click', () => {
                this.handleDrawFromDeck();
            });
        }

        if (drawDiscardBtn) {
            drawDiscardBtn.addEventListener('click', () => {
                this.handleDrawFromDiscard();
            });
        }

        // Make card piles clickable
        const drawPile = document.getElementById('draw-pile');
        const discardPile = document.getElementById('discard-pile');

        if (drawPile) {
            drawPile.addEventListener('click', () => {
                this.handleDrawFromDeck();
            });
        }

        if (discardPile) {
            discardPile.addEventListener('click', () => {
                this.handleDrawFromDiscard();
            });
        }

        // Networking events
        networking.on('playerJoined', (data) => {
            this.updateLobby(data);
        });

        networking.on('playerLeft', (data) => {
            this.updateLobby(data);
            // If we were the one who left, navigate to landing
            if (!networking.getRoomInfo()) {
                router.navigate('/');
            }
        });

        networking.on('gameStarted', (data) => {
            const roomInfo = networking.getRoomInfo();
            if (roomInfo) {
                router.navigate(`/game/${roomInfo.code}`);
            }
        });

        networking.on('gameStateUpdate', (data) => {
            this.updateGameUI(data.gameState);
        });

        // Handle round end notifications
        networking.on('roundEnded', (data) => {
            this.showRoundEndSummary(data);
        });

        // Handle game over
        networking.on('gameOver', (data) => {
            this.showGameOverScreen(data);
        });

        // Handle host migration and reconnection events
        networking.on('hostMigrated', (data) => {
            if (data.newHostId === networking.getPlayerId()) {
                this.showToast(`You are now the host! ${data.disconnectedPlayer} disconnected.`, 5000);
            } else {
                this.showToast(`${data.newHostName} is now the host. ${data.disconnectedPlayer} disconnected.`, 5000);
            }
            // Update lobby UI if on lobby page
            if (this.currentPage === 'lobby-page') {
                this.updateLobby({
                    players: networking.players,
                    canStart: networking.players.length >= 2
                });
            }
        });

        networking.on('playerDisconnected', (data) => {
            this.showToast(`${data.playerName} disconnected from the game.`, 3000);
        });

        networking.on('playerReconnected', (data) => {
            this.showToast(`${data.playerName} reconnected to the game.`, 3000);
            // Update lobby UI if on lobby page
            if (this.currentPage === 'lobby-page') {
                this.updateLobby({
                    players: data.players,
                    canStart: data.players.length >= 2
                });
            }
        });

        // Handle room creation result
        networking.on('roomCreated', (data) => {
            if (data.success) {
                router.navigate(`/lobby/${data.roomCode}`);
            }
        });

        // Handle join room result
        networking.on('joinRoomResult', (data) => {
            if (data.success) {
                router.navigate(`/lobby/${data.roomCode}`);
            } else {
                this.showToast(data.error);
            }
        });

        // Handle game action results
        networking.on('drawFromDeckResult', (data) => {
            console.log('drawFromDeckResult:', data);
            if (data.success) {
                this.hasDrawn = true;
                this.showToast('Card drawn! Select a card to discard.');
                this.updateActionButtons(this.gameState);
            }
        });

        networking.on('drawFromDiscardResult', (data) => {
            console.log('drawFromDiscardResult:', data);
            if (data.success) {
                this.hasDrawn = true;
                this.showToast('Card drawn from discard! Select a card to discard.');
                this.updateActionButtons(this.gameState);
            }
        });

        networking.on('discardCardResult', (data) => {
            console.log('discardCardResult:', data);
            if (data.success) {
                this.hasDrawn = false;
                this.selectedCardIndex = -1;
                this.updateActionButtons(this.gameState);
            }
        });

        // Enter key handlers
        const playerNameInput = document.getElementById('player-name');
        const roomCodeInput = document.getElementById('room-code');

        if (playerNameInput) {
            playerNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleCreateRoom();
                }
            });
        }

        if (roomCodeInput) {
            roomCodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleJoinRoom();
                }
            });
        }
    }

    // Page management
    showPage(pageId) {
        console.log('showPage called with:', pageId);
        const pages = document.querySelectorAll('.page');
        console.log('Found pages:', pages.length);
        
        pages.forEach(page => {
            console.log('Removing active from:', page.id);
            page.classList.remove('active');
        });
        
        const targetPage = document.getElementById(pageId);
        console.log('Target page:', targetPage);
        
        if (targetPage) {
            targetPage.classList.add('active');
            this.currentPage = pageId;
            console.log('Successfully switched to page:', pageId);
            console.log('Target page classes after switch:', targetPage.className);
            console.log('Target page display style:', window.getComputedStyle(targetPage).display);
        } else {
            console.error('Target page not found:', pageId);
        }
    }

    // Landing page handlers
    handleCreateRoom() {
        console.log('handleCreateRoom called');
        const playerNameInput = document.getElementById('player-name');
        if (!playerNameInput) {
            console.error('Player name input not found');
            return;
        }
        
        const playerName = playerNameInput.value.trim();
        console.log('Player name:', playerName);
        
        if (!playerName) {
            this.showToast('Please enter your name');
            return;
        }

        if (!networking.isConnected()) {
            this.showToast('Not connected to server. Please refresh and try again.');
            return;
        }

        console.log('Calling networking.createRoom');
        const result = networking.createRoom(playerName);
        console.log('Create room result:', result);
        
        if (!result.success) {
            this.showToast(result.error);
        }
        // Success case is now handled by the 'roomCreated' event listener
    }

    handleJoinRoom() {
        const playerName = document.getElementById('player-name').value.trim();
        const roomCode = document.getElementById('room-code').value.trim().toUpperCase();
        
        if (!playerName) {
            this.showToast('Please enter your name');
            return;
        }
        
        if (!roomCode) {
            this.showToast('Please enter room code');
            return;
        }

        if (!networking.isConnected()) {
            this.showToast('Not connected to server. Please refresh and try again.');
            return;
        }

        const result = networking.joinRoom(roomCode, playerName);
        if (!result.success) {
            this.showToast(result.error);
        }
        // Success case is now handled by the 'joinRoomResult' event listener
    }

    // Lobby page handlers
    updateLobbyInfo(roomCode) {
        console.log('updateLobbyInfo called with roomCode:', roomCode);
        const roomCodeDisplay = document.getElementById('room-code-display');
        console.log('room-code-display element:', roomCodeDisplay);
        if (roomCodeDisplay) {
            roomCodeDisplay.textContent = roomCode;
            console.log('Room code set successfully');
        } else {
            console.error('room-code-display element not found');
        }
    }

    // Called by router when navigating to lobby
    initializeLobbyPage(roomCode) {
        this.updateLobbyInfo(roomCode);
        const roomInfo = networking.getRoomInfo();
        if (roomInfo && roomInfo.code === roomCode) {
            this.updateLobby({
                players: networking.players,
                canStart: networking.players.length >= 2
            });
        }
    }

    // Called by router when navigating to game
    initializeGamePage() {
        const gameState = networking.getGameState();
        if (gameState) {
            this.updateGameUI(gameState);
        }
    }

    updateLobby(data) {
        const playersList = document.getElementById('players-ul');
        const playerCount = document.getElementById('player-count');
        const startBtn = document.getElementById('start-game-btn');

        playersList.innerHTML = '';
        data.players.forEach(player => {
            const li = document.createElement('li');
            li.textContent = player.name + (player.isHost ? ' (Host)' : '');
            playersList.appendChild(li);
        });

        playerCount.textContent = data.players.length;
        
        const roomInfo = networking.getRoomInfo();
        if (roomInfo && roomInfo.isHost) {
            startBtn.disabled = !data.canStart;
            startBtn.textContent = data.canStart ? 'Start Game' : 'Start Game (Need 2+ players)';
        } else {
            startBtn.disabled = true;
            startBtn.textContent = 'Waiting for host to start...';
        }
    }

    handleStartGame() {
        const result = networking.startGame();
        if (!result.success) {
            this.showToast(result.error);
        }
    }

    handleLeaveRoom() {
        networking.leaveRoom();
        router.navigate('/');
    }

    copyRoomCode() {
        const roomCode = document.getElementById('room-code-display').textContent;
        navigator.clipboard.writeText(roomCode).then(() => {
            this.showToast('Room code copied to clipboard!');
        }).catch(() => {
            this.showToast('Failed to copy room code');
        });
    }

    // Game page handlers
    updateGameUI(gameState) {
        console.log('updateGameUI called with gameState:', gameState);
        this.gameState = gameState;
        this.selectedCardIndex = -1;
        this.hasDrawn = gameState.currentPlayerHasDrawn || false;
        
        this.updatePlayerAreas(gameState);
        this.updateCenterArea(gameState);
        this.updateGameStatus(gameState);
        this.updateActionButtons(gameState);
    }

    updatePlayerAreas(gameState) {
        const currentPlayerData = gameState.players.find(p => p.id === networking.getPlayerId());
        const otherPlayers = gameState.players.filter(p => p.id !== networking.getPlayerId());
        
        // Update current player area
        this.updateCurrentPlayer(currentPlayerData, gameState);
        
        // Update other players area
        this.updateOtherPlayers(otherPlayers, gameState);
    }

    updateCurrentPlayer(playerData, gameState) {
        const playerSection = document.getElementById('current-player');
        const playerName = playerSection.querySelector('.player-name');
        const lives = playerSection.querySelector('.lives');
        const cards = playerSection.querySelector('.player-cards');
        
        console.log('updateCurrentPlayer called with:', playerData);
        console.log('Player hand:', playerData.hand);
        
        playerName.textContent = playerData.name;
        
        // Update lives display
        this.updateLivesDisplay(lives, playerData);
        
        // Update cards
        cards.innerHTML = '';
        if (playerData.hand && playerData.hand.length > 0) {
            playerData.hand.forEach((cardData, index) => {
                console.log('Creating card:', cardData);
                const card = new Card(cardData.suit, cardData.rank);
                const cardEl = createCardElement(card);
                cardEl.addEventListener('click', () => this.selectCard(index));
                cardEl.dataset.cardIndex = index;
                cards.appendChild(cardEl);
            });
        } else {
            console.log('No cards in hand or hand is undefined');
        }
        
        // Highlight if it's current player's turn
        const isCurrentTurn = gameState.currentPlayerIndex === gameState.players.findIndex(p => p.id === networking.getPlayerId());
        playerSection.classList.toggle('current', isCurrentTurn);
        playerSection.classList.toggle('turn-highlight', isCurrentTurn);
    }

    updateOtherPlayers(otherPlayers, gameState) {
        // Remove existing other players
        const existingOtherPlayers = document.querySelectorAll('.other-player');
        existingOtherPlayers.forEach(player => player.remove());
        
        const playersArea = document.querySelector('.players-area');
        
        otherPlayers.forEach((playerData, index) => {
            const playerElement = document.createElement('div');
            playerElement.className = 'other-player';
            
            // Player name
            const playerName = document.createElement('div');
            playerName.className = 'player-name';
            playerName.textContent = playerData.name;
            
            // Player cards (small face-down cards)
            const cards = document.createElement('div');
            cards.className = 'player-cards';
            
            for (let i = 0; i < 3; i++) {
                const cardEl = createCardElement(null, true); // face-down
                cards.appendChild(cardEl);
            }
            
            // Lives display
            const lives = document.createElement('div');
            lives.className = 'lives';
            this.updateLivesDisplay(lives, playerData);
            
            // Highlight if it's this player's turn
            const playerIndex = gameState.players.findIndex(p => p.id === playerData.id);
            const isCurrentTurn = gameState.currentPlayerIndex === playerIndex;
            playerElement.classList.toggle('turn-highlight', isCurrentTurn);
            
            playerElement.appendChild(playerName);
            playerElement.appendChild(cards);
            playerElement.appendChild(lives);
            
            playersArea.appendChild(playerElement);
        });
    }

    updateLivesDisplay(livesContainer, playerData) {
        livesContainer.innerHTML = '';
        
        // Show remaining lives
        for (let i = 0; i < playerData.lives; i++) {
            const life = document.createElement('span');
            life.className = 'life';
            life.textContent = '♥';
            livesContainer.appendChild(life);
        }
        
        // Show lost lives
        for (let i = playerData.lives; i < 3; i++) {
            const life = document.createElement('span');
            life.className = 'life lost';
            life.textContent = '♡';
            livesContainer.appendChild(life);
        }
        
        // Show cloud status
        if (playerData.isOnCloud) {
            const cloud = document.createElement('span');
            cloud.className = 'life cloud';
            cloud.textContent = '☁';
            livesContainer.appendChild(cloud);
        }
    }

    updateCenterArea(gameState) {
        const discardPile = document.getElementById('discard-pile');
        discardPile.innerHTML = '';
        
        if (gameState.topDiscardCard) {
            const card = new Card(gameState.topDiscardCard.suit, gameState.topDiscardCard.rank);
            const cardEl = createCardElement(card);
            discardPile.appendChild(cardEl);
        } else {
            const emptyCard = document.createElement('div');
            emptyCard.className = 'card empty';
            emptyCard.textContent = 'Discard';
            discardPile.appendChild(emptyCard);
        }
    }

    updateGameStatus(gameState) {
        const centerTurnIndicator = document.getElementById('center-turn-indicator');
        const roundDisplay = document.getElementById('round-display');
        
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];
        const turnText = `${currentPlayer.name}'s Turn`;
        
        centerTurnIndicator.textContent = turnText;
        
        if (gameState.finalRound) {
            roundDisplay.textContent = `Final Round! ${gameState.knocker ? gameState.players.find(p => p.id === gameState.knocker).name + ' knocked' : ''}`;
        } else {
            roundDisplay.textContent = `Round ${gameState.roundNumber}`;
        }
    }

    updateActionButtons(gameState) {
        const isMyTurn = gameState.currentPlayerIndex === gameState.players.findIndex(p => p.id === networking.getPlayerId());
        
        document.getElementById('knock-btn').disabled = !isMyTurn || this.hasDrawn || gameState.finalRound;
        document.getElementById('draw-deck-btn').disabled = !isMyTurn || this.hasDrawn;
        document.getElementById('draw-discard-btn').disabled = !isMyTurn || this.hasDrawn || !gameState.topDiscardCard;
        
        // Update button text based on state
        if (this.hasDrawn) {
            document.getElementById('draw-deck-btn').textContent = 'Select card to discard';
            document.getElementById('draw-discard-btn').textContent = 'Select card to discard';
        } else {
            document.getElementById('draw-deck-btn').textContent = 'Draw from Deck';
            document.getElementById('draw-discard-btn').textContent = 'Draw from Discard';
        }
    }

    // Game action handlers
    selectCard(cardIndex) {
        if (!this.hasDrawn) return;
        
        // Remove previous selection
        document.querySelectorAll('.player-cards .card').forEach(card => {
            card.classList.remove('selected');
        });
        
        // Select new card
        const cardEl = document.querySelector(`[data-card-index="${cardIndex}"]`);
        if (cardEl) {
            cardEl.classList.add('selected');
            this.selectedCardIndex = cardIndex;
            
            // Auto-discard after selection
            this.handleDiscardCard(cardIndex);
        }
    }

    handleDrawFromDeck() {
        console.log('handleDrawFromDeck called');
        const result = networking.drawFromDeck();
        console.log('drawFromDeck immediate result:', result);
        // Don't set hasDrawn here - wait for server response
    }

    handleDrawFromDiscard() {
        console.log('handleDrawFromDiscard called');
        const result = networking.drawFromDiscard();
        console.log('drawFromDiscard immediate result:', result);
        // Don't set hasDrawn here - wait for server response
    }

    handleDiscardCard(cardIndex) {
        console.log('handleDiscardCard called with cardIndex:', cardIndex);
        const result = networking.discardCard(cardIndex);
        console.log('discardCard immediate result:', result);
        // Don't reset state here - wait for server response
    }

    handleKnock() {
        const result = networking.knock();
        if (result.success) {
            this.showToast('You knocked! This is the final round.');
        }
    }

    // Round end and game over screens
    showRoundEndSummary(data) {
        const { roundNumber, losers, scores, remainingPlayers } = data;
        
        let message = `<h3>Round ${roundNumber} Complete!</h3>`;
        message += `<div class="scores">`;
        
        scores.forEach(player => {
            const status = losers.includes(player.name) ? ' ❌ (Lost life)' : ' ✅';
            message += `<div class="score-line">${player.name}: ${player.score}${status}</div>`;
        });
        
        message += `</div><div class="lives-remaining">`;
        remainingPlayers.forEach(player => {
            const livesText = player.isOnCloud ? 'ON CLOUD ☁️' : `${player.lives} ❤️`;
            message += `<div>${player.name}: ${livesText}</div>`;
        });
        message += `</div><p>Starting new round...</p>`;
        
        this.showModal(message, 4000);
    }

    showGameOverScreen(data) {
        const { winner, finalRound } = data;
        
        let message = `<h2>🎉 Game Over! 🎉</h2>`;
        if (winner) {
            message += `<h3>Winner: ${winner.name}!</h3>`;
        } else {
            message += `<h3>Game Complete</h3>`;
        }
        message += `<p>Final Round: ${finalRound}</p>`;
        message += `<button onclick="router.navigate('/')" class="restart-btn">Play Again</button>`;
        
        this.showModal(message, 0); // Don't auto-close
    }

    showModal(content, duration = 3000) {
        // Remove existing modal
        const existingModal = document.querySelector('.game-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        const modal = document.createElement('div');
        modal.className = 'game-modal';
        modal.innerHTML = `
            <div class="modal-content">
                ${content}
            </div>
        `;
        document.body.appendChild(modal);
        
        // Show modal
        setTimeout(() => modal.classList.add('show'), 100);
        
        // Auto-hide if duration specified
        if (duration > 0) {
            setTimeout(() => {
                modal.classList.remove('show');
                setTimeout(() => modal.remove(), 300);
            }, duration);
        }
    }

    // Utility methods
    showToast(message, duration = 3000) {
        // Remove existing toast
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }
        
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        
        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Hide toast
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
}

// Initialize UI manager
const ui = new UIManager();