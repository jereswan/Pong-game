// =============================================================================
// PowerUp Entity - Direct port from Python
// =============================================================================

import { POWERUP_TYPES, PowerUpType } from '../../config';
import { Vector2 } from '../../utils';
import { Ball } from './Ball';

export class PowerUp {
    public pos: Vector2;
    public r: number = 32; // Increased from 22 for easier hits
    public ptype: string;
    public data: PowerUpType;
    public alive: boolean = true;
    public pulseTime: number = 0.0;

    constructor(x: number, y: number, ptype: string) {
        this.pos = new Vector2(x, y);
        this.ptype = ptype;
        this.data = POWERUP_TYPES[ptype]!;
    }

    /**
     * Update the power-up (pulse animation timer).
     */
    update(dt: number): void {
        this.pulseTime += dt;
    }

    /**
     * Check collision with a ball (circle-circle).
     */
    checkCollision(ball: Ball): boolean {
        const dx = this.pos.x - ball.pos.x;
        const dy = this.pos.y - ball.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return dist < this.r + ball.r;
    }
}

/**
 * Active effect tracking with timer.
 */
export class ActiveEffect {
    public ptype: string;
    public timeLeft: number;
    public affectedSide: 'left' | 'right' | 'both';
    public data: PowerUpType;

    constructor(ptype: string, duration: number, affectedSide: 'left' | 'right' | 'both') {
        this.ptype = ptype;
        this.timeLeft = duration;
        this.affectedSide = affectedSide;
        this.data = POWERUP_TYPES[ptype]!;
    }

    /**
     * Update the effect timer. Returns true if still active.
     */
    update(dt: number): boolean {
        this.timeLeft -= dt;
        return this.timeLeft > 0;
    }
}

/**
 * Floating notification text that fades out.
 */
export class Notification {
    public text: string;
    public color: number;
    public y: number;
    public alpha: number = 1.0;
    public lifetime: number = 2.0;
    public age: number = 0.0;

    constructor(text: string, color: number, yPos: number) {
        this.text = text;
        this.color = color;
        this.y = yPos;
    }

    /**
     * Update the notification. Returns true if still alive.
     */
    update(dt: number): boolean {
        this.age += dt;
        this.y -= 30 * dt; // Float upward
        this.alpha = Math.max(0, 1 - this.age / this.lifetime);
        return this.age < this.lifetime;
    }
}
