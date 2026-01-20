// =============================================================================
// Game Manager - State Machine
// =============================================================================

import { Application, Container } from 'pixi.js';
import { MenuState, MenuSettings } from './states/MenuState';
import { PlayState } from './states/PlayState';
import { input } from './systems/Input';

type GameStateType = 'menu' | 'play';

export class Game {
    private app: Application;
    private container: Container;
    private currentState: GameStateType = 'menu';

    private menuState: MenuState | null = null;
    private playState: PlayState | null = null;

    constructor(app: Application) {
        this.app = app;
        this.container = new Container();
        this.app.stage.addChild(this.container);
    }

    start(): void {
        this.showMenu();
    }

    private showMenu(): void {
        this.clearStates();
        this.currentState = 'menu';

        this.menuState = new MenuState(this.app);
        this.menuState.setOnStartGame(this.startGame.bind(this));
        this.container.addChild(this.menuState.getContainer());
    }

    private startGame(settings: MenuSettings): void {
        this.clearStates();
        this.currentState = 'play';

        this.playState = new PlayState(this.app, settings);
        this.playState.setOnReturnToMenu(this.showMenu.bind(this));
        this.container.addChild(this.playState.getContainer());
    }

    private clearStates(): void {
        if (this.menuState) {
            this.container.removeChild(this.menuState.getContainer());
            this.menuState = null;
        }
        if (this.playState) {
            this.container.removeChild(this.playState.getContainer());
            this.playState = null;
        }
    }

    update(dt: number): void {
        if (this.currentState === 'menu' && this.menuState) {
            this.menuState.update(dt);
        } else if (this.currentState === 'play' && this.playState) {
            this.playState.update(dt);
        }

        // Clear just-pressed states at end of frame
        input.update();
    }
}
