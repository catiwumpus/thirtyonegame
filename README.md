# 31 Card Game - Multiplayer Web Version

A real-time multiplayer implementation of the classic card game "31" (also known as Scat or Blitz).

## Features

- ✅ **Real-time Multiplayer**: Up to 6 players per room using WebSockets
- ✅ **Room System**: Create rooms with shareable codes or join existing rooms
- ✅ **Traditional Gameplay**: Complete 31 rules with proper scoring
- ✅ **Life System**: 3 lives + "on the cloud" mechanic
- ✅ **Modern UI**: Responsive design with card animations
- ✅ **Cross-platform**: Works on desktop and mobile browsers

## How to Play

### Game Rules
1. **Objective**: Get cards in your hand that total as close to 31 as possible in the same suit
2. **Scoring**: 
   - Same suit cards: Add their values (Ace=11, Face cards=10, Numbers=face value)
   - Three of a kind: 30.5 points (beats any total except 31)
3. **Turn**: Draw from deck or discard pile, then discard one card
4. **Knock**: End the round when you think you have a good hand
5. **Lives**: Lowest score each round loses a life, then goes "on cloud", then elimination

### Controls
- **Click**: Select cards to discard
- **Keyboard Shortcuts**:
  - `1-3`: Quick select cards
  - `Space`: Draw from deck
  - `K`: Knock
  - `Escape`: Leave game/room

## Setup & Installation

### Prerequisites
- Node.js (v14 or higher)
- npm

### Installation
1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

4. Open your browser to `http://localhost:3000`

### For Development
Use nodemon for auto-restart during development:
```bash
npm run dev
```

## Multiplayer Testing

1. **Start Server**: Run `npm start`
2. **Player 1**: Go to `http://localhost:3000`, enter name, click "Create Room"
3. **Player 2+**: Open new browser tabs/windows, enter name, use the room code to join
4. **Start Game**: Host clicks "Start Game" when 2+ players are ready

## Technical Details

### Architecture
- **Backend**: Node.js + Express + Socket.IO
- **Frontend**: Vanilla JavaScript + HTML5 + CSS3
- **Real-time**: WebSocket communication via Socket.IO
- **Game Logic**: Shared classes between client and server

### File Structure
```
├── server.js              # WebSocket server
├── package.json           # Dependencies
├── index.html             # Main game interface
├── styles.css             # Game styling
└── js/
    ├── app.js             # Application initialization
    ├── ui.js              # User interface management
    ├── networking.js      # WebSocket client
    ├── game.js            # Core game logic
    └── cards.js           # Card classes and utilities
```

### API Events
- **Room Management**: `createRoom`, `joinRoom`, `leaveRoom`
- **Game Control**: `startGame`, `knock`
- **Game Actions**: `drawFromDeck`, `drawFromDiscard`, `discardCard`
- **Real-time Updates**: `gameStateUpdate`, `playerJoined`, `playerLeft`

## Deployment

For production deployment:

1. **Environment Variables**:
   ```bash
   PORT=3000  # Server port
   ```

2. **Start in Production**:
   ```bash
   NODE_ENV=production npm start
   ```

3. **Reverse Proxy**: Configure nginx/Apache to serve static files and proxy WebSocket connections

## Browser Compatibility

- **Minimum**: Modern browsers with WebSocket support
- **Recommended**: Chrome 60+, Firefox 55+, Safari 12+, Edge 79+
- **Mobile**: iOS Safari 12+, Chrome Mobile 60+

## License

MIT License - Feel free to use and modify for your own projects!

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test multiplayer functionality
5. Submit a pull request

---

**Have fun playing 31!** 🎴