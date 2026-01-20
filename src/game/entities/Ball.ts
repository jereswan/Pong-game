// =============================================================================
// Ball Entity - Direct port from Python
// =============================================================================

import { BALL_R, HEIGHT } from '../../config';
import { Vector2, Rect } from '../../utils';

export class Ball {
    public pos: Vector2;
    public vel: Vector2;
    public r: number = BALL_R;
    public speedCap: number;
    public alive: boolean = true;

    constructor(x: number, y: number, vx: number, vy: number, speedCap: number = 1200.0) {
        this.pos = new Vector2(x, y);
        this.vel = new Vector2(vx, vy);
        this.speedCap = speedCap;
    }

    /**
     * Get the bounding rect for collision detection.
     */
    rect(): Rect {
        return {
            x: this.pos.x - this.r,
            y: this.pos.y - this.r,
            width: this.r * 2,
            height: this.r * 2,
        };
    }

    /**
     * Update ball position with wind and wall bouncing.
     */
    update(dt: number, windAx: number, windAy: number): void {
        // Apply "wind" as acceleration
        this.vel.x += windAx * dt;
        this.vel.y += windAy * dt;

        // Cap speed
        const sp = this.vel.length();
        if (sp > this.speedCap) {
            this.vel.scaleToLength(this.speedCap);
        }

        // Move
        this.pos.x += this.vel.x * dt;
        this.pos.y += this.vel.y * dt;

        // Bounce off top/bottom
        if (this.pos.y - this.r <= 0) {
            this.pos.y = this.r;
            this.vel.y *= -1;
        } else if (this.pos.y + this.r >= HEIGHT) {
            this.pos.y = HEIGHT - this.r;
            this.vel.y *= -1;
        }
    }
}
