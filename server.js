const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

// Import game logic
const { Game } = require('./js/game.js');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Serve static files
app.use(express.static('.'));

// Game state
const rooms = new Map();
const playerToRoom = new Map();

// Helper functions
function generateRoomCode() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
}

function broadcastToRoom(roomCode, event, data, excludeSocket = null) {
    const room = rooms.get(roomCode);
    if (!room) return;
    
    room.players.forEach(player => {
        if (player.socket && player.socket !== excludeSocket) {
            player.socket.emit(event, data);
        }
    });
}

function getPlayerGameState(roomCode, playerId) {
    const room = rooms.get(roomCode);
    if (!room) return null;
    
    const gameState = room.game.getGameState();
    
    // Hide other players' cards
    gameState.players = gameState.players.map(player => {
        if (player.id !== playerId) {
            player.hand = []; // Hide cards from other players
        }
        return player;
    });
    
    return gameState;
}

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    
    // Handle room creation
    socket.on('createRoom', (data) => {
        const { playerName } = data;
        const roomCode = generateRoomCode();
        
        // Create new room
        const room = {
            code: roomCode,
            host: socket.id,
            players: new Map(),
            game: new Game(),
            maxPlayers: 6
        };
        
        // Add player to room
        const player = {
            id: socket.id,
            name: playerName,
            socket: socket,
            isHost: true
        };
        
        room.players.set(socket.id, player);
        room.game.addPlayer(socket.id, playerName);
        
        // Store room and player mapping
        rooms.set(roomCode, room);
        playerToRoom.set(socket.id, roomCode);
        
        // Join socket room
        socket.join(roomCode);
        
        socket.emit('roomCreated', {
            success: true,
            roomCode: roomCode,
            playerId: socket.id,
            isHost: true,
            players: Array.from(room.players.values()).map(p => ({
                id: p.id,
                name: p.name,
                isHost: p.isHost
            }))
        });
        
        console.log(`Room ${roomCode} created by ${playerName}`);
    });
    
    // Handle room joining
    socket.on('joinRoom', (data) => {
        const { roomCode, playerName } = data;
        const room = rooms.get(roomCode);
        
        if (!room) {
            socket.emit('joinRoomResult', { success: false, error: 'Room not found' });
            return;
        }
        
        if (room.players.size >= room.maxPlayers) {
            socket.emit('joinRoomResult', { success: false, error: 'Room is full' });
            return;
        }
        
        if (room.game.gameState !== 'waiting') {
            socket.emit('joinRoomResult', { success: false, error: 'Game already started' });
            return;
        }
        
        // Add player to room
        const player = {
            id: socket.id,
            name: playerName,
            socket: socket,
            isHost: false
        };
        
        room.players.set(socket.id, player);
        room.game.addPlayer(socket.id, playerName);
        playerToRoom.set(socket.id, roomCode);
        
        // Join socket room
        socket.join(roomCode);
        
        const players = Array.from(room.players.values()).map(p => ({
            id: p.id,
            name: p.name,
            isHost: p.isHost
        }));
        
        socket.emit('joinRoomResult', {
            success: true,
            roomCode: roomCode,
            playerId: socket.id,
            isHost: false,
            players: players
        });
        
        // Notify all players in room
        broadcastToRoom(roomCode, 'playerJoined', {
            playerId: socket.id,
            playerName: playerName,
            players: players,
            canStart: room.players.size >= 2
        });
        
        console.log(`${playerName} joined room ${roomCode}`);
    });
    
    // Handle leaving room
    socket.on('leaveRoom', () => {
        const roomCode = playerToRoom.get(socket.id);
        if (!roomCode) return;
        
        const room = rooms.get(roomCode);
        if (!room) return;
        
        const player = room.players.get(socket.id);
        if (!player) return;
        
        // Remove player from game and room
        room.game.removePlayer(socket.id);
        room.players.delete(socket.id);
        playerToRoom.delete(socket.id);
        socket.leave(roomCode);
        
        // If host left, assign new host
        if (room.host === socket.id && room.players.size > 0) {
            const newHost = room.players.keys().next().value;
            room.host = newHost;
            room.players.get(newHost).isHost = true;
        }
        
        // If room is empty, delete it
        if (room.players.size === 0) {
            rooms.delete(roomCode);
            console.log(`Room ${roomCode} deleted (empty)`);
        } else {
            // Notify remaining players
            const players = Array.from(room.players.values()).map(p => ({
                id: p.id,
                name: p.name,
                isHost: p.isHost
            }));
            
            broadcastToRoom(roomCode, 'playerLeft', {
                playerId: socket.id,
                players: players,
                newHost: room.host,
                canStart: room.players.size >= 2
            });
        }
        
        console.log(`${player.name} left room ${roomCode}`);
    });
    
    // Handle starting game
    socket.on('startGame', () => {
        const roomCode = playerToRoom.get(socket.id);
        if (!roomCode) return;
        
        const room = rooms.get(roomCode);
        if (!room || room.host !== socket.id) return;
        
        if (room.players.size < 2) {
            socket.emit('startGameResult', { success: false, error: 'Need at least 2 players' });
            return;
        }
        
        const success = room.game.startGame();
        if (success) {
            // Send personalized game state to each player
            room.players.forEach(player => {
                const personalizedGameState = getPlayerGameState(roomCode, player.id);
                console.log(`Sending game state to ${player.name}:`, JSON.stringify(personalizedGameState, null, 2));
                player.socket.emit('gameStarted', { gameState: personalizedGameState });
            });
            
            console.log(`Game started in room ${roomCode}`);
        }
        
        socket.emit('startGameResult', { success });
    });
    
    // Handle game actions
    socket.on('drawFromDeck', () => {
        const roomCode = playerToRoom.get(socket.id);
        if (!roomCode) return;
        
        const room = rooms.get(roomCode);
        if (!room) return;
        
        const result = room.game.playerDrawFromDeck(socket.id);
        if (result) {
            // Send updated game state to all players
            room.players.forEach(player => {
                const personalizedGameState = getPlayerGameState(roomCode, player.id);
                player.socket.emit('gameStateUpdate', {
                    gameState: personalizedGameState,
                    action: 'drawFromDeck',
                    playerId: socket.id
                });
            });
        }
        
        socket.emit('drawFromDeckResult', { success: !!result, result });
    });
    
    socket.on('drawFromDiscard', () => {
        const roomCode = playerToRoom.get(socket.id);
        if (!roomCode) return;
        
        const room = rooms.get(roomCode);
        if (!room) return;
        
        const result = room.game.playerDrawFromDiscard(socket.id);
        if (result) {
            // Send updated game state to all players
            room.players.forEach(player => {
                const personalizedGameState = getPlayerGameState(roomCode, player.id);
                player.socket.emit('gameStateUpdate', {
                    gameState: personalizedGameState,
                    action: 'drawFromDiscard',
                    playerId: socket.id
                });
            });
        }
        
        socket.emit('drawFromDiscardResult', { success: !!result, result });
    });
    
    socket.on('discardCard', (data) => {
        const { cardIndex } = data;
        console.log(`Player ${socket.id} attempting to discard card at index ${cardIndex}`);
        const roomCode = playerToRoom.get(socket.id);
        if (!roomCode) {
            console.log('Player not in room');
            return;
        }
        
        const room = rooms.get(roomCode);
        if (!room) {
            console.log('Room not found');
            return;
        }
        
        console.log('Calling playerDiscardCard...');
        const result = room.game.playerDiscardCard(socket.id, cardIndex);
        console.log('playerDiscardCard result:', result);
        
        // Check if the game triggered an end round or game over
        if (result && typeof result === 'object' && result.type) {
            console.log('Special game event detected:', result.type);
            if (result.type === 'roundEnd') {
                // Emit round end event to all players
                console.log('Broadcasting roundEnded event:', result.data);
                broadcastToRoom(roomCode, 'roundEnded', result.data);
            } else if (result.type === 'gameOver') {
                // Emit game over event to all players
                console.log('Broadcasting gameOver event:', result.data);
                broadcastToRoom(roomCode, 'gameOver', result.data);
            }
        }
        
        if (result) {
            // Send updated game state to all players
            room.players.forEach(player => {
                const personalizedGameState = getPlayerGameState(roomCode, player.id);
                player.socket.emit('gameStateUpdate', {
                    gameState: personalizedGameState,
                    action: 'discardCard',
                    playerId: socket.id
                });
            });
        }
        
        socket.emit('discardCardResult', { success: !!result, result });
    });
    
    socket.on('knock', () => {
        const roomCode = playerToRoom.get(socket.id);
        if (!roomCode) return;
        
        const room = rooms.get(roomCode);
        if (!room) return;
        
        const result = room.game.playerKnock(socket.id);
        if (result) {
            // Send updated game state to all players
            room.players.forEach(player => {
                const personalizedGameState = getPlayerGameState(roomCode, player.id);
                player.socket.emit('gameStateUpdate', {
                    gameState: personalizedGameState,
                    action: 'knock',
                    playerId: socket.id
                });
            });
        }
        
        socket.emit('knockResult', { success: !!result, result });
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        
        const roomCode = playerToRoom.get(socket.id);
        if (roomCode) {
            // Trigger leave room logic
            socket.emit('leaveRoom');
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Game available at http://localhost:${PORT}`);
});

module.exports = { app, server, io };