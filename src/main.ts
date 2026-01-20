// =============================================================================
// Main Entry Point - PixiJS Application Setup
// =============================================================================

import { Application } from 'pixi.js';
import { WIDTH, HEIGHT, BLACK } from './config';
import { Game } from './game/Game';

async function main(): Promise<void> {
    // Create the PixiJS application
    const app = new Application();

    // Initialize the application
    await app.init({
        width: WIDTH,
        height: HEIGHT,
        backgroundColor: BLACK,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
    });

    // Add canvas to the DOM
    const container = document.getElementById('game-container');
    if (container) {
        container.appendChild(app.canvas);
    } else {
        document.body.appendChild(app.canvas);
    }

    // Create and start the game
    const game = new Game(app);
    game.start();

    // Main game loop via ticker
    app.ticker.add((ticker) => {
        const dt = ticker.deltaTime / 60; // Convert to seconds (assuming 60 FPS base)
        game.update(dt);
    });
}

// Start the game
main().catch(console.error);
