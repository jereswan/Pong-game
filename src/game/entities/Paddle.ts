// =============================================================================
// Paddle Entity - Direct port from Python
// =============================================================================

import { PADDLE_W, HEIGHT } from '../../config';
import { clamp, Rect } from '../../utils';

export class Paddle {
    public x: number;
    public y: number;
    public width: number;
    public height: number;
    public speed: number = 9.0;

    constructor(x: number, y: number, h: number) {
        this.x = x;
        this.y = y;
        this.width = PADDLE_W;
        this.height = h;
    }

    /**
     * Move the paddle vertically by dy, clamping to screen bounds.
     */
    move(dy: number): void {
        this.y += dy;
        this.y = clamp(this.y, 0, HEIGHT - this.height);
    }

    /**
     * Get the rect representation for collision detection.
     */
    get rect(): Rect {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
        };
    }

    /**
     * Get the center Y position.
     */
    centerY(): number {
        return this.y + this.height / 2;
    }

    /**
     * Get the right edge X position.
     */
    get right(): number {
        return this.x + this.width;
    }

    /**
     * Get the left edge X position.
     */
    get left(): number {
        return this.x;
    }
}
