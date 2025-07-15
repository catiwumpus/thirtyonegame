class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.initialLoad = true;
        
        this.setupRoutes();
        this.handleInitialLoad();
        this.setupEventListeners();
    }

    setupRoutes() {
        this.addRoute('/', 'landing-page');
        this.addRoute('/lobby/:roomCode', 'lobby-page');
        this.addRoute('/game/:roomCode', 'game-page');
    }

    addRoute(pattern, pageId) {
        this.routes.set(pattern, {
            pattern: this.createRegexFromPattern(pattern),
            pageId: pageId,
            params: this.extractParamNames(pattern)
        });
    }

    createRegexFromPattern(pattern) {
        const regexPattern = pattern
            .replace(/:[^/]+/g, '([^/]+)')
            .replace(/\//g, '\\/');
        return new RegExp(`^${regexPattern}$`);
    }

    extractParamNames(pattern) {
        const matches = pattern.match(/:([^/]+)/g);
        return matches ? matches.map(match => match.slice(1)) : [];
    }

    setupEventListeners() {
        window.addEventListener('popstate', (event) => {
            console.log('Popstate event:', event.state);
            this.handleRoute(location.pathname, false);
        });
    }

    handleInitialLoad() {
        const currentPath = location.pathname;
        console.log('Initial route:', currentPath);
        this.handleRoute(currentPath, false);
    }

    navigate(path, pushState = true) {
        console.log('Navigating to:', path);
        
        if (pushState && location.pathname !== path) {
            history.pushState({ path }, '', path);
        }
        
        this.handleRoute(path, pushState);
    }

    handleRoute(path, pushState = true) {
        console.log('Handling route:', path);
        
        let matchedRoute = null;
        let params = {};
        
        for (const [pattern, route] of this.routes) {
            const match = path.match(route.pattern);
            if (match) {
                matchedRoute = route;
                
                // Extract parameters
                route.params.forEach((paramName, index) => {
                    params[paramName] = match[index + 1];
                });
                break;
            }
        }
        
        if (!matchedRoute) {
            console.warn('No route found for:', path);
            this.navigate('/', true);
            return;
        }
        
        this.currentRoute = {
            path: path,
            pageId: matchedRoute.pageId,
            params: params
        };
        
        console.log('Route matched:', this.currentRoute);
        
        // Show the appropriate page
        ui.showPage(matchedRoute.pageId);
        
        // Handle route-specific logic
        this.handleRouteSpecificLogic();
    }

    handleRouteSpecificLogic() {
        const route = this.currentRoute;
        
        switch (route.pageId) {
            case 'landing-page':
                this.handleLandingRoute();
                break;
            case 'lobby-page':
                this.handleLobbyRoute(route.params.roomCode);
                break;
            case 'game-page':
                this.handleGameRoute(route.params.roomCode);
                break;
        }
    }

    handleLandingRoute() {
        console.log('Handling landing route');
        // Clear any existing room state if navigating back to landing
        if (networking.getRoomInfo()) {
            networking.leaveRoom();
        }
        
        // Clean up any existing modals
        const existingModal = document.querySelector('.game-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Clear form inputs
        const playerNameInput = document.getElementById('player-name');
        const roomCodeInput = document.getElementById('room-code');
        if (playerNameInput) playerNameInput.value = '';
        if (roomCodeInput) roomCodeInput.value = '';
    }

    handleLobbyRoute(roomCode) {
        console.log('Handling lobby route for room:', roomCode);
        
        const currentRoom = networking.getRoomInfo();
        
        // If we're not in the correct room, try to join it
        if (!currentRoom || currentRoom.code !== roomCode) {
            // Check if we have session data for this room
            const sessionData = networking.getSessionData();
            if (sessionData && sessionData.roomCode === roomCode && sessionData.playerName) {
                console.log('Attempting to rejoin room from session data');
                networking.joinRoom(roomCode, sessionData.playerName);
            } else {
                console.log('No valid session for this room, redirecting to landing');
                this.navigate('/', true);
                return;
            }
        }
        
        // Initialize lobby UI
        ui.initializeLobbyPage(roomCode);
    }

    handleGameRoute(roomCode) {
        console.log('Handling game route for room:', roomCode);
        
        const currentRoom = networking.getRoomInfo();
        
        // If we're not in the correct room, try to rejoin it
        if (!currentRoom || currentRoom.code !== roomCode) {
            // Check if we have session data for this room
            const sessionData = networking.getSessionData();
            if (sessionData && sessionData.roomCode === roomCode && sessionData.playerName) {
                console.log('Attempting to rejoin room from session data');
                networking.joinRoom(roomCode, sessionData.playerName);
            } else {
                console.log('No valid session for this room, redirecting to landing');
                this.navigate('/', true);
                return;
            }
        }
        
        // If we have room info but game is waiting, redirect to lobby
        if (currentRoom && currentRoom.gameState === 'waiting') {
            console.log('Game not started, redirecting to lobby');
            this.navigate(`/lobby/${roomCode}`, true);
            return;
        }
        
        // Initialize game UI
        ui.initializeGamePage();
    }

    getCurrentRoute() {
        return this.currentRoute;
    }


    // Update URL without triggering navigation
    updateURL(path) {
        if (location.pathname !== path) {
            history.replaceState({ path }, '', path);
        }
    }
}

// Create global router instance
const router = new Router();