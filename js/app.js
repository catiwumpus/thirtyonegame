// Main application initialization
class App {
    constructor() {
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.start();
            });
        } else {
            this.start();
        }
    }

    start() {
        console.log('31 Card Game initialized');
        
        // Add any additional initialization logic here
        this.setupKeyboardShortcuts();
        this.checkBrowserCompatibility();
        
        // Focus on player name input
        const playerNameInput = document.getElementById('player-name');
        if (playerNameInput) {
            playerNameInput.focus();
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Escape key - context-sensitive back action
            if (e.key === 'Escape') {
                this.handleEscapeKey();
            }
            
            // Number keys for card selection during game
            if (e.key >= '1' && e.key <= '3' && ui.currentPage === 'game-page') {
                const cardIndex = parseInt(e.key) - 1;
                if (ui.hasDrawn) {
                    ui.selectCard(cardIndex);
                }
            }
            
            // Space bar for draw action
            if (e.key === ' ' && ui.currentPage === 'game-page') {
                e.preventDefault();
                if (!ui.hasDrawn) {
                    ui.handleDrawFromDeck();
                }
            }
            
            // K for knock
            if (e.key.toLowerCase() === 'k' && ui.currentPage === 'game-page') {
                ui.handleKnock();
            }
        });
    }

    handleEscapeKey() {
        switch (ui.currentPage) {
            case 'lobby-page':
                ui.handleLeaveRoom();
                break;
            case 'game-page':
                if (confirm('Are you sure you want to leave the game?')) {
                    ui.handleLeaveRoom();
                }
                break;
        }
    }

    checkBrowserCompatibility() {
        // Check for required features
        const requiredFeatures = [
            'localStorage',
            'fetch',
            'Promise'
        ];
        
        const missingFeatures = requiredFeatures.filter(feature => {
            switch (feature) {
                case 'localStorage':
                    return typeof Storage === 'undefined';
                case 'fetch':
                    return typeof fetch === 'undefined';
                case 'Promise':
                    return typeof Promise === 'undefined';
                default:
                    return false;
            }
        });
        
        if (missingFeatures.length > 0) {
            const message = `Your browser is missing required features: ${missingFeatures.join(', ')}. Please update your browser for the best experience.`;
            console.warn(message);
            ui.showToast(message, 5000);
        }
    }

    // Static method to get version info
    static getVersion() {
        return '1.0.0';
    }
}

// Initialize the application
const app = new App();

// Add some helpful global functions for debugging
window.gameDebug = {
    getGameState: () => networking.getGameState(),
    getRoomInfo: () => networking.getRoomInfo(),
    getPlayerId: () => networking.getPlayerId(),
    version: App.getVersion()
};

// Add service worker registration for future PWA features
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Future: Register service worker for offline play
        // navigator.serviceWorker.register('/sw.js');
    });
}