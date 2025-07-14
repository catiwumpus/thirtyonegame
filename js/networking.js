// WebSocket networking for real multiplayer
class NetworkingManager {
    constructor() {
        this.socket = null;
        this.eventListeners = new Map();
        this.playerId = null;
        this.connected = false;
        this.roomCode = null;
        this.isHost = false;
        this.players = [];
        this.gameState = null;
        
        this.connect();
    }

    connect() {
        // Connect to Socket.IO server
        this.socket = io();
        
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.connected = true;
            this.playerId = this.socket.id;
        });
        
        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.connected = false;
        });
        
        // Room events
        this.socket.on('roomCreated', (data) => {
            console.log('Room created:', data);
            this.roomCode = data.roomCode;
            this.playerId = data.playerId;
            this.isHost = data.isHost;
            this.players = data.players;
            this.emit('roomCreated', data);
        });
        
        this.socket.on('joinRoomResult', (data) => {
            console.log('Join room result:', data);
            if (data.success) {
                this.roomCode = data.roomCode;
                this.playerId = data.playerId;
                this.isHost = data.isHost;
                this.players = data.players;
            }
            this.emit('joinRoomResult', data);
        });
        
        this.socket.on('playerJoined', (data) => {
            console.log('Player joined:', data);
            this.players = data.players;
            this.emit('playerJoined', data);
        });
        
        this.socket.on('playerLeft', (data) => {
            console.log('Player left:', data);
            this.players = data.players;
            if (data.newHost) {
                this.isHost = data.newHost === this.playerId;
            }
            this.emit('playerLeft', data);
        });
        
        // Game events
        this.socket.on('gameStarted', (data) => {
            console.log('Game started:', data);
            this.gameState = data.gameState;
            this.emit('gameStarted', data);
        });
        
        this.socket.on('gameStateUpdate', (data) => {
            console.log('Game state update:', data);
            this.gameState = data.gameState;
            this.emit('gameStateUpdate', data);
        });
        
        // Action results
        this.socket.on('startGameResult', (data) => {
            this.emit('startGameResult', data);
        });
        
        this.socket.on('drawFromDeckResult', (data) => {
            this.emit('drawFromDeckResult', data);
        });
        
        this.socket.on('drawFromDiscardResult', (data) => {
            this.emit('drawFromDiscardResult', data);
        });
        
        this.socket.on('discardCardResult', (data) => {
            this.emit('discardCardResult', data);
        });
        
        this.socket.on('knockResult', (data) => {
            this.emit('knockResult', data);
        });
        
        // Round end and game over events
        this.socket.on('roundEnded', (data) => {
            console.log('roundEnded event received:', data);
            this.emit('roundEnded', data);
        });
        
        this.socket.on('gameOver', (data) => {
            console.log('gameOver event received:', data);
            this.emit('gameOver', data);
        });
    }

    // Event system
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                setTimeout(() => callback(data), 0);
            });
        }
    }

    // Room management
    createRoom(playerName) {
        if (!this.connected) {
            return { success: false, error: 'Not connected to server' };
        }
        
        this.socket.emit('createRoom', { playerName });
        
        // Return immediately - actual result will come through roomCreated event
        return { success: true, roomCode: 'pending' };
    }

    joinRoom(roomCode, playerName) {
        if (!this.connected) {
            return { success: false, error: 'Not connected to server' };
        }
        
        this.socket.emit('joinRoom', { roomCode, playerName });
        
        // Return immediately - actual result will come through joinRoomResult event
        return { success: true, roomCode: 'pending' };
    }

    leaveRoom() {
        if (!this.connected || !this.roomCode) {
            return { success: false, error: 'Not in a room' };
        }
        
        this.socket.emit('leaveRoom');
        
        // Reset local state
        this.roomCode = null;
        this.isHost = false;
        this.players = [];
        this.gameState = null;
        
        return { success: true };
    }

    // Game actions
    startGame() {
        if (!this.connected || !this.roomCode) {
            return { success: false, error: 'Not in a room' };
        }
        
        if (!this.isHost) {
            return { success: false, error: 'Only host can start game' };
        }
        
        this.socket.emit('startGame');
        return { success: true };
    }

    drawFromDeck() {
        if (!this.connected || !this.roomCode) {
            return { success: false, error: 'Not in a game' };
        }
        
        this.socket.emit('drawFromDeck');
        return { success: true };
    }

    drawFromDiscard() {
        if (!this.connected || !this.roomCode) {
            return { success: false, error: 'Not in a game' };
        }
        
        this.socket.emit('drawFromDiscard');
        return { success: true };
    }

    discardCard(cardIndex) {
        if (!this.connected || !this.roomCode) {
            return { success: false, error: 'Not in a game' };
        }
        
        this.socket.emit('discardCard', { cardIndex });
        return { success: true };
    }

    knock() {
        if (!this.connected || !this.roomCode) {
            return { success: false, error: 'Not in a game' };
        }
        
        this.socket.emit('knock');
        return { success: true };
    }

    // Get current game state
    getGameState() {
        return this.gameState;
    }

    // Get room info
    getRoomInfo() {
        if (!this.roomCode) return null;
        
        return {
            code: this.roomCode,
            players: this.players,
            host: this.isHost ? this.playerId : this.players.find(p => p.isHost)?.id,
            gameState: this.gameState?.gameState || 'waiting',
            isHost: this.isHost
        };
    }

    // Utility methods
    getPlayerId() {
        return this.playerId;
    }

    isConnected() {
        return this.socket && this.socket.connected;
    }
}

// Create global networking instance
const networking = new NetworkingManager();