// =============================================================================
// Input System - Keyboard State Tracking
// =============================================================================

export class Input {
    private keys: Set<string> = new Set();
    private keysJustPressed: Set<string> = new Set();
    private keysJustReleased: Set<string> = new Set();

    constructor() {
        window.addEventListener('keydown', this.onKeyDown.bind(this));
        window.addEventListener('keyup', this.onKeyUp.bind(this));
    }

    private onKeyDown(e: KeyboardEvent): void {
        // Prevent default for game keys
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'Tab'].includes(e.code)) {
            e.preventDefault();
        }

        if (!this.keys.has(e.code)) {
            this.keysJustPressed.add(e.code);
        }
        this.keys.add(e.code);
    }

    private onKeyUp(e: KeyboardEvent): void {
        this.keys.delete(e.code);
        this.keysJustReleased.add(e.code);
    }

    /**
     * Call at end of each frame to clear just-pressed/released states.
     */
    update(): void {
        this.keysJustPressed.clear();
        this.keysJustReleased.clear();
    }

    /**
     * Check if a key is currently held down.
     */
    isDown(code: string): boolean {
        return this.keys.has(code);
    }

    /**
     * Check if a key was just pressed this frame.
     */
    isJustPressed(code: string): boolean {
        return this.keysJustPressed.has(code);
    }

    /**
     * Check if a key was just released this frame.
     */
    isJustReleased(code: string): boolean {
        return this.keysJustReleased.has(code);
    }

    /**
     * Check if up key is pressed (W or ArrowUp).
     */
    isUpPressed(): boolean {
        return this.isDown('KeyW') || this.isDown('ArrowUp');
    }

    /**
     * Check if down key is pressed (S or ArrowDown).
     */
    isDownPressed(): boolean {
        return this.isDown('KeyS') || this.isDown('ArrowDown');
    }

    /**
     * Check if left key is pressed (A or ArrowLeft).
     */
    isLeftPressed(): boolean {
        return this.isDown('KeyA') || this.isDown('ArrowLeft');
    }

    /**
     * Check if right key is pressed (D or ArrowRight).
     */
    isRightPressed(): boolean {
        return this.isDown('KeyD') || this.isDown('ArrowRight');
    }

    destroy(): void {
        window.removeEventListener('keydown', this.onKeyDown.bind(this));
        window.removeEventListener('keyup', this.onKeyUp.bind(this));
    }
}

// Global input instance
export const input = new Input();
